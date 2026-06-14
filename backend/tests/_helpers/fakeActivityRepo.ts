import { vi } from 'vitest';
import type { ActivityRepository } from '../../src/domain/activity/ActivityRepository';

export function createFakeActivityRepo(): ActivityRepository & {
  [k: string]: ReturnType<typeof vi.fn> | unknown;
} {
  const repo = {
    findByAthleteId: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    searchActivities: vi.fn(),
    getDashboardData: vi.fn(),
    getGlobalDashboardData: vi.fn(),
    deleteByAthleteId: vi.fn(),
    deleteOrphanedForAthlete: vi.fn().mockResolvedValue(0),
    upsertMany: vi.fn(),
    getActivityStreams: vi.fn().mockResolvedValue(null),
    saveActivityStreams: vi.fn().mockResolvedValue(undefined),
    findActivityIdsMissingStreams: vi.fn().mockResolvedValue([]),
  };
  return repo as unknown as ActivityRepository & {
    [k: string]: ReturnType<typeof vi.fn> | unknown;
  };
}
