import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../../domain/shared/DomainError';

export interface JwtPayload {
  sub: number;
  email: string;
  role: 'admin' | 'user';
  firstname: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token de autenticación requerido');
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    next(new Error('JWT_SECRET not configured'));
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as unknown as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw new UnauthorizedError('Token inválido o expirado');
  }
}
