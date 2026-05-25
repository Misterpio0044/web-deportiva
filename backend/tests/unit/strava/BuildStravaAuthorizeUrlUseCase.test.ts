import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { BuildStravaAuthorizeUrlUseCase } from '../../../src/application/strava/BuildStravaAuthorizeUrlUseCase';

describe('BuildStravaAuthorizeUrlUseCase', () => {
  it('construye URL con client_id, redirect_uri y state JWT que contiene linkAthleteId', () => {
    const url = new BuildStravaAuthorizeUrlUseCase().execute({ linkAthleteId: 42 });

    expect(url).toContain('https://www.strava.com/oauth/authorize');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('client_id')).toBe('123456');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('scope')).toContain('activity:read_all');

    const state = parsed.searchParams.get('state');
    expect(state).toBeTruthy();
    const payload = jwt.verify(state!, process.env.JWT_SECRET!) as any;
    expect(payload.linkAthleteId).toBe(42);
    expect(payload.nonce).toBeTruthy();
  });

  it('linkAthleteId opcional → null en payload', () => {
    const url = new BuildStravaAuthorizeUrlUseCase().execute({});
    const state = new URL(url).searchParams.get('state')!;
    const payload = jwt.verify(state, process.env.JWT_SECRET!) as any;
    expect(payload.linkAthleteId).toBeNull();
  });
});
