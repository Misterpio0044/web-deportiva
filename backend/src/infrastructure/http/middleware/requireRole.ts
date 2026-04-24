import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../../../domain/shared/DomainError';

export function requireRole(role: 'admin' | 'user') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError());
      return;
    }
    if (req.user.role !== role) {
      next(new ForbiddenError('Se requiere rol de administrador'));
      return;
    }
    next();
  };
}
