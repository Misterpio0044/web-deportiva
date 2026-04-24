import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../../database/pool';
import { PgActivityRepository } from '../../persistence/PgActivityRepository';
import { authMiddleware } from '../middleware/authMiddleware';
import { ForbiddenError } from '../../../domain/shared/DomainError';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activityRepo = new PgActivityRepository(pool);
    const rawAthleteId = Array.isArray(req.query.athleteId) ? String(req.query.athleteId[0]) : req.query.athleteId as string | undefined;
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
