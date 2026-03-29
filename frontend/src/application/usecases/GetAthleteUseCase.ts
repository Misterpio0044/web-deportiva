import type { Athlete } from '../../domain/models/Athlete';
import type { AthleteRepository } from '../../domain/ports/repositories';

export class GetAthleteUseCase {
  private athleteRepository: AthleteRepository;

  constructor(athleteRepository: AthleteRepository) {
    this.athleteRepository = athleteRepository;
  }

  async execute(): Promise<Athlete> {
    return this.athleteRepository.getAuthenticatedAthlete();
  }
}
