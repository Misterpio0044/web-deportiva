import { useEffect, useState } from 'react';
import type { Activity } from '../../domain/models/Activity';
import { GetActivitiesUseCase } from '../../application/usecases/GetActivitiesUseCase';
import { HttpActivityRepository } from '../../infrastructure/api/HttpActivityRepository';
import { ActivityList } from '../organisms/ActivityList';
import { DashboardTemplate } from '../templates/DashboardTemplate';
import './DashboardPage.css';

const activityRepository = new HttpActivityRepository();
const getActivitiesUseCase = new GetActivitiesUseCase(activityRepository);

export function DashboardPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getActivitiesUseCase
      .execute()
      .then(setActivities)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unknown error');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const header = (
    <div className="dashboard-page__nav">
      <h1 className="dashboard-page__title">web-deportiva</h1>
      <span className="dashboard-page__subtitle">Strava Activity Dashboard</span>
    </div>
  );

  return (
    <DashboardTemplate
      header={header}
      content={<ActivityList activities={activities} isLoading={isLoading} error={error} />}
    />
  );
}
