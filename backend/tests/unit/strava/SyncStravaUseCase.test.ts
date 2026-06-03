import { describe, it, expect, vi } from 'vitest';
import { SyncStravaUseCase } from '../../../src/application/strava/SyncStravaUseCase';
import { StravaApiError } from '../../../src/infrastructure/strava/StravaApiClient';
import { NotFoundError, ValidationError } from '../../../src/domain/shared/DomainError';
import { createFakeAthleteRepo } from '../../_helpers/fakeAthleteRepo';
import { createFakeActivityRepo } from '../../_helpers/fakeActivityRepo';
import { createFakeGearRepo } from '../../_helpers/fakeGearRepo';
import { makeAthlete } from '../../_helpers/fixtures';

function makeLinkedAthlete() {
  return makeAthlete({
    stravaId: 999,
    stravaAccessToken: 'access',
    stravaRefreshToken: 'refresh',
    stravaTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
}

function fakeClient(overrides: any = {}) {
  return {
    refreshAccessToken: vi.fn(),
    getAthlete: vi.fn().mockResolvedValue({
      id: 999,
      firstname: 'Ana',
      lastname: 'Runner',
      profile_medium: 'http://img',
      weight: 60,
      shoes: [
        { id: 'g1', name: 'Nike Vaporfly', primary: true, distance: 400000, resource_state: 2 },
      ],
    }),
    listActivities: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as any;
}

describe('SyncStravaUseCase', () => {
  it('NotFoundError si atleta no existe', async () => {
    const aRepo = createFakeAthleteRepo();
    const actRepo = createFakeActivityRepo();
    (aRepo.findById as any).mockResolvedValue(null);

    await expect(
      new SyncStravaUseCase(aRepo, actRepo, fakeClient()).execute({ athleteId: 1 })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('ValidationError si el atleta no está vinculado a Strava', async () => {
    const aRepo = createFakeAthleteRepo();
    const actRepo = createFakeActivityRepo();
    (aRepo.findById as any).mockResolvedValue(makeAthlete({ stravaId: undefined }));

    await expect(
      new SyncStravaUseCase(aRepo, actRepo, fakeClient()).execute({ athleteId: 1 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('happy path: actualiza perfil, upserta gear y actividades, registra sync ok', async () => {
    const aRepo = createFakeAthleteRepo();
    const actRepo = createFakeActivityRepo();
    const gearRepo = createFakeGearRepo();
    (aRepo.findById as any).mockResolvedValue(makeLinkedAthlete());
    (actRepo.upsertMany as any).mockResolvedValue({ created: 2, updated: 1 });

    const client = fakeClient({
      listActivities: vi.fn().mockResolvedValue([
        {
          id: 1,
          name: 'A',
          type: 'Run',
          sport_type: 'Run',
          start_date: '2024-01-01T00:00:00Z',
          start_date_local: '2024-01-01T00:00:00Z',
          timezone: 'UTC',
          utc_offset: 0,
          distance: 5000,
          moving_time: 1500,
          elapsed_time: 1500,
          total_elevation_gain: 50,
          has_heartrate: false,
          trainer: false,
          commute: false,
        },
      ]),
    });

    const result = await new SyncStravaUseCase(aRepo, actRepo, client, gearRepo).execute({
      athleteId: 1,
    });

    expect(result.activitiesSynced).toBe(3);
    expect(result.created).toBe(2);
    expect(result.updated).toBe(1);
    expect(result.gearSynced).toBe(1);
    expect(aRepo.updateStravaProfile).toHaveBeenCalledTimes(1);
    expect(aRepo.recordSyncSuccess).toHaveBeenCalledTimes(1);
    expect(gearRepo.upsertManyForAthlete).toHaveBeenCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({ id: 'g1', name: 'Nike Vaporfly', isPrimary: true }),
      ])
    );
  });

  it('upserta gear ANTES de las actividades para que la FK no se anule', async () => {
    const aRepo = createFakeAthleteRepo();
    const actRepo = createFakeActivityRepo();
    const gearRepo = createFakeGearRepo();
    (aRepo.findById as any).mockResolvedValue(makeLinkedAthlete());

    const callOrder: string[] = [];
    (gearRepo.upsertManyForAthlete as any).mockImplementation(async () => {
      callOrder.push('gear');
    });
    (actRepo.upsertMany as any).mockImplementation(async () => {
      callOrder.push('activities');
      return { created: 0, updated: 0 };
    });

    await new SyncStravaUseCase(aRepo, actRepo, fakeClient(), gearRepo).execute({ athleteId: 1 });

    expect(callOrder).toEqual(['gear', 'activities']);
  });

  it('si Strava devuelve UNAUTHORIZED desvincula y lanza ValidationError', async () => {
    const aRepo = createFakeAthleteRepo();
    const actRepo = createFakeActivityRepo();
    (aRepo.findById as any).mockResolvedValue(makeLinkedAthlete());
    const client = fakeClient({
      getAthlete: vi
        .fn()
        .mockRejectedValue(new StravaApiError('Token expirado', 'STRAVA_UNAUTHORIZED', 401)),
    });

    await expect(
      new SyncStravaUseCase(aRepo, actRepo, client, createFakeGearRepo()).execute({ athleteId: 1 })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(aRepo.unlinkStravaAccount).toHaveBeenCalledTimes(1);
  });

  it('si el error es otro, registra sync error y relanza', async () => {
    const aRepo = createFakeAthleteRepo();
    const actRepo = createFakeActivityRepo();
    (aRepo.findById as any).mockResolvedValue(makeLinkedAthlete());
    const client = fakeClient({
      getAthlete: vi.fn().mockRejectedValue(new Error('boom')),
    });

    await expect(
      new SyncStravaUseCase(aRepo, actRepo, client, createFakeGearRepo()).execute({ athleteId: 1 })
    ).rejects.toThrow('boom');
    expect(aRepo.recordSyncError).toHaveBeenCalledTimes(1);
  });
});
