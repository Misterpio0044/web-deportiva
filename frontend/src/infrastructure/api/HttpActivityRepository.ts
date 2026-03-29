import type { Activity } from '../../domain/models/Activity';
import type { ActivityRepository } from '../../domain/ports/repositories';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class HttpActivityRepository implements ActivityRepository {
  async getActivities(): Promise<Activity[]> {
    const response = await fetch(`${API_BASE_URL}/api/activities`);
    if (!response.ok) {
      throw new Error(`Failed to fetch activities: ${response.statusText}`);
    }
    return response.json() as Promise<Activity[]>;
  }

  async getActivityById(id: string): Promise<Activity | null> {
    const response = await fetch(`${API_BASE_URL}/api/activities/${id}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Failed to fetch activity ${id}: ${response.statusText}`);
    }
    return response.json() as Promise<Activity>;
  }
}
