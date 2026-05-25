// Shared mock instances exposed via vi.hoisted so vi.mock() factories can read them.
// IMPORTANT: import this file BEFORE importing the app, and call vi.mock(...) in your
// test file using the factories below.
import { vi } from 'vitest';

export const mockRepos = vi.hoisted(() => {
  const athlete = {
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
  const activity = {
    findByAthleteId: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    getDashboardData: vi.fn(),
    getGlobalDashboardData: vi.fn(),
    deleteByAthleteId: vi.fn(),
    upsertMany: vi.fn(),
  };
  const strava = {
    exchangeCode: vi.fn(),
    refreshAccessToken: vi.fn(),
    getAthlete: vi.fn(),
    listActivities: vi.fn(),
  };
  return { athlete, activity, strava };
});

export function resetAllMocks() {
  Object.values(mockRepos.athlete).forEach((fn) => (fn as any).mockReset());
  Object.values(mockRepos.activity).forEach((fn) => (fn as any).mockReset());
  Object.values(mockRepos.strava).forEach((fn) => (fn as any).mockReset());
}
