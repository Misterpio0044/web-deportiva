import type { Activity } from '../../domain/models/Activity';
import type { ActivityRepository } from '../../domain/repositories/ActivityRepository';

export class GetActivitiesUseCase {
  constructor(private readonly activityRepository: ActivityRepository) {}

  async execute(athleteId: string): Promise<Activity[]> {
    return this.activityRepository.findByAthleteId(athleteId);
  }
}
