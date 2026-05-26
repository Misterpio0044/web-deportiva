import { ActivityRepository } from '../../domain/activity/ActivityRepository';
import { Activity } from '../../domain/activity/Activity';
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
  constructor(private readonly activityRepo: ActivityRepository) {}

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
    return {
      activity,
      filename: buildGpxFilename(activity),
      xml: buildGpxFromActivity(activity),
    };
  }

  /**
   * Resuelve la lista solicitada, filtra silenciosamente las que el solicitante
   * no puede ver (mismo criterio que el endpoint individual) y descarta los ids
   * inexistentes. Devuelve los GPX generados con un nombre de fichero único
   * dentro del lote.
   */
  async executeMany(ids: number[], requester: ExportActivityGpxRequester): Promise<ExportedGpx[]> {
    const unique = Array.from(new Set(ids));
    const found = await Promise.all(unique.map((id) => this.activityRepo.findById(id)));
    const allowed = found.filter(
      (a): a is Activity =>
        a !== null && (requester.role === 'admin' || a.athleteId === requester.sub)
    );

    const usedNames = new Set<string>();
    return allowed.map((activity) => {
      let filename = buildGpxFilename(activity);
      if (usedNames.has(filename)) {
        const base = filename.replace(/\.gpx$/, '');
        filename = `${base}-${activity.id}.gpx`;
      }
      usedNames.add(filename);
      return {
        activity,
        filename,
        xml: buildGpxFromActivity(activity),
      };
    });
  }
}
