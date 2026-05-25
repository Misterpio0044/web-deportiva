import { vi } from 'vitest';
import type { ActivityRepository } from '../../src/domain/activity/ActivityRepository';

export function createFakeActivityRepo(): ActivityRepository & {
  [k: string]: ReturnType<typeof vi.fn> | unknown;
} {
  const repo = {
    findByAthleteId: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    getDashboardData: vi.fn(),
    getGlobalDashboardData: vi.fn(),
    deleteByAthleteId: vi.fn(),
    upsertMany: vi.fn(),
  };
  return repo as unknown as ActivityRepository & {
    [k: string]: ReturnType<typeof vi.fn> | unknown;
  };
}
