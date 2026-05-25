import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../../database/pool';
import { PgActivityRepository } from '../../persistence/PgActivityRepository';
import { authMiddleware } from '../middleware/authMiddleware';
import { ForbiddenError } from '../../../domain/shared/DomainError';
import { CreateActivityUseCase } from '../../../application/activity/CreateActivityUseCase';

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

export default router;
