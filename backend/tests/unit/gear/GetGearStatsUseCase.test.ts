import { describe, it, expect } from 'vitest';
import { GetGearStatsUseCase } from '../../../src/application/gear/GetGearStatsUseCase';
import { createFakeGearRepo } from '../../_helpers/fakeGearRepo';
import { ForbiddenError } from '../../../src/domain/shared/DomainError';
import type { GearDistanceStat } from '../../../src/domain/gear/GearRepository';

const stats: GearDistanceStat[] = [
  {
    gearId: 'g1',
    name: 'Nike Vaporfly',
    isPrimary: true,
    totalDistance: 500000,
    activityCount: 45,
  },
];

describe('GetGearStatsUseCase', () => {
  it('scope=me → stats del propio atleta', async () => {
    const repo = createFakeGearRepo();
    (repo.getGearDistanceStats as any).mockResolvedValue(stats);

    const result = await new GetGearStatsUseCase(repo).execute({
      requesterId: 1,
      requesterRole: 'user',
      scope: 'me',
    });

    expect(result).toEqual(stats);
    expect(repo.getGearDistanceStats).toHaveBeenCalledWith(1);
  });

  it('scope=athleteId propio → permitido para user', async () => {
    const repo = createFakeGearRepo();
    (repo.getGearDistanceStats as any).mockResolvedValue(stats);

    await expect(
      new GetGearStatsUseCase(repo).execute({
        requesterId: 1,
        requesterRole: 'user',
        scope: 1,
      })
    ).resolves.toEqual(stats);
  });

  it('scope=athleteId ajeno → ForbiddenError para user', async () => {
    const repo = createFakeGearRepo();

    await expect(
      new GetGearStatsUseCase(repo).execute({
        requesterId: 1,
        requesterRole: 'user',
        scope: 99,
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('scope=global → ForbiddenError para user', async () => {
    const repo = createFakeGearRepo();

    await expect(
      new GetGearStatsUseCase(repo).execute({
        requesterId: 1,
        requesterRole: 'user',
        scope: 'global',
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('scope=global → permitido para admin', async () => {
    const repo = createFakeGearRepo();
    (repo.getGlobalGearDistanceStats as any).mockResolvedValue(stats);

    const result = await new GetGearStatsUseCase(repo).execute({
      requesterId: 2,
      requesterRole: 'admin',
      scope: 'global',
    });

    expect(result).toEqual(stats);
    expect(repo.getGlobalGearDistanceStats).toHaveBeenCalledTimes(1);
  });

  it('scope=athleteId ajeno → permitido para admin', async () => {
    const repo = createFakeGearRepo();
    (repo.getGearDistanceStats as any).mockResolvedValue(stats);

    await expect(
      new GetGearStatsUseCase(repo).execute({
        requesterId: 2,
        requesterRole: 'admin',
        scope: 99,
      })
    ).resolves.toEqual(stats);
    expect(repo.getGearDistanceStats).toHaveBeenCalledWith(99);
  });
});
