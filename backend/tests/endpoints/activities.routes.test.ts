import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const repos = vi.hoisted(() => ({
  athlete: { findById: vi.fn() },
  activity: {
    findByAthleteId: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    searchActivities: vi.fn(),
    upsertMany: vi.fn(),
    getActivityStreams: vi.fn(),
    saveActivityStreams: vi.fn(),
    findActivityIdsMissingStreams: vi.fn(),
  },
}));

vi.mock('../../src/infrastructure/database/pool', () => ({ pool: {} }));
vi.mock('../../src/infrastructure/strava/StravaApiClient', () => ({
  StravaApiClient: class {
    getActivityStreams = vi.fn().mockResolvedValue(null);
  },
}));
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
    repos.activity.searchActivities.mockResolvedValue({
      items: [makeActivity({ athleteId: 1 })],
      total: 1,
    });
    const res = await request(app)
      .get('/api/activities?athleteId=999')
      .set('Authorization', `Bearer ${userToken(1)}`);
    expect(res.status).toBe(200);
    expect(repos.activity.searchActivities).toHaveBeenCalledWith(
      expect.objectContaining({ athleteId: 1 })
    );
    expect(res.body).toMatchObject({ total: 1, page: 1, limit: 20 });
  });

  it('admin con athleteId pide ese atleta', async () => {
    repos.activity.searchActivities.mockResolvedValue({ items: [], total: 0 });
    const res = await request(app)
      .get('/api/activities?athleteId=7')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(repos.activity.searchActivities).toHaveBeenCalledWith(
      expect.objectContaining({ athleteId: 7 })
    );
  });

  it('admin sin athleteId consulta el global (athleteId null)', async () => {
    repos.activity.searchActivities.mockResolvedValue({ items: [], total: 0 });
    const res = await request(app)
      .get('/api/activities')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(repos.activity.searchActivities).toHaveBeenCalledWith(
      expect.objectContaining({ athleteId: null })
    );
  });

  it('propaga paginación, orden, búsqueda y filtros del query', async () => {
    repos.activity.searchActivities.mockResolvedValue({ items: [], total: 0 });
    const res = await request(app)
      .get(
        '/api/activities?page=2&limit=10&sortBy=distance&sortDir=asc&search=trail&sportType=Run&dateFrom=2024-01-01&dateTo=2024-12-31'
      )
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(repos.activity.searchActivities).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 10,
        sortBy: 'distance',
        sortDir: 'asc',
        search: 'trail',
        sportType: 'Run',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      })
    );
  });

  it('400 si los parámetros de query son inválidos', async () => {
    const res = await request(app)
      .get('/api/activities?sortBy=invalido')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
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

describe('GET /api/activities/:id/gpx', () => {
  it('200 devuelve GPX con cabeceras correctas para el dueño', async () => {
    repos.activity.findById.mockResolvedValue(makeActivity({ id: 5, athleteId: 1 }));
    const res = await request(app)
      .get('/api/activities/5/gpx')
      .set('Authorization', `Bearer ${userToken(1)}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/gpx+xml');
    expect(res.headers['content-disposition']).toMatch(/attachment; filename=".+\.gpx"/);
    expect(res.text).toContain('<gpx');
  });

  it('403 si la actividad es de otro user', async () => {
    repos.activity.findById.mockResolvedValue(makeActivity({ id: 5, athleteId: 999 }));
    const res = await request(app)
      .get('/api/activities/5/gpx')
      .set('Authorization', `Bearer ${userToken(1)}`);
    expect(res.status).toBe(403);
  });

  it('404 si no existe', async () => {
    repos.activity.findById.mockResolvedValue(null);
    const res = await request(app)
      .get('/api/activities/5/gpx')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(404);
  });

  it('401 sin token', async () => {
    const res = await request(app).get('/api/activities/5/gpx');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/activities/export/gpx', () => {
  it('200 zip con un .gpx por actividad permitida', async () => {
    repos.activity.findById
      .mockResolvedValueOnce(makeActivity({ id: 1, athleteId: 1 }))
      .mockResolvedValueOnce(makeActivity({ id: 2, athleteId: 1 }));
    const res = await request(app)
      .post('/api/activities/export/gpx')
      .set('Authorization', `Bearer ${userToken(1)}`)
      .send({ ids: [1, 2] })
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
    expect(res.headers['content-disposition']).toContain('actividades.zip');
    // Firma PK\x03\x04 de un zip
    const body = res.body as Buffer;
    expect(body[0]).toBe(0x50);
    expect(body[1]).toBe(0x4b);
  });

  it('400 si ids está vacío', async () => {
    const res = await request(app)
      .post('/api/activities/export/gpx')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ ids: [] });
    expect(res.status).toBe(400);
  });

  it('404 si ninguna de las ids pertenece al user', async () => {
    repos.activity.findById
      .mockResolvedValueOnce(makeActivity({ id: 1, athleteId: 999 }))
      .mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/activities/export/gpx')
      .set('Authorization', `Bearer ${userToken(1)}`)
      .send({ ids: [1, 2] });
    expect(res.status).toBe(404);
  });

  it('401 sin token', async () => {
    const res = await request(app)
      .post('/api/activities/export/gpx')
      .send({ ids: [1] });
    expect(res.status).toBe(401);
  });

  // Regresión: las columnas BIGINT de Postgres llegan al frontend como strings,
  // por lo que el cliente puede reenviarlas como strings en el array de ids.
  it('200 acepta ids enviados como string', async () => {
    repos.activity.findById
      .mockResolvedValueOnce(makeActivity({ id: 1, athleteId: 1 }))
      .mockResolvedValueOnce(makeActivity({ id: 2, athleteId: 1 }));
    const res = await request(app)
      .post('/api/activities/export/gpx')
      .set('Authorization', `Bearer ${userToken(1)}`)
      .send({ ids: ['1', '2'] })
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
    expect(repos.activity.findById).toHaveBeenCalledWith(1);
    expect(repos.activity.findById).toHaveBeenCalledWith(2);
  });
});
