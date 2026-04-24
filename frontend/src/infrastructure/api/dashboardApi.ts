import apiClient from './client';

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

export interface RecentActivity {
  id: number;
  name: string;
  startDateLocal: string;
  distance: number;
  movingTime: number;
  averageSpeed?: number;
  averageHeartrate?: number;
  totalElevationGain?: number;
  sportType: string;
}

export interface DashboardData {
  weeklyVolume: WeeklyVolume[];
  paceOverTime: PaceDataPoint[];
  heartRateZones: HeartRateZone[];
  activityHeatmap: HeatmapDay[];
  recentActivities: RecentActivity[];
  totalDistance: number;
  totalActivities: number;
  averagePaceSecPerKm: number;
}

export const dashboardApi = {
  get: (athleteId?: number) => {
    const params = athleteId ? { athleteId } : {};
    return apiClient.get<DashboardData>('/dashboard', { params }).then((r) => r.data);
  },
};
