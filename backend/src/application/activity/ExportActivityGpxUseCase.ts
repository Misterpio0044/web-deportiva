import { ActivityRepository } from '../../domain/activity/ActivityRepository';
import { Activity } from '../../domain/activity/Activity';
import { ActivityStreams } from '../../domain/activity/ActivityStreams';
import { AthleteRepository } from '../../domain/athlete/AthleteRepository';
import { StravaApiClient } from '../../infrastructure/strava/StravaApiClient';
import { refreshStravaTokenIfNeeded } from '../strava/refreshStravaTokenIfNeeded';
import { ForbiddenError, NotFoundError } from '../../domain/shared/DomainError';
import {
  buildGpxFilename,
  buildGpxFromActivity,
} from '../../infrastructure/gpx/buildGpxFromActivity';

export interface ExportActivityGpxRequester {
  sub: number;
  role: 'user' | 'admin';
}

export interface ExportedGpx {
  activity: Activity;
  filename: string;
  xml: string;
}

export class ExportActivityGpxUseCase {
  constructor(
    private readonly activityRepo: ActivityRepository,
    private readonly athleteRepo?: AthleteRepository,
    private readonly stravaClient?: StravaApiClient
  ) {}

  async executeOne(
    activityId: number,
    requester: ExportActivityGpxRequester
  ): Promise<ExportedGpx> {
    const activity = await this.activityRepo.findById(activityId);
    if (!activity) {
      throw new NotFoundError('Actividad');
    }
    if (requester.role === 'user' && activity.athleteId !== requester.sub) {
      throw new ForbiddenError();
    }

    const streams = await this.resolveStreams(activity);
    return {
      activity,
      filename: buildGpxFilename(activity),
      xml: buildGpxFromActivity(activity, streams),
    };
  }

  /**
   * Resuelve la lista solicitada, filtra silenciosamente las que el solicitante
   * no puede ver (mismo criterio que el endpoint individual) y descarta los ids
   * inexistentes. Devuelve los GPX generados con un nombre de fichero único
   * dentro del lote.
   *
   * A diferencia de `executeOne`, aquí solo se usan los streams ya cacheados:
   * no se descargan bajo demanda para no agotar la cuota de Strava en lotes.
   */
  async executeMany(ids: number[], requester: ExportActivityGpxRequester): Promise<ExportedGpx[]> {
    const unique = Array.from(new Set(ids));
    const found = await Promise.all(unique.map((id) => this.activityRepo.findById(id)));
    const allowed = found.filter(
      (a): a is Activity =>
        a !== null && (requester.role === 'admin' || a.athleteId === requester.sub)
    );

    const usedNames = new Set<string>();
    const result: ExportedGpx[] = [];
    for (const activity of allowed) {
      let filename = buildGpxFilename(activity);
      if (usedNames.has(filename)) {
        const base = filename.replace(/\.gpx$/, '');
        filename = `${base}-${activity.id}.gpx`;
      }
      usedNames.add(filename);

      const streams = await this.activityRepo.getActivityStreams(activity.id);
      result.push({
        activity,
        filename,
        xml: buildGpxFromActivity(activity, streams),
      });
    }
    return result;
  }

  /**
   * Obtiene los streams GPS de una actividad. Si están cacheados, los devuelve.
   * Si no, y disponemos de cliente de Strava y de un atleta con tokens válidos,
   * los descarga bajo demanda y los persiste (incluye actividades sincronizadas
   * antes de que se almacenara start_latitude, donde ese campo puede ser null).
   * El resultado se guarda siempre: si Strava indica que no hay GPS se guarda
   * un centinela `hasGps: false` para no repetir la llamada en futuras exportaciones.
   * Cualquier fallo (cuota, red…) se tolera devolviendo null.
   */
  private async resolveStreams(activity: Activity): Promise<ActivityStreams | null> {
    const cached = await this.activityRepo.getActivityStreams(activity.id);
    if (cached) {
      return cached;
    }

    if (!this.athleteRepo || !this.stravaClient) {
      return null;
    }

    try {
      const athlete = await this.athleteRepo.findById(activity.athleteId);
      if (!athlete || !athlete.stravaAccessToken) {
        return null;
      }
      const accessToken = await refreshStravaTokenIfNeeded(
        athlete,
        this.athleteRepo,
        this.stravaClient
      );
      const streams = await this.stravaClient.getActivityStreams(accessToken, activity.id);
      if (streams) {
        await this.activityRepo.saveActivityStreams(activity.id, streams);
      }
      return streams;
    } catch {
      return null;
    }
  }
}
