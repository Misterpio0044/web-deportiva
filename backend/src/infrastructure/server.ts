import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DomainError } from '../domain/shared/DomainError';
import authRoutes from './http/routes/authRoutes';
import athleteRoutes from './http/routes/athleteRoutes';
import activityRoutes from './http/routes/activityRoutes';
import dashboardRoutes from './http/routes/dashboardRoutes';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ─── health check ────────────────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'web-deportiva API' });
});

// ─── routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/athletes', athleteRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ─── global error handler ────────────────────────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof DomainError) {
    res.status(err.httpStatus).json({ message: err.message, code: err.code });
    return;
  }
  if (err instanceof SyntaxError) {
    res.status(400).json({ message: 'JSON inválido', code: 'BAD_REQUEST' });
    return;
  }
  console.error('[Error]', err);
  res.status(500).json({ message: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
});

app.listen(PORT, () => {
  console.log(`[Servidor]: Corriendo en http://localhost:${PORT}`);
});
