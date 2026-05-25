import { vi } from 'vitest';
import type { AthleteRepository } from '../../src/domain/athlete/AthleteRepository';

export function createFakeAthleteRepo(): AthleteRepository & {
  // expose vi.fn for test assertions
  [k: string]: ReturnType<typeof vi.fn> | unknown;
} {
  const repo = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByUsername: vi.fn(),
    findByStravaId: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    createFromStrava: vi.fn(),
    updateStravaTokens: vi.fn(),
    linkStravaAccount: vi.fn(),
    updateStravaProfile: vi.fn(),
    updateProfile: vi.fn(),
    updatePasswordHash: vi.fn(),
    unlinkStravaAccount: vi.fn(),
    recordSyncSuccess: vi.fn(),
    recordSyncError: vi.fn(),
    deleteById: vi.fn(),
    updateRole: vi.fn(),
  };
  return repo as unknown as AthleteRepository & {
    [k: string]: ReturnType<typeof vi.fn> | unknown;
  };
}
