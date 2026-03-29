import type { Activity } from '../models/Activity';

export interface ActivityRepository {
  findById(id: string): Promise<Activity | null>;
  findByAthleteId(athleteId: string): Promise<Activity[]>;
  save(activity: Activity): Promise<void>;
  saveMany(activities: Activity[]): Promise<void>;
}
