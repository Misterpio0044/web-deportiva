import { ActivityRepository, DashboardData } from '../../domain/activity/ActivityRepository';
import { NotFoundError } from '../../domain/shared/DomainError';
import { AthleteRepository } from '../../domain/athlete/AthleteRepository';

export class GetAthleteDashboardUseCase {
  constructor(
    private readonly activityRepo: ActivityRepository,
    private readonly athleteRepo: AthleteRepository,
  ) {}

  async execute(athleteId: number): Promise<DashboardData> {
    const athlete = await this.athleteRepo.findById(athleteId);
    if (!athlete) throw new NotFoundError('Atleta');

    return this.activityRepo.getDashboardData(athleteId);
  }
}
