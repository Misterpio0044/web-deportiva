import { describe, it, expect } from 'vitest';
import { GetMyProfileUseCase } from '../../../src/application/me/GetMyProfileUseCase';
import { NotFoundError } from '../../../src/domain/shared/DomainError';
import { createFakeAthleteRepo } from '../../_helpers/fakeAthleteRepo';
import { makeAthlete } from '../../_helpers/fixtures';

describe('GetMyProfileUseCase', () => {
  it('devuelve el perfil sin passwordHash', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findById as any).mockResolvedValue(makeAthlete({ passwordHash: 'secret-hash' }));

    const result = await new GetMyProfileUseCase(repo).execute(1);
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.email).toBe('ana@example.com');
  });

  it('lanza NotFoundError si el atleta no existe', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findById as any).mockResolvedValue(null);

    await expect(new GetMyProfileUseCase(repo).execute(99)).rejects.toBeInstanceOf(NotFoundError);
  });
});
