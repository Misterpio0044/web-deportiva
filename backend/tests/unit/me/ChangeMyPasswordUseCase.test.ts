import { describe, it, expect } from 'vitest';
import bcrypt from 'bcrypt';
import { ChangeMyPasswordUseCase } from '../../../src/application/me/ChangeMyPasswordUseCase';
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../../src/domain/shared/DomainError';
import { createFakeAthleteRepo } from '../../_helpers/fakeAthleteRepo';
import { makeAthlete } from '../../_helpers/fixtures';

describe('ChangeMyPasswordUseCase', () => {
  it('NotFoundError si atleta no existe', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findById as any).mockResolvedValue(null);
    await expect(
      new ChangeMyPasswordUseCase(repo).execute(1, {
        currentPassword: 'a',
        newPassword: 'newpass1',
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('ValidationError si la cuenta no tiene passwordHash (cuenta Strava-only)', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findById as any).mockResolvedValue(makeAthlete({ passwordHash: null }));

    await expect(
      new ChangeMyPasswordUseCase(repo).execute(1, {
        currentPassword: 'x',
        newPassword: 'newpass1',
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('UnauthorizedError si la contraseña actual no coincide', async () => {
    const repo = createFakeAthleteRepo();
    const passwordHash = await bcrypt.hash('correct', 4);
    (repo.findById as any).mockResolvedValue(makeAthlete({ passwordHash }));

    await expect(
      new ChangeMyPasswordUseCase(repo).execute(1, {
        currentPassword: 'wrong',
        newPassword: 'newpass1',
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('actualiza el hash en happy path', async () => {
    const repo = createFakeAthleteRepo();
    const passwordHash = await bcrypt.hash('current1', 4);
    (repo.findById as any).mockResolvedValue(makeAthlete({ passwordHash }));

    await new ChangeMyPasswordUseCase(repo).execute(1, {
      currentPassword: 'current1',
      newPassword: 'newpass1',
    });

    expect((repo.updatePasswordHash as any).mock.calls.length).toBe(1);
    const [id, newHash] = (repo.updatePasswordHash as any).mock.calls[0];
    expect(id).toBe(1);
    expect(await bcrypt.compare('newpass1', newHash)).toBe(true);
  });
});
