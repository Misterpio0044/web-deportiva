import { describe, it, expect } from 'vitest';
import { DisconnectStravaUseCase } from '../../../src/application/strava/DisconnectStravaUseCase';
import { NotFoundError } from '../../../src/domain/shared/DomainError';
import { createFakeAthleteRepo } from '../../_helpers/fakeAthleteRepo';
import { makeAthlete } from '../../_helpers/fixtures';

describe('DisconnectStravaUseCase', () => {
  it('desvincula si el atleta existe', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findById as any).mockResolvedValue(makeAthlete({ id: 5 }));
    await new DisconnectStravaUseCase(repo).execute(5);
    expect(repo.unlinkStravaAccount).toHaveBeenCalledWith(5);
  });

  it('NotFoundError si no existe', async () => {
    const repo = createFakeAthleteRepo();
    (repo.findById as any).mockResolvedValue(null);
    await expect(new DisconnectStravaUseCase(repo).execute(5)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});
