export interface Activity {
  id: number;
  athleteId: number;
  gearId?: string;
  name: string;
  sportType: string;
  startDate: Date;
  startDateLocal: Date;
  timezone: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  totalElevationGain?: number;
  averageSpeed?: number;
  maxSpeed?: number;
  averageCadence?: number;
  hasHeartrate: boolean;
  averageHeartrate?: number;
  maxHeartrate?: number;
  averageTemp?: number;
  sufferScore?: number;
  calories?: number;
  trainer: boolean;
  commute: boolean;
  deviceName?: string;
  description?: string;
  createdAt: Date;
}
