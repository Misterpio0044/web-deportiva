import { describe, it, expect } from 'vitest';
import { ListAthletesUseCase } from '../../../src/application/athlete/ListAthletesUseCase';
import { DeleteAthleteUseCase } from '../../../src/application/athlete/DeleteAthleteUseCase';
import { NotFoundError } from '../../../src/domain/shared/DomainError';
import { createFakeAthleteRepo } from '../../_helpers/fakeAthleteRepo';
import { createFakeActivityRepo } from '../../_helpers/fakeActivityRepo';
import { makeAthlete } from '../../_helpers/fixtures';

describe('ListAthletesUseCase', () => {
  it('delega en repo.findAll()', async () => {
    const repo = createFakeAthleteRepo();
    const data = [{ ...makeAthlete(), passwordHash: null }];
    (repo.findAll as any).mockResolvedValue(data);
    const result = await new ListAthletesUseCase(repo).execute();
    expect(result).toBe(data);
  });
});

describe('DeleteAthleteUseCase', () => {
  it('elimina si el atleta existe', async () => {
    const athleteRepo = createFakeAthleteRepo();
    const activityRepo = createFakeActivityRepo();
    (athleteRepo.findById as any).mockResolvedValue(makeAthlete({ id: 7 }));

    await new DeleteAthleteUseCase(athleteRepo, activityRepo).execute(7);
    expect(athleteRepo.deleteById).toHaveBeenCalledWith(7);
  });

  it('lanza NotFoundError si no existe', async () => {
    const athleteRepo = createFakeAthleteRepo();
    const activityRepo = createFakeActivityRepo();
    (athleteRepo.findById as any).mockResolvedValue(null);

    await expect(
      new DeleteAthleteUseCase(athleteRepo, activityRepo).execute(99)
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(athleteRepo.deleteById).not.toHaveBeenCalled();
  });
});
