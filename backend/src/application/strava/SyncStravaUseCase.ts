import { ActivityRepository } from '../../domain/activity/ActivityRepository';
import { Activity } from '../../domain/activity/Activity';
import { AthleteRepository } from '../../domain/athlete/AthleteRepository';
import { NotFoundError, ValidationError } from '../../domain/shared/DomainError';
import {
  StravaActivitySummary,
  StravaApiClient,
  StravaApiError,
} from '../../infrastructure/strava/StravaApiClient';
import { refreshStravaTokenIfNeeded } from './refreshStravaTokenIfNeeded';

export interface SyncStravaInput {
  athleteId: number;
  perPage?: number;
}

export interface SyncStravaOutput {
  activitiesSynced: number;
  created: number;
  updated: number;
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
    createdAt: new Date(),
  };
}

export class SyncStravaUseCase {
  constructor(
    private readonly athleteRepo: AthleteRepository,
    private readonly activityRepo: ActivityRepository,
    private readonly stravaClient: StravaApiClient
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

      // 1. Perfil
      const stravaAthlete = await this.stravaClient.getAthlete(accessToken);
      await this.athleteRepo.updateStravaProfile(athlete.id, {
        firstname: stravaAthlete.firstname,
        lastname: stravaAthlete.lastname,
        profileMediumUrl: stravaAthlete.profile_medium,
        weight: stravaAthlete.weight,
      });

      // 2. Actividades
      const raws = await this.stravaClient.listActivities(accessToken, {
        perPage: input.perPage ?? 30,
      });
      const mapped = raws.map((r) => mapActivity(athlete.id, r));
      const { created, updated } = await this.activityRepo.upsertMany(mapped);

      await this.athleteRepo.recordSyncSuccess(athlete.id, {
        at: now,
        created,
        updated,
      });

      return {
        activitiesSynced: created + updated,
        created,
        updated,
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
}
