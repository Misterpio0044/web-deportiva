import { Activity } from '../../domain/activity/Activity';
import { ActivityRepository } from '../../domain/activity/ActivityRepository';

export interface CreateActivityInput {
  athleteId: number;
  name: string;
  sportType: string;
  startDateLocal: string; // ISO local datetime e.g. 2024-05-20T08:30:00
  timezone?: string;
  distance: number; // metros
  movingTime: number; // segundos
  elapsedTime: number; // segundos
  totalElevationGain?: number;
  averageHeartrate?: number;
  maxHeartrate?: number;
  averageCadence?: number;
  maxSpeed?: number;
  averageTemp?: number;
  sufferScore?: number;
  calories?: number;
  description?: string;
  trainer?: boolean;
  commute?: boolean;
  deviceName?: string;
  gearId?: string;
}

export class CreateActivityUseCase {
  constructor(private readonly activityRepo: ActivityRepository) {}

  async execute(input: CreateActivityInput): Promise<Activity> {
    // El input puede llegar como "YYYY-MM-DDTHH:mm" (sin zona) o con offset/Z.
    // Si no trae zona, lo tratamos como naive local: el valor que el usuario tecleó
    // es el "wall clock" de su zona y debe almacenarse tal cual en start_date_local.
    // Forzamos UTC para que el resultado no dependa de la TZ del servidor.
    const hasTimezoneSuffix = /Z$|[+-]\d{2}:?\d{2}$/.test(input.startDateLocal);
    const isoForLocal = hasTimezoneSuffix ? input.startDateLocal : input.startDateLocal + 'Z';
    const startLocal = new Date(isoForLocal);
    if (isNaN(startLocal.getTime())) {
      throw new Error('Fecha de inicio inválida');
    }
    // startDate (UTC absoluto) y startDateLocal (wall clock) son iguales aquí
    // porque no tenemos la TZ real del atleta; queda pendiente para una mejora futura.
    const startDate = startLocal;

    // ID negativo para distinguir actividades manuales de las de Strava (positivas).
    const id = -(Date.now() * 1000 + Math.floor(Math.random() * 1000));

    const hasHeartrate =
      typeof input.averageHeartrate === 'number' || typeof input.maxHeartrate === 'number';

    const movingTime = Math.max(1, Math.round(input.movingTime));
    const elapsedTime = Math.max(movingTime, Math.round(input.elapsedTime));
    const averageSpeed = input.distance > 0 && movingTime > 0 ? input.distance / movingTime : 0;

    const activity: Activity = {
      id,
      athleteId: input.athleteId,
      gearId: input.gearId,
      name: input.name.trim() || 'Actividad sin nombre',
      sportType: input.sportType,
      startDate: startDate,
      startDateLocal: startLocal,
      timezone: input.timezone || '(GMT+01:00) Europe/Madrid',
      distance: Math.max(0, input.distance),
      movingTime,
      elapsedTime,
      totalElevationGain: input.totalElevationGain,
      averageSpeed,
      maxSpeed: input.maxSpeed,
      averageCadence: input.averageCadence,
      hasHeartrate,
      averageHeartrate: input.averageHeartrate,
      maxHeartrate: input.maxHeartrate,
      averageTemp: input.averageTemp,
      sufferScore: input.sufferScore,
      calories: input.calories,
      trainer: input.trainer ?? false,
      commute: input.commute ?? false,
      deviceName: input.deviceName,
      description: input.description,
      createdAt: new Date(),
    };

    await this.activityRepo.upsertMany([activity]);
    return activity;
  }
}
