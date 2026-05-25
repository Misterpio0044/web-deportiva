import { describe, it, expect } from 'vitest';
import { GetAthleteDashboardUseCase } from '../../../src/application/dashboard/GetAthleteDashboardUseCase';
import { GetGlobalDashboardUseCase } from '../../../src/application/dashboard/GetGlobalDashboardUseCase';
import { NotFoundError } from '../../../src/domain/shared/DomainError';
import { createFakeAthleteRepo } from '../../_helpers/fakeAthleteRepo';
import { createFakeActivityRepo } from '../../_helpers/fakeActivityRepo';
import { makeAthlete, makeDashboardData } from '../../_helpers/fixtures';

describe('GetAthleteDashboardUseCase', () => {
  it('NotFoundError si atleta no existe', async () => {
    const athleteRepo = createFakeAthleteRepo();
    const activityRepo = createFakeActivityRepo();
    (athleteRepo.findById as any).mockResolvedValue(null);

    await expect(
      new GetAthleteDashboardUseCase(activityRepo, athleteRepo).execute(99)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('delega en activityRepo.getDashboardData()', async () => {
    const athleteRepo = createFakeAthleteRepo();
    const activityRepo = createFakeActivityRepo();
    (athleteRepo.findById as any).mockResolvedValue(makeAthlete());
    const data = makeDashboardData({ totalActivities: 5 });
    (activityRepo.getDashboardData as any).mockResolvedValue(data);

    const result = await new GetAthleteDashboardUseCase(activityRepo, athleteRepo).execute(1);
    expect(result).toBe(data);
    expect(activityRepo.getDashboardData).toHaveBeenCalledWith(1);
  });
});

describe('GetGlobalDashboardUseCase', () => {
  it('delega en activityRepo.getGlobalDashboardData()', async () => {
    const activityRepo = createFakeActivityRepo();
    const data = makeDashboardData({ totalActivities: 100 });
    (activityRepo.getGlobalDashboardData as any).mockResolvedValue(data);

    const result = await new GetGlobalDashboardUseCase(activityRepo).execute();
    expect(result).toBe(data);
  });
});
