import jwt from 'jsonwebtoken';
import { getStravaConfig, STRAVA_DEFAULT_SCOPES } from '../../infrastructure/strava/stravaConfig';

export interface BuildAuthorizeUrlInput {
  linkAthleteId?: number;
}

/**
 * Construye la URL de autorización de Strava con un `state` firmado (JWT, 10 min)
 * que protege contra CSRF y transporta el `linkAthleteId` opcional para el flujo
 * de vinculación a una cuenta local existente.
 */
export class BuildStravaAuthorizeUrlUseCase {
  execute(input: BuildAuthorizeUrlInput): string {
    const cfg = getStravaConfig();
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const state = jwt.sign(
      {
        nonce: Math.random().toString(36).slice(2),
        linkAthleteId: input.linkAthleteId ?? null,
      },
      secret,
      { expiresIn: '10m' }
    );

    const params = new URLSearchParams({
      client_id: cfg.STRAVA_CLIENT_ID,
      redirect_uri: cfg.STRAVA_REDIRECT_URI,
      response_type: 'code',
      approval_prompt: 'force',
      scope: STRAVA_DEFAULT_SCOPES,
      state,
    });
    return `${cfg.STRAVA_AUTH_URL}?${params}`;
  }
}
