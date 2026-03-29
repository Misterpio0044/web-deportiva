import type { Activity } from '../../domain/models/Activity';
import type { ActivityRepository } from '../../domain/repositories/ActivityRepository';

export class GetActivityByIdUseCase {
  constructor(private readonly activityRepository: ActivityRepository) {}

  async execute(id: string): Promise<Activity | null> {
    return this.activityRepository.findById(id);
  }
}
