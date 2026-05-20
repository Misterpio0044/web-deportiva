import { AthleteRepository } from '../../domain/athlete/AthleteRepository';
import { AthletePublic } from '../../domain/athlete/Athlete';
import { NotFoundError } from '../../domain/shared/DomainError';

export class GetMyProfileUseCase {
  constructor(private readonly athleteRepo: AthleteRepository) {}

  async execute(athleteId: number): Promise<AthletePublic> {
    const athlete = await this.athleteRepo.findById(athleteId);
    if (!athlete) throw new NotFoundError('Atleta');
    const { passwordHash: _pw, ...publicData } = athlete;
    void _pw;
    return publicData;
  }
}
