// Centralizes the vi.mock() calls so endpoint tests can simply `import './appWithMocks'`
// before importing the app. We mock the persistence layer and Strava client to keep
// every endpoint test hermetic (no DB, no network).
import { vi } from 'vitest';
import { mockRepos } from './mockedApp';

vi.mock('../../src/infrastructure/database/pool', () => ({
  pool: {},
}));

vi.mock('../../src/infrastructure/persistence/PgAthleteRepository', () => ({
  PgAthleteRepository: vi.fn().mockImplementation(() => mockRepos.athlete),
}));

vi.mock('../../src/infrastructure/persistence/PgActivityRepository', () => ({
  PgActivityRepository: vi.fn().mockImplementation(() => mockRepos.activity),
}));

vi.mock('../../src/infrastructure/persistence/PgGearRepository', () => ({
  PgGearRepository: vi.fn().mockImplementation(() => mockRepos.gear),
}));

vi.mock('../../src/infrastructure/strava/StravaApiClient', async () => {
  const actual = await vi.importActual<
    typeof import('../../src/infrastructure/strava/StravaApiClient')
  >('../../src/infrastructure/strava/StravaApiClient');
  return {
    ...actual,
    StravaApiClient: vi.fn().mockImplementation(() => mockRepos.strava),
  };
});
