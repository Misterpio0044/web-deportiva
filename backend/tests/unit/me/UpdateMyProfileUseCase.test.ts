import { describe, it, expect } from 'vitest';
import { UpdateMyProfileUseCase } from '../../../src/application/me/UpdateMyProfileUseCase';
import { ConflictError, NotFoundError } from '../../../src/domain/shared/DomainError';
import { createFakeAthleteRepo } from '../../_helpers/fakeAthleteRepo';
import { makeAthlete } from '../../_helpers/fixtures';

describe('UpdateMyProfileUseCase', () => {
  it('NotFoundError si el atleta no existe', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findById as any).mockResolvedValue(null);

    await expect(
      new UpdateMyProfileUseCase(repo).execute(1, { firstname: 'X' })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('ConflictError si el nuevo email pertenece a otro usuario', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findById as any).mockResolvedValue(makeAthlete({ id: 1, email: 'a@a.com' }));
    (repo.findByEmail as any).mockResolvedValue(makeAthlete({ id: 2, email: 'b@b.com' }));

    await expect(
      new UpdateMyProfileUseCase(repo).execute(1, { email: 'b@b.com' })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('no falla si el email pertenece al propio usuario (mismo id)', async () => {
    const repo = createFakeAthleteRepo();
    const me = makeAthlete({ id: 1, email: 'a@a.com' });
    (repo.findById as any).mockResolvedValue(me);
    (repo.findByEmail as any).mockResolvedValue(me);
    (repo.updateProfile as any).mockResolvedValue(me);

    const result = await new UpdateMyProfileUseCase(repo).execute(1, { email: 'a@a.com' });
    expect(result.user.email).toBe('a@a.com');
    expect(result.token).toBeTruthy();
  });

  it('reemite token con datos actualizados', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findById as any).mockResolvedValue(makeAthlete({ id: 1, firstname: 'Old' }));
    (repo.updateProfile as any).mockResolvedValue(makeAthlete({ id: 1, firstname: 'New' }));

    const result = await new UpdateMyProfileUseCase(repo).execute(1, { firstname: 'New' });
    expect(result.user.firstname).toBe('New');
    expect(result.token).toBeTruthy();
  });
});
