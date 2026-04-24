import { ActivityRepository, DashboardData } from '../../domain/activity/ActivityRepository';

export class GetGlobalDashboardUseCase {
  constructor(private readonly activityRepo: ActivityRepository) {}

  async execute(): Promise<DashboardData> {
    return this.activityRepo.getGlobalDashboardData();
  }
}
