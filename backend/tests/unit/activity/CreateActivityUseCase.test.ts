import { describe, it, expect } from 'vitest';
import { CreateActivityUseCase } from '../../../src/application/activity/CreateActivityUseCase';
import { createFakeActivityRepo } from '../../_helpers/fakeActivityRepo';

describe('CreateActivityUseCase', () => {
  it('crea una actividad con ID negativo y averageSpeed calculado', async () => {
    const repo = createFakeActivityRepo();
    (repo.upsertMany as any).mockResolvedValue({ created: 1, updated: 0 });

    const result = await new CreateActivityUseCase(repo).execute({
      athleteId: 1,
      name: 'Run',
      sportType: 'Run',
      startDateLocal: '2024-05-20T08:30',
      distance: 5000,
      movingTime: 1500,
      elapsedTime: 1500,
    });

    expect(result.id).toBeLessThan(0);
    expect(result.athleteId).toBe(1);
    expect(result.averageSpeed).toBeCloseTo(5000 / 1500);
    expect(result.hasHeartrate).toBe(false);
    expect(repo.upsertMany).toHaveBeenCalledTimes(1);
  });

  it('marca hasHeartrate=true si llega averageHeartrate', async () => {
    const repo = createFakeActivityRepo();
    (repo.upsertMany as any).mockResolvedValue({ created: 1, updated: 0 });
    const result = await new CreateActivityUseCase(repo).execute({
      athleteId: 1,
      name: 'Run',
      sportType: 'Run',
      startDateLocal: '2024-05-20T08:30',
      distance: 5000,
      movingTime: 1500,
      elapsedTime: 1500,
      averageHeartrate: 150,
    });
    expect(result.hasHeartrate).toBe(true);
    expect(result.averageHeartrate).toBe(150);
  });

  it('eleva elapsedTime para que sea >= movingTime', async () => {
    const repo = createFakeActivityRepo();
    (repo.upsertMany as any).mockResolvedValue({ created: 1, updated: 0 });
    const result = await new CreateActivityUseCase(repo).execute({
      athleteId: 1,
      name: 'Run',
      sportType: 'Run',
      startDateLocal: '2024-05-20T08:30',
      distance: 1000,
      movingTime: 600,
      elapsedTime: 300, // intencionalmente menor
    });
    expect(result.elapsedTime).toBeGreaterThanOrEqual(result.movingTime);
  });

  it('interpreta fecha sin TZ como UTC', async () => {
    const repo = createFakeActivityRepo();
    (repo.upsertMany as any).mockResolvedValue({ created: 1, updated: 0 });
    const result = await new CreateActivityUseCase(repo).execute({
      athleteId: 1,
      name: 'Run',
      sportType: 'Run',
      startDateLocal: '2024-05-20T08:30',
      distance: 1000,
      movingTime: 600,
      elapsedTime: 600,
    });
    expect(result.startDateLocal.toISOString()).toBe('2024-05-20T08:30:00.000Z');
  });

  it('lanza si la fecha es inválida', async () => {
    const repo = createFakeActivityRepo();
    await expect(
      new CreateActivityUseCase(repo).execute({
        athleteId: 1,
        name: 'Run',
        sportType: 'Run',
        startDateLocal: 'not-a-date',
        distance: 1000,
        movingTime: 600,
        elapsedTime: 600,
      })
    ).rejects.toThrow('Fecha de inicio inválida');
  });

  it('asigna nombre por defecto si llega vacío', async () => {
    const repo = createFakeActivityRepo();
    (repo.upsertMany as any).mockResolvedValue({ created: 1, updated: 0 });
    const result = await new CreateActivityUseCase(repo).execute({
      athleteId: 1,
      name: '   ',
      sportType: 'Run',
      startDateLocal: '2024-05-20T08:30',
      distance: 1000,
      movingTime: 600,
      elapsedTime: 600,
    });
    expect(result.name).toBe('Actividad sin nombre');
  });
});
