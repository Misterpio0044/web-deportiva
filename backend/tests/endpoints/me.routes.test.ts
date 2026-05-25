import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repos = vi.hoisted(() => ({
  athlete: {
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
      return {};
    }
  },
}));

import app from '../../src/infrastructure/app';
import { makeAthlete } from '../_helpers/fixtures';
import { signTestToken } from '../_helpers/signToken';

beforeEach(() => {
  Object.values(repos.athlete).forEach((fn) => (fn as any).mockReset());
});

const userToken = () => signTestToken({ sub: 1, role: 'user' });

describe('GET /api/me', () => {
  it('200 devuelve el perfil sin passwordHash', async () => {
    repos.athlete.findById.mockResolvedValue(makeAthlete({ id: 1 }));
    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.email).toBe('ana@example.com');
  });

  it('401 sin token', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });

  it('404 si el atleta no existe en BD', async () => {
    repos.athlete.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /api/me', () => {
  it('200 actualizando firstname', async () => {
    const me = makeAthlete({ id: 1, firstname: 'Old' });
    repos.athlete.findById.mockResolvedValue(me);
    repos.athlete.updateProfile.mockResolvedValue(makeAthlete({ id: 1, firstname: 'New' }));

    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ firstname: 'New' });

    expect(res.status).toBe(200);
    expect(res.body.user.firstname).toBe('New');
    expect(res.body.token).toBeTruthy();
  });

  it('400 si body vacío (refine)', async () => {
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('400 si username con caracteres inválidos', async () => {
    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ username: 'has spaces!' });
    expect(res.status).toBe(400);
  });
});
