import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../../src/infrastructure/app';

describe('GET /', () => {
  it('responde 200 con {status:"OK"}', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'OK', message: 'web-deportiva API' });
  });
});

describe('JSON parsing', () => {
  it('JSON inválido devuelve 400 BAD_REQUEST', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ this is not json');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });
});

describe('Auth-protected routes sin token', () => {
  it('GET /api/me → 401', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/athletes → 401', async () => {
    const res = await request(app).get('/api/athletes');
    expect(res.status).toBe(401);
  });
});
