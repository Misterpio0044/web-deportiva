import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repos = vi.hoisted(() => ({
  athlete: {
    findById: vi.fn(),
    findAll: vi.fn(),
    deleteById: vi.fn(),
    updateRole: vi.fn(),
  },
  activity: {
    deleteByAthleteId: vi.fn(),
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
import { makeAthlete } from '../_helpers/fixtures';
import { signTestToken } from '../_helpers/signToken';

beforeEach(() => {
  Object.values(repos.athlete).forEach((fn) => (fn as any).mockReset());
  Object.values(repos.activity).forEach((fn) => (fn as any).mockReset());
});

const adminToken = () => signTestToken({ sub: 99, role: 'admin' });
const userToken = () => signTestToken({ sub: 1, role: 'user' });

describe('GET /api/athletes', () => {
  it('401 sin token', async () => {
    const res = await request(app).get('/api/athletes');
    expect(res.status).toBe(401);
  });

  it('403 con rol user', async () => {
    const res = await request(app)
      .get('/api/athletes')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('200 con rol admin', async () => {
    repos.athlete.findAll.mockResolvedValue([]);
    const res = await request(app)
      .get('/api/athletes')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.athletes).toEqual([]);
  });
});

describe('DELETE /api/athletes/:id', () => {
  it('204 admin elimina', async () => {
    repos.athlete.findById.mockResolvedValue(makeAthlete({ id: 5 }));
    const res = await request(app)
      .delete('/api/athletes/5')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(204);
    expect(repos.athlete.deleteById).toHaveBeenCalledWith(5);
  });

  it('400 si id no numérico', async () => {
    const res = await request(app)
      .delete('/api/athletes/abc')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });

  it('404 si no existe', async () => {
    repos.athlete.findById.mockResolvedValue(null);
    const res = await request(app)
      .delete('/api/athletes/77')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/athletes/:id/role', () => {
  it('200 admin promueve a admin', async () => {
    const res = await request(app)
      .patch('/api/athletes/5/role')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(repos.athlete.updateRole).toHaveBeenCalledWith(5, 'admin');
  });

  it('400 si role no es enum válido', async () => {
    const res = await request(app)
      .patch('/api/athletes/5/role')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ role: 'superuser' });
    expect(res.status).toBe(400);
  });
});
