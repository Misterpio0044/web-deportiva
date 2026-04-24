import type { DashboardData } from '../../infrastructure/api/dashboardApi';
import { WeeklyVolumeChart } from '../molecules/WeeklyVolumeChart';
import { PaceOverTimeChart } from '../molecules/PaceOverTimeChart';
import { HeartRateZonesChart } from '../molecules/HeartRateZonesChart';
import { ActivityHeatmap } from '../molecules/ActivityHeatmap';
import { RecentActivitiesTable } from '../molecules/RecentActivitiesTable';
import { StatCard } from '../atoms/StatCard';
import { formatTotalDistance, formatPace } from '../../lib/formatters';
import { Activity, Route, Heart } from 'lucide-react';

interface Props {
  data: DashboardData;
}

export function DashboardGrid({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Distancia total"
          value={formatTotalDistance(data.totalDistance)}
          subtitle="Todas las actividades"
          icon={<Route size={18} />}
        />
        <StatCard
          title="Actividades"
          value={String(data.totalActivities)}
          subtitle="Total registradas"
          icon={<Activity size={18} />}
        />
        <StatCard
          title="Ritmo medio"
          value={formatPace(data.averagePaceSecPerKm)}
          subtitle="Promedio global"
          icon={<Heart size={18} />}
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WeeklyVolumeChart data={data.weeklyVolume} />
        <PaceOverTimeChart data={data.paceOverTime} />
        <HeartRateZonesChart data={data.heartRateZones} />
        <ActivityHeatmap data={data.activityHeatmap} />
      </div>

      {/* Recent activities */}
      <RecentActivitiesTable activities={data.recentActivities} />
    </div>
  );
}
