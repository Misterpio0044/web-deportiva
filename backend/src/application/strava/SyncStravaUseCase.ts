import { ActivityRepository } from '../../domain/activity/ActivityRepository';
import { Activity } from '../../domain/activity/Activity';
import { AthleteRepository } from '../../domain/athlete/AthleteRepository';
import { GearRepository } from '../../domain/gear/GearRepository';
import { Gear } from '../../domain/gear/Gear';
import { NotFoundError, ValidationError } from '../../domain/shared/DomainError';
import {
  StravaActivitySummary,
  StravaGearSummary,
  StravaApiClient,
  StravaApiError,
} from '../../infrastructure/strava/StravaApiClient';
import { refreshStravaTokenIfNeeded } from './refreshStravaTokenIfNeeded';

export interface SyncStravaInput {
  athleteId: number;
}

// Máximo de actividades cuyos streams GPS se descargan por sincronización, para
// respetar los límites de cuota de Strava (~100 req/15min). El resto se rellena
// en sincronizaciones posteriores o de forma perezosa al exportar.
const STREAMS_PER_SYNC = 50;

export interface SyncStravaOutput {
  activitiesSynced: number;
  created: number;
  updated: number;
  deleted: number;
  gearSynced: number;
  profileUpdated: boolean;
  lastSyncAt: Date;
}

function mapActivity(athleteId: number, raw: StravaActivitySummary): Activity {
  return {
    id: raw.id,
    athleteId,
    gearId: raw.gear_id ?? undefined,
    name: raw.name,
    sportType: raw.sport_type ?? raw.type,
    startDate: new Date(raw.start_date),
    startDateLocal: new Date(raw.start_date_local),
    timezone: raw.timezone,
    utcOffset: raw.utc_offset,
    distance: raw.distance,
    movingTime: raw.moving_time,
    elapsedTime: raw.elapsed_time,
    totalElevationGain: raw.total_elevation_gain,
    averageSpeed: raw.average_speed,
    maxSpeed: raw.max_speed,
    averageCadence: raw.average_cadence,
    hasHeartrate: Boolean(raw.has_heartrate),
    averageHeartrate: raw.average_heartrate,
    maxHeartrate: raw.max_heartrate,
    averageTemp: raw.average_temp,
    sufferScore: raw.suffer_score,
    calories: raw.calories,
    trainer: Boolean(raw.trainer),
    commute: Boolean(raw.commute),
    deviceName: raw.device_name,
    description: raw.description,
    startLatitude: raw.start_latlng?.[0],
    startLongitude: raw.start_latlng?.[1],
    endLatitude: raw.end_latlng?.[0],
    endLongitude: raw.end_latlng?.[1],
    createdAt: new Date(),
  };
}

function mapGear(athleteId: number, raw: StravaGearSummary): Gear {
  return {
    id: raw.id,
    athleteId,
    name: raw.name,
    isPrimary: raw.primary,
    distance: raw.distance,
    createdAt: new Date(),
  };
}

export class SyncStravaUseCase {
  constructor(
    private readonly athleteRepo: AthleteRepository,
    private readonly activityRepo: ActivityRepository,
    private readonly stravaClient: StravaApiClient,
    private readonly gearRepo: GearRepository
  ) {}

  async execute(input: SyncStravaInput): Promise<SyncStravaOutput> {
    const athlete = await this.athleteRepo.findById(input.athleteId);
    if (!athlete) throw new NotFoundError('Atleta');
    if (!athlete.stravaId || !athlete.stravaAccessToken) {
      throw new ValidationError('El atleta no tiene cuenta de Strava vinculada');
    }

    const now = new Date();

    try {
      const accessToken = await refreshStravaTokenIfNeeded(
        athlete,
        this.athleteRepo,
        this.stravaClient
      );

      // 1. Perfil + gear (desde /athlete)
      const stravaAthlete = await this.stravaClient.getAthlete(accessToken);
      await this.athleteRepo.updateStravaProfile(athlete.id, {
        firstname: stravaAthlete.firstname,
        lastname: stravaAthlete.lastname,
        profileMediumUrl: stravaAthlete.profile_medium,
        profileUrl: stravaAthlete.profile,
        weight: stravaAthlete.weight,
        measurementPreference: stravaAthlete.measurement_preference,
      });

      // 2. Upsert de gear ANTES de las actividades para que la FK no se anule
      // Solo zapatillas: la web es exclusivamente para running.
      const rawGear = stravaAthlete.shoes ?? [];
      const mappedGear = rawGear.map((g) => mapGear(athlete.id, g));
      await this.gearRepo.upsertManyForAthlete(athlete.id, mappedGear);

      // 3. Actividades
      const raws = await this.stravaClient.listAllActivities(accessToken);
      const mapped = raws.map((r) => mapActivity(athlete.id, r));
      const { created, updated } = await this.activityRepo.upsertMany(mapped);

      // Eliminar actividades que ya no existen en Strava
      const stravaIds = raws.map((r) => r.id);
      const deleted = await this.activityRepo.deleteOrphanedForAthlete(athlete.id, stravaIds);

      // 4. Backfill de la traza GPS (streams) por tandas, respetando la cuota.
      //    Tolerante a fallos: un error aquí no debe invalidar el sync.
      await this.backfillStreams(athlete.id, accessToken);

      await this.athleteRepo.recordSyncSuccess(athlete.id, {
        at: now,
        created,
        updated,
        deleted,
      });

      return {
        activitiesSynced: created + updated,
        created,
        updated,
        deleted,
        gearSynced: mappedGear.length,
        profileUpdated: true,
        lastSyncAt: now,
      };
    } catch (err) {
      // Si Strava revocó el acceso, desvinculamos automáticamente.
      if (err instanceof StravaApiError && err.code === 'STRAVA_UNAUTHORIZED') {
        await this.athleteRepo.unlinkStravaAccount(athlete.id);
        throw new ValidationError(
          'El acceso a Strava ha sido revocado. Vuelve a conectar tu cuenta.'
        );
      }
      const message = err instanceof Error ? err.message : 'Error desconocido al sincronizar';
      await this.athleteRepo.recordSyncError(athlete.id, { at: now, message });
      throw err;
    }
  }

  /**
   * Descarga y cachea los streams GPS de hasta STREAMS_PER_SYNC actividades del
   * atleta que aún no los tengan (y que tengan GPS). Se ejecuta de forma secuencial
   * y tolerante a errores: si Strava devuelve rate limit (429) u otro fallo, se
   * detiene silenciosamente y se reintentará en el próximo sync.
   */
  private async backfillStreams(athleteId: number, accessToken: string): Promise<void> {
    let ids: number[];
    try {
      ids = await this.activityRepo.findActivityIdsMissingStreams(athleteId, STREAMS_PER_SYNC);
    } catch {
      return;
    }

    for (const id of ids) {
      try {
        const streams = await this.stravaClient.getActivityStreams(accessToken, id);
        if (streams) {
          await this.activityRepo.saveActivityStreams(id, streams);
        }
      } catch (err) {
        // Rate limit u otro error transitorio: paramos esta tanda.
        if (err instanceof StravaApiError && err.code === 'STRAVA_RATE_LIMIT') {
          break;
        }
        // Para otros errores puntuales, continuamos con el resto.
        console.error(`[Strava] No se pudieron obtener streams de la actividad ${id}:`, err);
      }
    }
  }
}
