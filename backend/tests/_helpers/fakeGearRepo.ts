import { vi } from 'vitest';
import type { GearRepository } from '../../src/domain/gear/GearRepository';

export function createFakeGearRepo(): GearRepository & {
  [k: string]: ReturnType<typeof vi.fn> | unknown;
} {
  const repo = {
    findByAthleteId: vi.fn(),
    findAll: vi.fn(),
    upsertManyForAthlete: vi.fn().mockResolvedValue(undefined),
    getGearDistanceStats: vi.fn(),
    getGlobalGearDistanceStats: vi.fn(),
  };
  return repo as unknown as GearRepository & {
    [k: string]: ReturnType<typeof vi.fn> | unknown;
  };
}
