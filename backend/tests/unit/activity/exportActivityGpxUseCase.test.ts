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
};

beforeEach(() => {
  Object.values(repo).forEach((f) => (f as any).mockReset());
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
    await expect(uc.executeOne(5, { sub: 1, role: 'user' })).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });

  it('lanza NotFoundError si no existe', async () => {
    repo.findById.mockResolvedValue(null);
    const uc = new ExportActivityGpxUseCase(repo as any);
    await expect(uc.executeOne(1, { sub: 1, role: 'user' })).rejects.toBeInstanceOf(
      NotFoundError
    );
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
