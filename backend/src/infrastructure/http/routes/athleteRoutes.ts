import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../../database/pool';
import { PgAthleteRepository } from '../../persistence/PgAthleteRepository';
import { PgActivityRepository } from '../../persistence/PgActivityRepository';
import { ListAthletesUseCase } from '../../../application/athlete/ListAthletesUseCase';
import { DeleteAthleteUseCase } from '../../../application/athlete/DeleteAthleteUseCase';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// All athlete routes require auth + admin role
router.use(authMiddleware, requireRole('admin'));

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const athleteRepo = new PgAthleteRepository(pool);
    const useCase = new ListAthletesUseCase(athleteRepo);
    const athletes = await useCase.execute();
    res.status(200).json({ athletes });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const athleteId = parseInt(String(req.params.id), 10);
    if (isNaN(athleteId)) {
      res.status(400).json({ message: 'ID de atleta inválido' });
      return;
    }
    const athleteRepo = new PgAthleteRepository(pool);
    const activityRepo = new PgActivityRepository(pool);
    const useCase = new DeleteAthleteUseCase(athleteRepo, activityRepo);
    await useCase.execute(athleteId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/role', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const athleteId = parseInt(String(req.params.id), 10);
    if (isNaN(athleteId)) {
      res.status(400).json({ message: 'ID de atleta inválido' });
      return;
    }
    const { role } = z.object({ role: z.enum(['admin', 'user']) }).parse(req.body);
    const athleteRepo = new PgAthleteRepository(pool);
    await athleteRepo.updateRole(athleteId, role);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
