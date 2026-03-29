import type { Activity } from '../../domain/models/Activity';
import type { ActivityRepository } from '../../domain/ports/repositories';

export class GetActivitiesUseCase {
  private activityRepository: ActivityRepository;

  constructor(activityRepository: ActivityRepository) {
    this.activityRepository = activityRepository;
  }

  async execute(): Promise<Activity[]> {
    return this.activityRepository.getActivities();
  }
}
