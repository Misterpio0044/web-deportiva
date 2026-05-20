import jwt from 'jsonwebtoken';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../domain/shared/DomainError';
import { AthleteRepository } from '../../domain/athlete/AthleteRepository';
import { Athlete } from '../../domain/athlete/Athlete';
import { StravaApiClient } from '../../infrastructure/strava/StravaApiClient';
import { SyncStravaUseCase } from './SyncStravaUseCase';

export interface HandleCallbackInput {
  code: string;
  state: string;
  scope?: string;
}

export interface HandleCallbackOutput {
  token: string;
  user: {
    id: number;
    email: string | null;
    role: 'admin' | 'user';
    firstname: string;
    lastname: string;
  };
  firstSyncFailed: boolean;
  activitiesSynced: number;
  isNewAccount: boolean;
}

interface StatePayload {
  nonce: string;
  linkAthleteId: number | null;
}

function signAppJwt(athlete: Athlete): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign(
    {
      sub: athlete.id,
      email: athlete.email,
      role: athlete.role,
      firstname: athlete.firstname,
    },
    secret,
    { expiresIn: '8h' }
  );
}

export class HandleStravaCallbackUseCase {
  constructor(
    private readonly athleteRepo: AthleteRepository,
    private readonly stravaClient: StravaApiClient,
    private readonly syncStrava: SyncStravaUseCase
  ) {}

  async execute(input: HandleCallbackInput): Promise<HandleCallbackOutput> {
    // 1. Verificar state (CSRF + linkAthleteId)
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    let statePayload: StatePayload;
    try {
      statePayload = jwt.verify(input.state, secret) as unknown as StatePayload;
    } catch {
      throw new UnauthorizedError('State de OAuth inválido o expirado');
    }

    // 2. Intercambiar code → tokens
    const tokenRes = await this.stravaClient.exchangeCode(input.code);
    if (!tokenRes.athlete?.id) {
      throw new UnauthorizedError('Respuesta de Strava sin atleta');
    }
    const stravaAthlete = tokenRes.athlete;
    const expiresAt = new Date(tokenRes.expires_at * 1000);
    const scope = input.scope ?? '';

    // 3. Resolver atleta destino
    let athlete: Athlete;
    let isNewAccount = false;
    let wasFirstLink = false;

    if (statePayload.linkAthleteId) {
      // Flujo LINK: vincular Strava a una cuenta local existente
      const local = await this.athleteRepo.findById(statePayload.linkAthleteId);
      if (!local) throw new NotFoundError('Atleta');

      const conflicting = await this.athleteRepo.findByStravaId(stravaAthlete.id);
      if (conflicting && conflicting.id !== local.id) {
        throw new ConflictError('Esta cuenta de Strava ya está vinculada a otro usuario');
      }

      wasFirstLink = !local.stravaId;
      await this.athleteRepo.linkStravaAccount(local.id, {
        stravaId: stravaAthlete.id,
        accessToken: tokenRes.access_token,
        refreshToken: tokenRes.refresh_token,
        tokenExpiresAt: expiresAt,
        scope,
      });
      const reloaded = await this.athleteRepo.findById(local.id);
      if (!reloaded) throw new NotFoundError('Atleta');
      athlete = reloaded;
    } else {
      // Flujo LOGIN con Strava: SOLO permitido si ya existe un atleta vinculado.
      // No se crean cuentas automáticamente desde Strava: el usuario debe
      // registrarse primero en la app y luego vincular su cuenta.
      const existing = await this.athleteRepo.findByStravaId(stravaAthlete.id);
      if (!existing) {
        throw new UnauthorizedError(
          'Esta cuenta de Strava no está vinculada. Regístrate primero y vincúlala desde el dashboard.'
        );
      }
      await this.athleteRepo.updateStravaTokens(existing.id, {
        accessToken: tokenRes.access_token,
        refreshToken: tokenRes.refresh_token,
        tokenExpiresAt: expiresAt,
        scope,
      });
      wasFirstLink = !existing.lastStravaSyncAt;
      const reloaded = await this.athleteRepo.findById(existing.id);
      if (!reloaded) throw new NotFoundError('Atleta');
      athlete = reloaded;
    }

    // 4. Emitir JWT de la app
    const appToken = signAppJwt(athlete);

    // 5. Efecto Wow: primer sync automático en la primera conexión.
    //    Si falla, NO bloquea el callback; reportamos firstSyncFailed=true.
    let firstSyncFailed = false;
    let activitiesSynced = 0;
    if (wasFirstLink) {
      try {
        const result = await this.syncStrava.execute({ athleteId: athlete.id });
        activitiesSynced = result.activitiesSynced;
      } catch (err) {
        firstSyncFailed = true;
        console.error('[Strava] Primer sync falló:', err);
      }
    }

    return {
      token: appToken,
      user: {
        id: athlete.id,
        email: athlete.email,
        role: athlete.role,
        firstname: athlete.firstname,
        lastname: athlete.lastname,
      },
      firstSyncFailed,
      activitiesSynced,
      isNewAccount,
    };
  }
}
