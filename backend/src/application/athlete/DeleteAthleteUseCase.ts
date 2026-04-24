import { AthleteRepository } from '../../domain/athlete/AthleteRepository';
import { ActivityRepository } from '../../domain/activity/ActivityRepository';
import { NotFoundError } from '../../domain/shared/DomainError';

export class DeleteAthleteUseCase {
  constructor(
    private readonly athleteRepo: AthleteRepository,
    private readonly activityRepo: ActivityRepository,
  ) {}

  async execute(athleteId: number): Promise<void> {
    const athlete = await this.athleteRepo.findById(athleteId);
    if (!athlete) throw new NotFoundError('Atleta');

    // CASCADE in DB handles activities/gear; this is here for explicit domain intent
    await this.athleteRepo.deleteById(athleteId);
  }
}
