import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';

// Shared mock instances accessible from the factories below via hoisting
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

describe('POST /api/auth/login', () => {
  it('200 con credenciales correctas', async () => {
    const passwordHash = await bcrypt.hash('Secret123', 4);
    repos.athlete.findByEmail.mockResolvedValue(makeAthlete({ passwordHash }));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@example.com', password: 'Secret123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('ana@example.com');
  });

  it('401 con email inexistente', async () => {
    repos.athlete.findByEmail.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'x@x.com', password: 'whatever' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('400 con email inválido (Zod)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/register', () => {
  it('201 happy path', async () => {
    repos.athlete.findByEmail.mockResolvedValue(null);
    repos.athlete.findByUsername.mockResolvedValue(null);
    repos.athlete.create.mockImplementation(async (i: any) => makeAthlete({ ...i, id: 99 }));

    const res = await request(app).post('/api/auth/register').send({
      firstname: 'Ana',
      lastname: 'Runner',
      username: 'ana',
      email: 'ana@example.com',
      password: 'Secret1',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.id).toBe(99);
  });

  it('409 si el email ya existe', async () => {
    repos.athlete.findByEmail.mockResolvedValue(makeAthlete());
    repos.athlete.findByUsername.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/register').send({
      firstname: 'Ana',
      lastname: 'Runner',
      username: 'ana',
      email: 'ana@example.com',
      password: 'Secret1',
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });

  it('400 si la password no tiene número', async () => {
    const res = await request(app).post('/api/auth/register').send({
      firstname: 'Ana',
      lastname: 'Runner',
      username: 'ana',
      email: 'ana@example.com',
      password: 'noNumbers',
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/auth/me', () => {
  it('200 con token válido', async () => {
    const token = signTestToken({ sub: 1 });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.sub).toBe(1);
  });

  it('401 sin token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('401 con token inválido', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.jwt.token');
    expect(res.status).toBe(401);
  });
});
