import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../../database/pool';
import { PgAthleteRepository } from '../../persistence/PgAthleteRepository';
import { LoginUseCase } from '../../../application/auth/LoginUseCase';
import { RegisterUseCase } from '../../../application/auth/RegisterUseCase';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  firstname: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  lastname: z.string().trim().min(1, 'El apellido es obligatorio').max(100),
  username: z
    .string()
    .trim()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(30, 'El usuario no puede superar 30 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo se permiten letras, números y guion bajo'),
  email: z.string().trim().toLowerCase().email('Email inválido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
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

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body);
    const athleteRepo = new PgAthleteRepository(pool);
    const useCase = new RegisterUseCase(athleteRepo);
    const result = await useCase.execute(body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.status(200).json({ user: req.user });
});

export default router;
