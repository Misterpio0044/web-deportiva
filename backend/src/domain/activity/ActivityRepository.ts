import { Activity } from './Activity';

export interface WeeklyVolume {
  week: string;
  totalDistance: number;
  activityCount: number;
}

export interface PaceDataPoint {
  date: string;
  paceSecPerKm: number;
}

export interface HeartRateZone {
  zone: string;
  count: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface DashboardData {
  weeklyVolume: WeeklyVolume[];
  paceOverTime: PaceDataPoint[];
  heartRateZones: HeartRateZone[];
  activityHeatmap: HeatmapDay[];
  recentActivities: Activity[];
  totalDistance: number;
  totalActivities: number;
  averagePaceSecPerKm: number;
}

export interface ActivityRepository {
  findByAthleteId(athleteId: number, limit?: number): Promise<Activity[]>;
  findById(id: number): Promise<Activity | null>;
  findAll(limit?: number): Promise<Activity[]>;
  getDashboardData(athleteId: number): Promise<DashboardData>;
  getGlobalDashboardData(): Promise<DashboardData>;
  deleteByAthleteId(athleteId: number): Promise<void>;
}
