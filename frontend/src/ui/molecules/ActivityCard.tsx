import type { Activity } from '../../domain/models/Activity';
import { Badge } from '../atoms/Badge';
import { StatCard } from '../atoms/StatCard';
import './ActivityCard.css';

interface ActivityCardProps {
  activity: Activity;
}

function formatDistance(metres: number): string {
  return (metres / 1000).toFixed(2);
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  return (
    <article className="activity-card">
      <header className="activity-card__header">
        <h3 className="activity-card__name">{activity.name}</h3>
        <Badge label={activity.type} />
      </header>
      <div className="activity-card__stats">
        <StatCard label="Distance" value={formatDistance(activity.distance)} unit="km" />
        <StatCard label="Duration" value={formatDuration(activity.movingTime)} />
        <StatCard label="Elevation" value={activity.totalElevationGain} unit="m" />
        {activity.averageHeartrate && (
          <StatCard label="Avg. HR" value={activity.averageHeartrate} unit="bpm" />
        )}
      </div>
    </article>
  );
}
