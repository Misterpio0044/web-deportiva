import { AthleteRepository } from '../../domain/athlete/AthleteRepository';
import { NotFoundError } from '../../domain/shared/DomainError';

export class DisconnectStravaUseCase {
  constructor(private readonly athleteRepo: AthleteRepository) {}

  async execute(athleteId: number): Promise<void> {
    const athlete = await this.athleteRepo.findById(athleteId);
    if (!athlete) throw new NotFoundError('Atleta');
    await this.athleteRepo.unlinkStravaAccount(athleteId);
  }
}
