import { describe, it, expect } from 'vitest';
import bcrypt from 'bcrypt';
import { RegisterUseCase } from '../../../src/application/auth/RegisterUseCase';
import { ConflictError } from '../../../src/domain/shared/DomainError';
import { createFakeAthleteRepo } from '../../_helpers/fakeAthleteRepo';
import { makeAthlete } from '../../_helpers/fixtures';

const input = {
  firstname: 'Ana',
  lastname: 'Runner',
  username: 'ana',
  email: '  Ana@Example.COM  ',
  password: 'Secret1',
};

describe('RegisterUseCase', () => {
  it('crea atleta, hashea password y normaliza email (lowercase + trim)', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findByEmail as any).mockResolvedValue(null);
    (repo.findByUsername as any).mockResolvedValue(null);
    (repo.create as any).mockImplementation(async (i: any) => makeAthlete({ ...i, id: 42 }));

    const result = await new RegisterUseCase(repo).execute(input);

    const createArg = (repo.create as any).mock.calls[0][0];
    expect(createArg.email).toBe('ana@example.com');
    expect(createArg.username).toBe('ana');
    expect(createArg.firstname).toBe('Ana');
    // bcrypt hash starts with $2
    expect(createArg.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(await bcrypt.compare('Secret1', createArg.passwordHash)).toBe(true);
    expect(result.user.id).toBe(42);
    expect(result.token).toBeTruthy();
  });

  it('lanza ConflictError si el email ya existe', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findByEmail as any).mockResolvedValue(makeAthlete());
    (repo.findByUsername as any).mockResolvedValue(null);

    await expect(new RegisterUseCase(repo).execute(input)).rejects.toBeInstanceOf(ConflictError);
  });

  it('lanza ConflictError si el username ya existe', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findByEmail as any).mockResolvedValue(null);
    (repo.findByUsername as any).mockResolvedValue(makeAthlete());

    await expect(new RegisterUseCase(repo).execute(input)).rejects.toBeInstanceOf(ConflictError);
  });

  it('asigna rol "user" por defecto', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findByEmail as any).mockResolvedValue(null);
    (repo.findByUsername as any).mockResolvedValue(null);
    (repo.create as any).mockImplementation(async (i: any) => makeAthlete({ ...i, id: 1 }));

    await new RegisterUseCase(repo).execute(input);
    expect((repo.create as any).mock.calls[0][0].role).toBe('user');
  });
});
