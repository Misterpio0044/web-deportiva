import jwt from 'jsonwebtoken';
import { AthleteRepository } from '../../domain/athlete/AthleteRepository';
import { AthletePublic } from '../../domain/athlete/Athlete';
import { ConflictError, NotFoundError } from '../../domain/shared/DomainError';

export interface UpdateMyProfileInput {
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
}

export interface UpdateMyProfileOutput {
  user: AthletePublic;
  token: string;
}

export class UpdateMyProfileUseCase {
  constructor(private readonly athleteRepo: AthleteRepository) {}

  async execute(athleteId: number, input: UpdateMyProfileInput): Promise<UpdateMyProfileOutput> {
    const current = await this.athleteRepo.findById(athleteId);
    if (!current) throw new NotFoundError('Atleta');

    // Normalizar
    const normalized: UpdateMyProfileInput = {
      firstname: input.firstname?.trim(),
      lastname: input.lastname?.trim(),
      username: input.username?.trim(),
      email: input.email?.trim().toLowerCase(),
    };

    // Comprobar unicidad si cambian
    if (normalized.email && normalized.email !== current.email) {
      const dup = await this.athleteRepo.findByEmail(normalized.email);
      if (dup && dup.id !== athleteId) {
        throw new ConflictError('Ya existe una cuenta con este email');
      }
    }
    if (normalized.username && normalized.username !== current.username) {
      const dup = await this.athleteRepo.findByUsername(normalized.username);
      if (dup && dup.id !== athleteId) {
        throw new ConflictError('Este nombre de usuario ya está en uso');
      }
    }

    const updated = await this.athleteRepo.updateProfile(athleteId, normalized);

    // Reemitir JWT con datos nuevos (el payload contiene firstname/email)
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    const token = jwt.sign(
      { sub: updated.id, email: updated.email, role: updated.role, firstname: updated.firstname },
      secret,
      { expiresIn: '8h' }
    );

    const { passwordHash: _pw, ...publicData } = updated;
    void _pw;
    return { user: publicData, token };
  }
}
