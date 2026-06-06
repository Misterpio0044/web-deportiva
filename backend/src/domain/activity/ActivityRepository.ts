import { Activity } from './Activity';
import { ActivityStreams } from './ActivityStreams';

export interface WeeklyVolume {
  week: string;
  totalDistance: number;
  activityCount: number;
}

export interface MonthlyDistance {
  month: string;
  totalDistanceKm: number;
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
  monthlyDistance: MonthlyDistance[];
  heartRateZones: HeartRateZone[];
  activityHeatmap: HeatmapDay[];
  recentActivities: Activity[];
  totalDistance: number;
  totalActivities: number;
  averagePaceSecPerKm: number;
}

export interface UpsertManyResult {
  created: number;
  updated: number;
}

export type ActivitySortField = 'date' | 'name' | 'distance' | 'time' | 'speed' | 'hr';
export type SortDirection = 'asc' | 'desc';

export interface SearchActivitiesParams {
  athleteId?: number | null;
  page: number;
  limit: number;
  sortBy: ActivitySortField;
  sortDir: SortDirection;
  search?: string;
  sportType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SearchActivitiesResult {
  items: Activity[];
  total: number;
}

export interface ActivityRepository {
  findByAthleteId(athleteId: number, limit?: number): Promise<Activity[]>;
  findById(id: number): Promise<Activity | null>;
  findAll(limit?: number): Promise<Activity[]>;
  searchActivities(params: SearchActivitiesParams): Promise<SearchActivitiesResult>;
  getActivityStreams(activityId: number): Promise<ActivityStreams | null>;
  saveActivityStreams(activityId: number, streams: ActivityStreams): Promise<void>;
  findActivityIdsMissingStreams(athleteId: number, limit: number): Promise<number[]>;
  getDashboardData(athleteId: number): Promise<DashboardData>;
  getGlobalDashboardData(): Promise<DashboardData>;
  deleteByAthleteId(athleteId: number): Promise<void>;
  upsertMany(activities: Activity[]): Promise<UpsertManyResult>;
}
