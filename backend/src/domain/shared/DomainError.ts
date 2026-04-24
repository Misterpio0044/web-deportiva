export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'No autorizado') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Acceso denegado') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string) {
    super(`${resource} no encontrado`, 'NOT_FOUND', 404);
  }
}
