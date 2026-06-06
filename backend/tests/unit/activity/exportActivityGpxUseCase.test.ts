import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportActivityGpxUseCase } from '../../../src/application/activity/ExportActivityGpxUseCase';
import { ForbiddenError, NotFoundError } from '../../../src/domain/shared/DomainError';
import { makeActivity } from '../../_helpers/fixtures';

const repo = {
  findById: vi.fn(),
  findByAthleteId: vi.fn(),
  findAll: vi.fn(),
  getDashboardData: vi.fn(),
  getGlobalDashboardData: vi.fn(),
  deleteByAthleteId: vi.fn(),
  upsertMany: vi.fn(),
  getActivityStreams: vi.fn().mockResolvedValue(null),
  saveActivityStreams: vi.fn().mockResolvedValue(undefined),
  findActivityIdsMissingStreams: vi.fn().mockResolvedValue([]),
};

beforeEach(() => {
  Object.values(repo).forEach((f) => (f as any).mockReset());
  repo.getActivityStreams.mockResolvedValue(null);
});

describe('ExportActivityGpxUseCase.executeOne', () => {
  it('devuelve xml + filename para el dueño de la actividad', async () => {
    repo.findById.mockResolvedValue(makeActivity({ id: 5, athleteId: 1 }));
    const uc = new ExportActivityGpxUseCase(repo as any);
    const out = await uc.executeOne(5, { sub: 1, role: 'user' });
    expect(out.filename).toMatch(/\.gpx$/);
    expect(out.xml).toContain('<gpx');
  });

  it('permite a admin exportar actividad ajena', async () => {
    repo.findById.mockResolvedValue(makeActivity({ id: 5, athleteId: 999 }));
    const uc = new ExportActivityGpxUseCase(repo as any);
    const out = await uc.executeOne(5, { sub: 1, role: 'admin' });
    expect(out.activity.id).toBe(5);
  });

  it('lanza ForbiddenError si user intenta exportar actividad ajena', async () => {
    repo.findById.mockResolvedValue(makeActivity({ id: 5, athleteId: 999 }));
    const uc = new ExportActivityGpxUseCase(repo as any);
    await expect(uc.executeOne(5, { sub: 1, role: 'user' })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('lanza NotFoundError si no existe', async () => {
    repo.findById.mockResolvedValue(null);
    const uc = new ExportActivityGpxUseCase(repo as any);
    await expect(uc.executeOne(1, { sub: 1, role: 'user' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('usa los streams cacheados para generar la traza completa', async () => {
    repo.findById.mockResolvedValue(
      makeActivity({ id: 5, athleteId: 1, startLatitude: 40.4, startLongitude: -3.6 })
    );
    repo.getActivityStreams.mockResolvedValue({
      fetchedAt: '2024-05-20T10:00:00Z',
      hasGps: true,
      time: [0, 1],
      latlng: [
        [40.4, -3.6],
        [40.41, -3.61],
      ],
    });
    const uc = new ExportActivityGpxUseCase(repo as any);
    const out = await uc.executeOne(5, { sub: 1, role: 'user' });
    const matches = out.xml.match(/<trkpt /g) ?? [];
    expect(matches.length).toBe(2);
  });

  it('descarga los streams bajo demanda si no están cacheados y los persiste', async () => {
    repo.findById.mockResolvedValue(
      makeActivity({ id: 7, athleteId: 1, startLatitude: 40.4, startLongitude: -3.6 })
    );
    repo.getActivityStreams.mockResolvedValue(null);

    const athleteRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 1,
        stravaAccessToken: 'access',
        stravaRefreshToken: 'refresh',
        stravaTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
    };
    const fetched = {
      fetchedAt: '2024-05-20T10:00:00Z',
      hasGps: true,
      time: [0],
      latlng: [[40.4, -3.6]] as [number, number][],
    };
    const stravaClient = {
      getActivityStreams: vi.fn().mockResolvedValue(fetched),
    };

    const uc = new ExportActivityGpxUseCase(repo as any, athleteRepo as any, stravaClient as any);
    const out = await uc.executeOne(7, { sub: 1, role: 'user' });

    expect(stravaClient.getActivityStreams).toHaveBeenCalledWith('access', 7);
    expect(repo.saveActivityStreams).toHaveBeenCalledWith(7, fetched);
    expect(out.xml).toContain('<trkpt ');
  });

  it('cae a metadatos si Strava confirma que no hay GPS (hasGps: false)', async () => {
    repo.findById.mockResolvedValue(makeActivity({ id: 8, athleteId: 1 }));
    repo.getActivityStreams.mockResolvedValue(null);
    const stravaClient = {
      getActivityStreams: vi.fn().mockResolvedValue({ fetchedAt: 'x', hasGps: false }),
    };
    const athleteRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 1,
        stravaAccessToken: 'access',
        stravaRefreshToken: 'refresh',
        stravaTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
    };

    const uc = new ExportActivityGpxUseCase(repo as any, athleteRepo as any, stravaClient as any);
    const out = await uc.executeOne(8, { sub: 1, role: 'user' });

    // Strava confirma que no hay GPS → GPX de metadatos sin trkpt
    expect(stravaClient.getActivityStreams).toHaveBeenCalledWith('access', 8);
    expect(out.xml).not.toContain('<trkpt');
  });

  it('cae a metadatos si no hay cliente Strava disponible', async () => {
    repo.findById.mockResolvedValue(makeActivity({ id: 9, athleteId: 1 }));
    repo.getActivityStreams.mockResolvedValue(null);
    // Sin athleteRepo ni stravaClient: solo el repositorio de actividades
    const uc = new ExportActivityGpxUseCase(repo as any);
    const out = await uc.executeOne(9, { sub: 1, role: 'user' });
    expect(out.xml).not.toContain('<trkpt');
  });
});

describe('ExportActivityGpxUseCase.executeMany', () => {
  it('filtra silenciosamente las que no pertenecen al user', async () => {
    repo.findById
      .mockResolvedValueOnce(makeActivity({ id: 1, athleteId: 1 }))
      .mockResolvedValueOnce(makeActivity({ id: 2, athleteId: 999 }))
      .mockResolvedValueOnce(makeActivity({ id: 3, athleteId: 1 }));
    const uc = new ExportActivityGpxUseCase(repo as any);
    const out = await uc.executeMany([1, 2, 3], { sub: 1, role: 'user' });
    expect(out.map((e) => e.activity.id).sort()).toEqual([1, 3]);
  });

  it('desduplica nombres de fichero coincidentes', async () => {
    repo.findById
      .mockResolvedValueOnce(makeActivity({ id: 1, athleteId: 1, name: 'Run' }))
      .mockResolvedValueOnce(makeActivity({ id: 2, athleteId: 1, name: 'Run' }));
    const uc = new ExportActivityGpxUseCase(repo as any);
    const out = await uc.executeMany([1, 2], { sub: 1, role: 'user' });
    const names = out.map((e) => e.filename);
    expect(new Set(names).size).toBe(2);
  });
});
