import type { Athlete } from '../models/Athlete';

export interface AthleteRepository {
  findById(id: string): Promise<Athlete | null>;
  findByStravaId(stravaId: number): Promise<Athlete | null>;
  save(athlete: Athlete): Promise<void>;
}
