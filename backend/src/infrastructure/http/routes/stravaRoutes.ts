import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../../database/pool';
import { PgAthleteRepository } from '../../persistence/PgAthleteRepository';
import { PgActivityRepository } from '../../persistence/PgActivityRepository';
import { StravaApiClient } from '../../strava/StravaApiClient';
import { getStravaConfig } from '../../strava/stravaConfig';
import { BuildStravaAuthorizeUrlUseCase } from '../../../application/strava/BuildStravaAuthorizeUrlUseCase';
import { HandleStravaCallbackUseCase } from '../../../application/strava/HandleStravaCallbackUseCase';
import { SyncStravaUseCase } from '../../../application/strava/SyncStravaUseCase';
import { DisconnectStravaUseCase } from '../../../application/strava/DisconnectStravaUseCase';
import { authMiddleware } from '../middleware/authMiddleware';
import { UnauthorizedError, NotFoundError } from '../../../domain/shared/DomainError';

function buildDeps() {
  const athleteRepo = new PgAthleteRepository(pool);
  const activityRepo = new PgActivityRepository(pool);
  const stravaClient = new StravaApiClient();
  const syncUseCase = new SyncStravaUseCase(athleteRepo, activityRepo, stravaClient);
  return { athleteRepo, activityRepo, stravaClient, syncUseCase };
}

const callbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  scope: z.string().optional(),
});

// ─── /api/auth/strava (OAuth flow) ───────────────────────────────────────────
export const stravaAuthRouter = Router();

stravaAuthRouter.get('/authorize', (req: Request, res: Response, next: NextFunction) => {
  try {
    const wantsLink = req.query.link === '1';
    let linkAthleteId: number | undefined;
    if (wantsLink) {
      const authHeader = req.headers.authorization;
      const tokenFromQuery = typeof req.query.token === 'string' ? req.query.token : null;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : tokenFromQuery;
      if (!token) throw new UnauthorizedError('Falta token de sesión para vincular Strava');
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET not configured');
      try {
        const payload = jwt.verify(token, secret) as unknown as { sub: number };
        linkAthleteId = payload.sub;
      } catch {
        throw new UnauthorizedError('Token de sesión inválido');
      }
    }
    const url = new BuildStravaAuthorizeUrlUseCase().execute({ linkAthleteId });
    res.redirect(302, url);
  } catch (err) {
    next(err);
  }
});

stravaAuthRouter.get('/callback', async (req: Request, res: Response) => {
  const cfg = getStravaConfig();
  try {
    if (typeof req.query.error === 'string') {
      const reason = encodeURIComponent(req.query.error);
      res.redirect(302, `${cfg.FRONTEND_URL}/login?stravaError=${reason}`);
      return;
    }
    const parsed = callbackSchema.parse(req.query);
    const { athleteRepo, stravaClient, syncUseCase } = buildDeps();
    const useCase = new HandleStravaCallbackUseCase(athleteRepo, stravaClient, syncUseCase);
    const result = await useCase.execute(parsed);

    const payload = {
      token: result.token,
      user: result.user,
      firstSyncFailed: result.firstSyncFailed,
      activitiesSynced: result.activitiesSynced,
      isNewAccount: result.isNewAccount,
    };
    const encoded = encodeURIComponent(JSON.stringify(payload));
    res.redirect(302, `${cfg.FRONTEND_URL}/auth/strava/return#payload=${encoded}`);
  } catch (err) {
    console.error('[Strava callback]', err);
    const reason = err instanceof Error ? encodeURIComponent(err.message) : 'unknown_error';
    res.redirect(302, `${cfg.FRONTEND_URL}/login?stravaError=${reason}`);
  }
});

// ─── /api/strava (acciones autenticadas) ─────────────────────────────────────
export const stravaActionRouter = Router();
stravaActionRouter.use(authMiddleware);

stravaActionRouter.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { athleteRepo } = buildDeps();
    const athlete = await athleteRepo.findById(req.user.sub);
    if (!athlete) throw new NotFoundError('Atleta');
    res.json({
      connected: Boolean(athlete.stravaId),
      stravaId: athlete.stravaId ?? null,
      scope: athlete.stravaScope ?? null,
      lastSyncAt: athlete.lastStravaSyncAt ?? null,
      lastSyncStatus: athlete.lastStravaSyncStatus ?? null,
      lastSyncError: athlete.lastStravaSyncError ?? null,
      lastSyncCreated: athlete.lastStravaSyncCreated ?? null,
      lastSyncUpdated: athlete.lastStravaSyncUpdated ?? null,
    });
  } catch (err) {
    next(err);
  }
});

stravaActionRouter.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { athleteRepo, activityRepo, stravaClient } = buildDeps();
    const useCase = new SyncStravaUseCase(athleteRepo, activityRepo, stravaClient);
    const result = await useCase.execute({ athleteId: req.user.sub });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

stravaActionRouter.post('/disconnect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { athleteRepo } = buildDeps();
    const useCase = new DisconnectStravaUseCase(athleteRepo);
    await useCase.execute(req.user.sub);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
