import type { Athlete } from '../../domain/models/Athlete';
import type { AthleteRepository } from '../../domain/ports/repositories';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class HttpAthleteRepository implements AthleteRepository {
  async getAuthenticatedAthlete(): Promise<Athlete> {
    const response = await fetch(`${API_BASE_URL}/api/athlete`);
    if (!response.ok) {
      throw new Error(`Failed to fetch athlete: ${response.statusText}`);
    }
    return response.json() as Promise<Athlete>;
  }
}
