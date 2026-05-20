import { AthleteRepository } from '../../domain/athlete/AthleteRepository';
import { Athlete } from '../../domain/athlete/Athlete';
import { StravaApiClient } from '../../infrastructure/strava/StravaApiClient';

/**
 * Devuelve un access_token vigente. Si el token actual está a punto de
 * expirar (≤ 60 s) o ya expiró, lo refresca contra Strava y lo persiste.
 */
export async function refreshStravaTokenIfNeeded(
  athlete: Athlete,
  athleteRepo: AthleteRepository,
  stravaClient: StravaApiClient
): Promise<string> {
  if (!athlete.stravaAccessToken || !athlete.stravaRefreshToken || !athlete.stravaTokenExpiresAt) {
    throw new Error('Athlete has no Strava tokens');
  }
  const expiresAt = new Date(athlete.stravaTokenExpiresAt).getTime();
  const nowPlusBuffer = Date.now() + 60_000;
  if (expiresAt > nowPlusBuffer) {
    return athlete.stravaAccessToken;
  }
  const refreshed = await stravaClient.refreshAccessToken(athlete.stravaRefreshToken);
  const newExpiresAt = new Date(refreshed.expires_at * 1000);
  await athleteRepo.updateStravaTokens(athlete.id, {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    tokenExpiresAt: newExpiresAt,
  });
  return refreshed.access_token;
}
