import { describe, it, expect, vi } from 'vitest';
import { refreshStravaTokenIfNeeded } from '../../../src/application/strava/refreshStravaTokenIfNeeded';
import { createFakeAthleteRepo } from '../../_helpers/fakeAthleteRepo';
import { makeAthlete } from '../../_helpers/fixtures';

function fakeClient(refreshed?: any) {
  return {
    refreshAccessToken: vi.fn().mockResolvedValue(
      refreshed ?? {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }
    ),
  } as any;
}

describe('refreshStravaTokenIfNeeded', () => {
  it('devuelve el access_token actual si aún no expira', async () => {
    const repo = createFakeAthleteRepo();
    const client = fakeClient();
    const athlete = makeAthlete({
      stravaAccessToken: 'still-valid',
      stravaRefreshToken: 'r',
      stravaTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const token = await refreshStravaTokenIfNeeded(athlete, repo, client);
    expect(token).toBe('still-valid');
    expect(client.refreshAccessToken).not.toHaveBeenCalled();
    expect(repo.updateStravaTokens).not.toHaveBeenCalled();
  });

  it('refresca y persiste si el token está a punto de expirar', async () => {
    const repo = createFakeAthleteRepo();
    const client = fakeClient();
    const athlete = makeAthlete({
      stravaAccessToken: 'old',
      stravaRefreshToken: 'r',
      stravaTokenExpiresAt: new Date(Date.now() + 10_000), // <60s
    });

    const token = await refreshStravaTokenIfNeeded(athlete, repo, client);
    expect(token).toBe('new-access');
    expect(client.refreshAccessToken).toHaveBeenCalledWith('r');
    expect(repo.updateStravaTokens).toHaveBeenCalledTimes(1);
  });

  it('lanza si el atleta no tiene tokens', async () => {
    const repo = createFakeAthleteRepo();
    const client = fakeClient();
    const athlete = makeAthlete({ stravaAccessToken: undefined });
    await expect(refreshStravaTokenIfNeeded(athlete, repo, client)).rejects.toThrow(
      'Athlete has no Strava tokens'
    );
  });
});
