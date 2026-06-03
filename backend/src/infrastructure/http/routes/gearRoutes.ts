import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../../database/pool';
import { PgGearRepository } from '../../persistence/PgGearRepository';
import { GetGearStatsUseCase } from '../../../application/gear/GetGearStatsUseCase';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/gear/stats
 *   ?athleteId=<id>   → admin: stats de un atleta concreto
 *   ?scope=global      → admin: stats globales de todos los atletas
 *   (sin params)       → stats del propio atleta autenticado
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gearRepo = new PgGearRepository(pool);
    const useCase = new GetGearStatsUseCase(gearRepo);

    const scopeQuery = req.query.scope as string | undefined;
    const athleteIdQuery = req.query.athleteId as string | undefined;

    let scope: 'me' | 'global' | number = 'me';
    if (scopeQuery === 'global') {
      scope = 'global';
    } else if (athleteIdQuery) {
      const parsed = parseInt(athleteIdQuery, 10);
      if (!isNaN(parsed)) scope = parsed;
    }

    const stats = await useCase.execute({
      requesterId: req.user!.sub,
      requesterRole: req.user!.role,
      scope,
    });

    res.status(200).json({ stats });
  } catch (err) {
    next(err);
  }
});

export default router;
