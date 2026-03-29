import type { Activity } from '../../domain/models/Activity';
import { ActivityCard } from '../molecules/ActivityCard';
import './ActivityList.css';

interface ActivityListProps {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
}

export function ActivityList({ activities, isLoading, error }: ActivityListProps) {
  if (isLoading) {
    return <div className="activity-list__state">Loading activities…</div>;
  }

  if (error) {
    return <div className="activity-list__state activity-list__state--error">{error}</div>;
  }

  if (activities.length === 0) {
    return <div className="activity-list__state">No activities found.</div>;
  }

  return (
    <section className="activity-list">
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </section>
  );
}
