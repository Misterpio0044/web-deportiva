import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../../database/pool';
import { PgAthleteRepository } from '../../persistence/PgAthleteRepository';
import { GetMyProfileUseCase } from '../../../application/me/GetMyProfileUseCase';
import { UpdateMyProfileUseCase } from '../../../application/me/UpdateMyProfileUseCase';
import { ChangeMyPasswordUseCase } from '../../../application/me/ChangeMyPasswordUseCase';
import { authMiddleware } from '../middleware/authMiddleware';
import { UnauthorizedError } from '../../../domain/shared/DomainError';

const router = Router();

router.use(authMiddleware);

const updateProfileSchema = z
  .object({
    firstname: z.string().trim().min(1, 'El nombre es obligatorio').max(100).optional(),
    lastname: z.string().trim().min(1, 'El apellido es obligatorio').max(100).optional(),
    username: z
      .string()
      .trim()
      .min(3, 'El usuario debe tener al menos 3 caracteres')
      .max(30, 'El usuario no puede superar 30 caracteres')
      .regex(/^[a-zA-Z0-9_]+$/, 'Solo se permiten letras, números y guion bajo')
      .optional(),
    email: z.string().trim().toLowerCase().email('Email inválido').optional(),
    maxHeartrate: z.number().int().positive().max(250).optional(),
    restingHeartrate: z.number().int().positive().max(150).optional(),
    measurementPreference: z.enum(['meters', 'feet']).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'Debes enviar al menos un campo a modificar',
  });
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
  newPassword: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new UnauthorizedError();
    const athleteRepo = new PgAthleteRepository(pool);
    const useCase = new GetMyProfileUseCase(athleteRepo);
    const user = await useCase.execute(req.user.sub);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
});

router.patch('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new UnauthorizedError();
    const body = updateProfileSchema.parse(req.body);
    const athleteRepo = new PgAthleteRepository(pool);
    router.post('/password', async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) throw new UnauthorizedError();
        const body = changePasswordSchema.parse(req.body);
        const athleteRepo = new PgAthleteRepository(pool);
        const useCase = new ChangeMyPasswordUseCase(athleteRepo);
        await useCase.execute(req.user.sub, body);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    });

    const useCase = new UpdateMyProfileUseCase(athleteRepo);
    const result = await useCase.execute(req.user.sub, body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
