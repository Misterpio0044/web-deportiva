export interface Activity {
  id: string;
  name: string;
  type: string;
  distance: number; // metres
  movingTime: number; // seconds
  elapsedTime: number; // seconds
  totalElevationGain: number; // metres
  startDate: Date;
  averageSpeed: number; // m/s
  maxSpeed: number; // m/s
  averageHeartrate?: number;
  maxHeartrate?: number;
  calories?: number;
}
