import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repos = vi.hoisted(() => ({
  athlete: { findById: vi.fn() },
  activity: {
    getDashboardData: vi.fn(),
    getGlobalDashboardData: vi.fn(),
  },
}));

vi.mock('../../src/infrastructure/database/pool', () => ({ pool: {} }));
vi.mock('../../src/infrastructure/persistence/PgAthleteRepository', () => ({
  PgAthleteRepository: class {
    constructor() {
      return repos.athlete;
    }
  },
}));
vi.mock('../../src/infrastructure/persistence/PgActivityRepository', () => ({
  PgActivityRepository: class {
    constructor() {
      return repos.activity;
    }
  },
}));

import app from '../../src/infrastructure/app';
import { makeAthlete, makeDashboardData } from '../_helpers/fixtures';
import { signTestToken } from '../_helpers/signToken';

beforeEach(() => {
  repos.athlete.findById.mockReset();
  repos.activity.getDashboardData.mockReset();
  repos.activity.getGlobalDashboardData.mockReset();
});

describe('GET /api/dashboard', () => {
  it('user → su propio dashboard', async () => {
    repos.athlete.findById.mockResolvedValue(makeAthlete({ id: 1 }));
    repos.activity.getDashboardData.mockResolvedValue(makeDashboardData({ totalActivities: 3 }));

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${signTestToken({ sub: 1, role: 'user' })}`);

    expect(res.status).toBe(200);
    expect(res.body.totalActivities).toBe(3);
    expect(repos.activity.getDashboardData).toHaveBeenCalledWith(1);
  });

  it('admin sin athleteId → dashboard global', async () => {
    repos.activity.getGlobalDashboardData.mockResolvedValue(
      makeDashboardData({ totalActivities: 100 })
    );

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${signTestToken({ sub: 99, role: 'admin' })}`);

    expect(res.status).toBe(200);
    expect(res.body.totalActivities).toBe(100);
  });

  it('admin con athleteId → dashboard de ese atleta', async () => {
    repos.athlete.findById.mockResolvedValue(makeAthlete({ id: 7 }));
    repos.activity.getDashboardData.mockResolvedValue(makeDashboardData({ totalActivities: 12 }));

    const res = await request(app)
      .get('/api/dashboard?athleteId=7')
      .set('Authorization', `Bearer ${signTestToken({ sub: 99, role: 'admin' })}`);

    expect(res.status).toBe(200);
    expect(res.body.totalActivities).toBe(12);
    expect(repos.activity.getDashboardData).toHaveBeenCalledWith(7);
  });

  it('401 sin token', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });
});
