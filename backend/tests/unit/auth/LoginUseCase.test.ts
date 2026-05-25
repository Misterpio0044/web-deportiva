import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { LoginUseCase } from '../../../src/application/auth/LoginUseCase';
import { UnauthorizedError } from '../../../src/domain/shared/DomainError';
import { createFakeAthleteRepo } from '../../_helpers/fakeAthleteRepo';
import { makeAthlete } from '../../_helpers/fixtures';

describe('LoginUseCase', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('devuelve token + user en credenciales correctas', async () => {
    const repo = createFakeAthleteRepo();
    const passwordHash = await bcrypt.hash('Secret123', 4);
    const athlete = makeAthlete({ passwordHash });
    (repo.findByEmail as any).mockResolvedValue(athlete);

    const result = await new LoginUseCase(repo).execute({
      email: 'ana@example.com',
      password: 'Secret123',
    });

    expect(result.user.id).toBe(athlete.id);
    expect(result.user.email).toBe(athlete.email);
    const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as any;
    expect(decoded.sub).toBe(athlete.id);
    expect(decoded.role).toBe('user');
  });

  it('lanza UnauthorizedError si el email no existe', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findByEmail as any).mockResolvedValue(null);

    await expect(
      new LoginUseCase(repo).execute({ email: 'x@x.com', password: 'p' })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('lanza UnauthorizedError si la contraseña no coincide', async () => {
    const repo = createFakeAthleteRepo();
    const passwordHash = await bcrypt.hash('Secret123', 4);
    (repo.findByEmail as any).mockResolvedValue(makeAthlete({ passwordHash }));

    await expect(
      new LoginUseCase(repo).execute({ email: 'ana@example.com', password: 'wrong' })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('lanza error si JWT_SECRET no está configurado', async () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    const repo = createFakeAthleteRepo();
    const passwordHash = await bcrypt.hash('Secret123', 4);
    (repo.findByEmail as any).mockResolvedValue(makeAthlete({ passwordHash }));

    await expect(
      new LoginUseCase(repo).execute({ email: 'ana@example.com', password: 'Secret123' })
    ).rejects.toThrow('JWT_SECRET not configured');

    process.env.JWT_SECRET = original;
  });
});
