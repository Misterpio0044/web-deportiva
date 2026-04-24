import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../../database/pool';
import { PgAthleteRepository } from '../../persistence/PgAthleteRepository';
import { LoginUseCase } from '../../../application/auth/LoginUseCase';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);
    const athleteRepo = new PgAthleteRepository(pool);
    const useCase = new LoginUseCase(athleteRepo);
    const result = await useCase.execute(body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.status(200).json({ user: req.user });
});

export default router;
