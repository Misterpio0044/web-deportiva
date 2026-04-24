import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AthleteRepository } from '../../domain/athlete/AthleteRepository';
import { UnauthorizedError } from '../../domain/shared/DomainError';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  token: string;
  user: {
    id: number;
    email: string;
    role: 'admin' | 'user';
    firstname: string;
    lastname: string;
  };
}

export class LoginUseCase {
  constructor(private readonly athleteRepo: AthleteRepository) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const athlete = await this.athleteRepo.findByEmail(input.email);
    if (!athlete) {
      throw new UnauthorizedError('Credenciales incorrectas');
    }

    const passwordMatch = await bcrypt.compare(input.password, athlete.passwordHash ?? '');
    if (!passwordMatch) {
      throw new UnauthorizedError('Credenciales incorrectas');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const token = jwt.sign(
      { sub: athlete.id, email: athlete.email, role: athlete.role, firstname: athlete.firstname },
      secret,
      { expiresIn: '8h' },
    );

    return {
      token,
      user: {
        id: athlete.id,
        email: athlete.email,
        role: athlete.role,
        firstname: athlete.firstname,
        lastname: athlete.lastname,
      },
    };
  }
}
