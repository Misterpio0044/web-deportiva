import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../../database/pool';
import { PgAthleteRepository } from '../../persistence/PgAthleteRepository';
import { PgActivityRepository } from '../../persistence/PgActivityRepository';
import { GetAthleteDashboardUseCase } from '../../../application/dashboard/GetAthleteDashboardUseCase';
import { GetGlobalDashboardUseCase } from '../../../application/dashboard/GetGlobalDashboardUseCase';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activityRepo = new PgActivityRepository(pool);
    const athleteRepo = new PgAthleteRepository(pool);

    // Admin can query global or a specific athlete's dashboard
    if (req.user!.role === 'admin') {
      const rawId = Array.isArray(req.query.athleteId) ? req.query.athleteId[0] : req.query.athleteId;
      const targetAthleteId = rawId ? parseInt(rawId as string, 10) : null;

      if (targetAthleteId) {
        const useCase = new GetAthleteDashboardUseCase(activityRepo, athleteRepo);
        const data = await useCase.execute(targetAthleteId);
        res.status(200).json(data);
      } else {
        const useCase = new GetGlobalDashboardUseCase(activityRepo);
        const data = await useCase.execute();
        res.status(200).json(data);
      }
    } else {
      // User: always their own dashboard
      const useCase = new GetAthleteDashboardUseCase(activityRepo, athleteRepo);
      const data = await useCase.execute(req.user!.sub);
      res.status(200).json(data);
    }
  } catch (err) {
    next(err);
  }
});

export default router;
