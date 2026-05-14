import { AthleteRepository } from '../../domain/athlete/AthleteRepository';
import { AthletePublic } from '../../domain/athlete/Athlete';

export class ListAthletesUseCase {
  constructor(private readonly athleteRepo: AthleteRepository) {}

  async execute(): Promise<AthletePublic[]> {
    return this.athleteRepo.findAll();
  }
}
