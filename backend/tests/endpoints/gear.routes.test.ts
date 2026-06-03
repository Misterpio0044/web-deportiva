import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GearDistanceStat } from '../../src/domain/gear/GearRepository';

const repos = vi.hoisted(() => ({
  athlete: { findById: vi.fn() },
  gear: {
    findByAthleteId: vi.fn(),
    findAll: vi.fn(),
    upsertManyForAthlete: vi.fn().mockResolvedValue(undefined),
    getGearDistanceStats: vi.fn(),
    getGlobalGearDistanceStats: vi.fn(),
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
vi.mock('../../src/infrastructure/persistence/PgGearRepository', () => ({
  PgGearRepository: class {
    constructor() {
      return repos.gear;
    }
  },
}));

import app from '../../src/infrastructure/app';
import { signTestToken } from '../_helpers/signToken';

beforeEach(() => {
  Object.values(repos.athlete).forEach((fn) => (fn as any).mockReset());
  Object.values(repos.gear).forEach((fn) => (fn as any).mockReset());
});

const userToken = (sub = 1) => signTestToken({ sub, role: 'user' });
const adminToken = (sub = 99) => signTestToken({ sub, role: 'admin' });

const sampleStats: GearDistanceStat[] = [
  {
    gearId: 'g1',
    name: 'Nike Vaporfly',
    isPrimary: true,
    totalDistance: 500000,
    activityCount: 45,
  },
];

describe('GET /api/gear/stats', () => {
  it('401 sin token', async () => {
    const res = await request(app).get('/api/gear/stats');
    expect(res.status).toBe(401);
  });

  it('200 para user propio (scope=me)', async () => {
    (repos.gear.getGearDistanceStats as any).mockResolvedValue(sampleStats);

    const res = await request(app)
      .get('/api/gear/stats')
      .set('Authorization', `Bearer ${userToken(1)}`);

    expect(res.status).toBe(200);
    expect(res.body.stats).toHaveLength(1);
    expect(res.body.stats[0].gearId).toBe('g1');
    expect(repos.gear.getGearDistanceStats).toHaveBeenCalledWith(1);
  });

  it('200 admin con ?athleteId=5', async () => {
    (repos.gear.getGearDistanceStats as any).mockResolvedValue(sampleStats);

    const res = await request(app)
      .get('/api/gear/stats?athleteId=5')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(repos.gear.getGearDistanceStats).toHaveBeenCalledWith(5);
  });

  it('200 admin con ?scope=global', async () => {
    (repos.gear.getGlobalGearDistanceStats as any).mockResolvedValue(sampleStats);

    const res = await request(app)
      .get('/api/gear/stats?scope=global')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(repos.gear.getGlobalGearDistanceStats).toHaveBeenCalledTimes(1);
  });

  it('403 user intentando ver gear de otro atleta', async () => {
    const res = await request(app)
      .get('/api/gear/stats?athleteId=99')
      .set('Authorization', `Bearer ${userToken(1)}`);

    expect(res.status).toBe(403);
  });

  it('403 user intentando scope=global', async () => {
    const res = await request(app)
      .get('/api/gear/stats?scope=global')
      .set('Authorization', `Bearer ${userToken(1)}`);

    expect(res.status).toBe(403);
  });
});
