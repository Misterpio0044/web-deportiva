import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repos = vi.hoisted(() => ({
  athlete: { findById: vi.fn() },
  activity: {
    findByAthleteId: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    upsertMany: vi.fn(),
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
import { makeActivity } from '../_helpers/fixtures';
import { signTestToken } from '../_helpers/signToken';

beforeEach(() => {
  Object.values(repos.athlete).forEach((fn) => (fn as any).mockReset());
  Object.values(repos.activity).forEach((fn) => (fn as any).mockReset());
});

const userToken = (sub = 1) => signTestToken({ sub, role: 'user' });
const adminToken = () => signTestToken({ sub: 99, role: 'admin' });

describe('POST /api/activities', () => {
  it('201 y ahletId tomado del JWT (no del body)', async () => {
    repos.activity.upsertMany.mockResolvedValue({ created: 1, updated: 0 });

    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${userToken(42)}`)
      .send({
        name: 'Run',
        sportType: 'Run',
        startDateLocal: '2024-05-20T08:30',
        distance: 5000,
        movingTime: 1500,
        elapsedTime: 1500,
        // Note: intencionalmente NO enviamos athleteId
      });

    expect(res.status).toBe(201);
    expect(res.body.activity.athleteId).toBe(42);
  });

  it('400 si falta el name', async () => {
    const res = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({
        sportType: 'Run',
        startDateLocal: '2024-05-20T08:30',
        distance: 5000,
        movingTime: 1500,
        elapsedTime: 1500,
      });
    expect(res.status).toBe(400);
  });

  it('401 sin token', async () => {
    const res = await request(app).post('/api/activities').send({});
    expect(res.status).toBe(401);
  });
});

describe('GET /api/activities', () => {
  it('user solo ve las suyas (ignora athleteId del query)', async () => {
    repos.activity.findByAthleteId.mockResolvedValue([makeActivity({ athleteId: 1 })]);
    const res = await request(app)
      .get('/api/activities?athleteId=999')
      .set('Authorization', `Bearer ${userToken(1)}`);
    expect(res.status).toBe(200);
    expect(repos.activity.findByAthleteId).toHaveBeenCalledWith(1, 100);
  });

  it('admin con athleteId pide ese atleta', async () => {
    repos.activity.findByAthleteId.mockResolvedValue([]);
    const res = await request(app)
      .get('/api/activities?athleteId=7')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(repos.activity.findByAthleteId).toHaveBeenCalledWith(7, 100);
  });

  it('admin sin athleteId pide findAll', async () => {
    repos.activity.findAll.mockResolvedValue([]);
    const res = await request(app)
      .get('/api/activities')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(repos.activity.findAll).toHaveBeenCalledWith(100);
  });
});

describe('GET /api/activities/:id', () => {
  it('200 si la actividad es del propio usuario', async () => {
    repos.activity.findById.mockResolvedValue(makeActivity({ id: 5, athleteId: 1 }));
    const res = await request(app)
      .get('/api/activities/5')
      .set('Authorization', `Bearer ${userToken(1)}`);
    expect(res.status).toBe(200);
    expect(res.body.activity.id).toBe(5);
  });

  it('403 si la actividad es de otro usuario (y soy user)', async () => {
    repos.activity.findById.mockResolvedValue(makeActivity({ id: 5, athleteId: 999 }));
    const res = await request(app)
      .get('/api/activities/5')
      .set('Authorization', `Bearer ${userToken(1)}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('404 si no existe', async () => {
    repos.activity.findById.mockResolvedValue(null);
    const res = await request(app)
      .get('/api/activities/123')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(404);
  });
});
