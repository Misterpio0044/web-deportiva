import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createRequire } from 'node:module';
import { pool } from '../../database/pool';
import { PgActivityRepository } from '../../persistence/PgActivityRepository';
import { authMiddleware } from '../middleware/authMiddleware';
import { ForbiddenError } from '../../../domain/shared/DomainError';
import { CreateActivityUseCase } from '../../../application/activity/CreateActivityUseCase';
import { ExportActivityGpxUseCase } from '../../../application/activity/ExportActivityGpxUseCase';

// archiver v8 cambió la API: el módulo ya no es una función invocable, expone
// constructores nombrados. Usamos createRequire para evitar problemas de interop
// ESM/CJS bajo tsx y bajo el loader de Vitest.
const requireCjs = createRequire(import.meta.url);
const archiverMod = requireCjs('archiver') as typeof import('archiver');
const { ZipArchive } = archiverMod;

const router = Router();

router.use(authMiddleware);

const createActivitySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(200),
  sportType: z.string().min(1).max(50),
  startDateLocal: z.string().min(1),
  timezone: z.string().optional(),
  distance: z.number().nonnegative(),
  movingTime: z.number().int().positive(),
  elapsedTime: z.number().int().positive(),
  totalElevationGain: z.number().nonnegative().optional(),
  averageHeartrate: z.number().positive().optional(),
  maxHeartrate: z.number().positive().optional(),
  averageCadence: z.number().nonnegative().optional(),
  maxSpeed: z.number().nonnegative().optional(),
  averageTemp: z.number().optional(),
  sufferScore: z.number().min(0).max(100).optional(),
  calories: z.number().nonnegative().optional(),
  description: z.string().max(2000).optional(),
  trainer: z.boolean().optional(),
  commute: z.boolean().optional(),
  deviceName: z.string().max(100).optional(),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createActivitySchema.parse(req.body);
    const activityRepo = new PgActivityRepository(pool);
    const useCase = new CreateActivityUseCase(activityRepo);
    const activity = await useCase.execute({
      ...parsed,
      athleteId: req.user!.sub,
    });
    res.status(201).json({ activity });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activityRepo = new PgActivityRepository(pool);
    const rawAthleteId = Array.isArray(req.query.athleteId)
      ? String(req.query.athleteId[0])
      : (req.query.athleteId as string | undefined);
    const requestedAthleteId = rawAthleteId ? parseInt(rawAthleteId, 10) : null;

    if (req.user!.role === 'user') {
      // Users can only see their own activities
      const activities = await activityRepo.findByAthleteId(req.user!.sub, 100);
      res.status(200).json({ activities });
      return;
    }

    // Admin: can query any athlete or all
    if (requestedAthleteId) {
      const activities = await activityRepo.findByAthleteId(requestedAthleteId, 100);
      res.status(200).json({ activities });
    } else {
      const activities = await activityRepo.findAll(100);
      res.status(200).json({ activities });
    }
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activityRepo = new PgActivityRepository(pool);
    const activityId = parseInt(String(req.params.id), 10);
    const activity = await activityRepo.findById(activityId);

    if (!activity) {
      res.status(404).json({ message: 'Actividad no encontrada' });
      return;
    }

    // Users can only see their own activities
    if (req.user!.role === 'user' && activity.athleteId !== req.user!.sub) {
      throw new ForbiddenError();
    }

    res.status(200).json({ activity });
  } catch (err) {
    next(err);
  }
});

// ─── Exportación a GPX ──────────────────────────────────────────────────────

router.get('/:id/gpx', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activityRepo = new PgActivityRepository(pool);
    const useCase = new ExportActivityGpxUseCase(activityRepo);
    const activityId = parseInt(String(req.params.id), 10);
    if (Number.isNaN(activityId)) {
      res.status(400).json({ message: 'Id de actividad inválido', code: 'BAD_REQUEST' });
      return;
    }
    const result = await useCase.executeOne(activityId, {
      sub: req.user!.sub,
      role: req.user!.role,
    });
    res.setHeader('Content-Type', 'application/gpx+xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.status(200).send(result.xml);
  } catch (err) {
    next(err);
  }
});

const exportManySchema = z.object({
  ids: z
    .array(z.number().int())
    .min(1, 'Selecciona al menos una actividad')
    .max(200, 'Máximo 200 actividades por exportación'),
});

router.post('/export/gpx', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = exportManySchema.parse(req.body);
    const activityRepo = new PgActivityRepository(pool);
    const useCase = new ExportActivityGpxUseCase(activityRepo);
    const exports = await useCase.executeMany(ids, {
      sub: req.user!.sub,
      role: req.user!.role,
    });

    if (exports.length === 0) {
      res.status(404).json({
        message: 'No hay actividades exportables en la selección',
        code: 'NOT_FOUND',
      });
      return;
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="actividades.zip"');

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on('error', (err) => next(err));
    archive.pipe(res);
    for (const e of exports) {
      archive.append(e.xml, { name: e.filename });
    }
    await archive.finalize();
  } catch (err) {
    next(err);
  }
});

export default router;
