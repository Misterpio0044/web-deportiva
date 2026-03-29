import type { Activity } from '../models/Activity';
import type { Athlete } from '../models/Athlete';

export interface ActivityRepository {
  getActivities(): Promise<Activity[]>;
  getActivityById(id: string): Promise<Activity | null>;
}

export interface AthleteRepository {
  getAuthenticatedAthlete(): Promise<Athlete>;
}
