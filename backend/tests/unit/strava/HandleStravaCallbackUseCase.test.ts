import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { HandleStravaCallbackUseCase } from '../../../src/application/strava/HandleStravaCallbackUseCase';
import { ConflictError, UnauthorizedError } from '../../../src/domain/shared/DomainError';
import { createFakeAthleteRepo } from '../../_helpers/fakeAthleteRepo';
import { makeAthlete } from '../../_helpers/fixtures';

function signState(linkAthleteId: number | null = null) {
  return jwt.sign({ nonce: 'n', linkAthleteId }, process.env.JWT_SECRET!, { expiresIn: '10m' });
}

function fakeClient(overrides: any = {}) {
  return {
    exchangeCode: vi.fn().mockResolvedValue({
      access_token: 'a',
      refresh_token: 'r',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      athlete: { id: 555, firstname: 'S', lastname: 'A' },
    }),
    ...overrides,
  } as any;
}

function fakeSyncUseCase(throws = false) {
  return {
    execute: throws
      ? vi.fn().mockRejectedValue(new Error('sync failed'))
      : vi.fn().mockResolvedValue({ activitiesSynced: 7, created: 7, updated: 0 }),
  } as any;
}

describe('HandleStravaCallbackUseCase', () => {
  it('UnauthorizedError si el state es inválido', async () => {
    const repo = createFakeAthleteRepo();
    await expect(
      new HandleStravaCallbackUseCase(repo, fakeClient(), fakeSyncUseCase()).execute({
        code: 'x',
        state: 'invalid-jwt',
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('login sin atleta vinculado → UnauthorizedError', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findByStravaId as any).mockResolvedValue(null);

    await expect(
      new HandleStravaCallbackUseCase(repo, fakeClient(), fakeSyncUseCase()).execute({
        code: 'x',
        state: signState(null),
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('flujo LINK con conflicto de stravaId → ConflictError', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findById as any).mockResolvedValue(makeAthlete({ id: 10 }));
    (repo.findByStravaId as any).mockResolvedValue(makeAthlete({ id: 11 }));

    await expect(
      new HandleStravaCallbackUseCase(repo, fakeClient(), fakeSyncUseCase()).execute({
        code: 'x',
        state: signState(10),
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('flujo LINK happy: enlaza y dispara primer sync', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findById as any)
      .mockResolvedValueOnce(makeAthlete({ id: 10, stravaId: undefined })) // antes de link
      .mockResolvedValueOnce(makeAthlete({ id: 10, stravaId: 555 })); // reloaded
    (repo.findByStravaId as any).mockResolvedValue(null);

    const sync = fakeSyncUseCase();
    const result = await new HandleStravaCallbackUseCase(repo, fakeClient(), sync).execute({
      code: 'x',
      state: signState(10),
    });

    expect(repo.linkStravaAccount).toHaveBeenCalledTimes(1);
    expect(result.activitiesSynced).toBe(7);
    expect(result.firstSyncFailed).toBe(false);
    expect(sync.execute).toHaveBeenCalledTimes(1);
  });

  it('si el primer sync falla, devuelve firstSyncFailed=true (no propaga)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const repo = createFakeAthleteRepo();
    (repo.findById as any)
      .mockResolvedValueOnce(makeAthlete({ id: 10, stravaId: undefined }))
      .mockResolvedValueOnce(makeAthlete({ id: 10, stravaId: 555 }));
    (repo.findByStravaId as any).mockResolvedValue(null);
    const sync = fakeSyncUseCase(true);

    const result = await new HandleStravaCallbackUseCase(repo, fakeClient(), sync).execute({
      code: 'x',
      state: signState(10),
    });
    expect(result.firstSyncFailed).toBe(true);
    expect(result.activitiesSynced).toBe(0);
    errSpy.mockRestore();
  });
});
