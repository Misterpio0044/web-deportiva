import bcrypt from 'bcrypt';
import { AthleteRepository } from '../../domain/athlete/AthleteRepository';
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../domain/shared/DomainError';

export interface ChangeMyPasswordInput {
  currentPassword: string;
  newPassword: string;
}

export class ChangeMyPasswordUseCase {
  constructor(private readonly athleteRepo: AthleteRepository) {}

  async execute(athleteId: number, input: ChangeMyPasswordInput): Promise<void> {
    const athlete = await this.athleteRepo.findById(athleteId);
    if (!athlete) throw new NotFoundError('Atleta');

    if (!athlete.passwordHash) {
      throw new ValidationError(
        'Esta cuenta no tiene contraseña local. Vincula tu cuenta antes de establecer una.'
      );
    }

    const match = await bcrypt.compare(input.currentPassword, athlete.passwordHash);
    if (!match) {
      throw new UnauthorizedError('La contraseña actual no es correcta');
    }

    const newHash = await bcrypt.hash(input.newPassword, 10);
    await this.athleteRepo.updatePasswordHash(athleteId, newHash);
  }
}
