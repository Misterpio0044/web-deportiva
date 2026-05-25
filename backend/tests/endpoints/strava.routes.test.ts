import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const repos = vi.hoisted(() => ({
  athlete: {
    findById: vi.fn(),
    findByStravaId: vi.fn(),
    updateStravaTokens: vi.fn(),
    linkStravaAccount: vi.fn(),
    unlinkStravaAccount: vi.fn(),
    updateStravaProfile: vi.fn(),
    recordSyncSuccess: vi.fn(),
    recordSyncError: vi.fn(),
  },
  activity: {
    upsertMany: vi.fn(),
  },
  strava: {
    exchangeCode: vi.fn(),
    refreshAccessToken: vi.fn(),
    getAthlete: vi.fn(),
    listActivities: vi.fn(),
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
vi.mock('../../src/infrastructure/strava/StravaApiClient', async () => {
  const actual = await vi.importActual<
    typeof import('../../src/infrastructure/strava/StravaApiClient')
  >('../../src/infrastructure/strava/StravaApiClient');
  return {
    ...actual,
    StravaApiClient: class {
      constructor() {
        return repos.strava;
      }
    },
  };
});

import app from '../../src/infrastructure/app';
import { makeAthlete } from '../_helpers/fixtures';
import { signTestToken } from '../_helpers/signToken';

beforeEach(() => {
  Object.values(repos.athlete).forEach((fn) => (fn as any).mockReset());
  Object.values(repos.activity).forEach((fn) => (fn as any).mockReset());
  Object.values(repos.strava).forEach((fn) => (fn as any).mockReset());
});

describe('GET /api/auth/strava/authorize', () => {
  it('302 redirige a strava.com con state firmado', async () => {
    const res = await request(app).get('/api/auth/strava/authorize');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('strava.com/oauth/authorize');
    expect(res.headers.location).toContain('client_id=123456');
  });

  it('?link=1 sin token → 401', async () => {
    const res = await request(app).get('/api/auth/strava/authorize?link=1');
    expect(res.status).toBe(401);
  });

  it('?link=1 con token → 302 e incluye linkAthleteId en el state', async () => {
    const token = signTestToken({ sub: 42 });
    const res = await request(app).get(`/api/auth/strava/authorize?link=1&token=${token}`);
    expect(res.status).toBe(302);
    const url = new URL(res.headers.location);
    const state = url.searchParams.get('state')!;
    const decoded = jwt.verify(state, process.env.JWT_SECRET!) as any;
    expect(decoded.linkAthleteId).toBe(42);
  });
});

describe('GET /api/auth/strava/callback', () => {
  it('state inválido → redirige a frontend con #error=', async () => {
    const res = await request(app).get('/api/auth/strava/callback?code=abc&state=invalid');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/auth/strava/return#error=');
  });

  it('query.error → redirige a frontend con #error=', async () => {
    const res = await request(app).get('/api/auth/strava/callback?error=access_denied');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('#error=access_denied');
  });
});

describe('POST /api/strava/sync', () => {
  it('200 si el atleta está vinculado', async () => {
    repos.athlete.findById.mockResolvedValue(
      makeAthlete({
        id: 1,
        stravaId: 555,
        stravaAccessToken: 'a',
        stravaRefreshToken: 'r',
        stravaTokenExpiresAt: new Date(Date.now() + 3600_000),
      })
    );
    repos.strava.getAthlete.mockResolvedValue({ id: 555, firstname: 'A', lastname: 'B' });
    repos.strava.listActivities.mockResolvedValue([]);
    repos.activity.upsertMany.mockResolvedValue({ created: 0, updated: 0 });

    const res = await request(app)
      .post('/api/strava/sync')
      .set('Authorization', `Bearer ${signTestToken({ sub: 1 })}`);

    expect(res.status).toBe(200);
    expect(res.body.activitiesSynced).toBe(0);
  });

  it('401 sin token', async () => {
    const res = await request(app).post('/api/strava/sync');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/strava/disconnect', () => {
  it('200 desvincula', async () => {
    repos.athlete.findById.mockResolvedValue(makeAthlete({ id: 1, stravaId: 555 }));
    const res = await request(app)
      .post('/api/strava/disconnect')
      .set('Authorization', `Bearer ${signTestToken({ sub: 1 })}`);
    expect(res.status).toBe(200);
    expect(repos.athlete.unlinkStravaAccount).toHaveBeenCalledWith(1);
  });
});

describe('GET /api/strava/status', () => {
  it('200 cuenta vinculada', async () => {
    repos.athlete.findById.mockResolvedValue(
      makeAthlete({ id: 1, stravaId: 555, stravaScope: 'read' })
    );
    const res = await request(app)
      .get('/api/strava/status')
      .set('Authorization', `Bearer ${signTestToken({ sub: 1 })}`);
    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.stravaId).toBe(555);
  });

  it('200 cuenta sin vincular', async () => {
    repos.athlete.findById.mockResolvedValue(makeAthlete({ id: 1, stravaId: undefined }));
    const res = await request(app)
      .get('/api/strava/status')
      .set('Authorization', `Bearer ${signTestToken({ sub: 1 })}`);
    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(false);
  });
});
