import { DomainError } from '../../domain/shared/DomainError';
import { ActivityStreams } from '../../domain/activity/ActivityStreams';
import { getStravaConfig } from './stravaConfig';

export interface StravaTokenResponse {
  token_type: string;
  expires_at: number; // epoch seconds
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete?: StravaAthletePayload;
}

export interface StravaGearSummary {
  id: string;
  primary: boolean;
  name: string;
  distance: number; // metros
  resource_state: number;
}

export interface StravaAthletePayload {
  id: number;
  username?: string;
  firstname?: string;
  lastname?: string;
  city?: string;
  country?: string;
  sex?: string;
  profile_medium?: string;
  profile?: string;
  weight?: number;
  measurement_preference?: string;
  shoes?: StravaGearSummary[];
}

export interface StravaActivitySummary {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  utc_offset: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed?: number;
  max_speed?: number;
  average_cadence?: number;
  has_heartrate: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  average_temp?: number;
  suffer_score?: number;
  calories?: number;
  trainer: boolean;
  commute: boolean;
  device_name?: string;
  description?: string;
  gear_id?: string | null;
  start_latlng?: [number, number] | null;
  end_latlng?: [number, number] | null;
}

/**
 * Respuesta cruda de GET /activities/{id}/streams con `key_by_type=true`.
 * Cada clave presente trae sus datos alineados por índice con el resto.
 */
export interface StravaStreamSet {
  time?: { data: number[] };
  latlng?: { data: [number, number][] };
  altitude?: { data: number[] };
  heartrate?: { data: number[] };
  cadence?: { data: number[] };
}

/**
 * Normaliza la respuesta de streams de Strava a nuestra forma de almacenamiento.
 * Si no hay traza GPS (latlng vacío o ausente) marca `hasGps: false`.
 */
export function normalizeStravaStreams(raw: StravaStreamSet | null): ActivityStreams {
  const fetchedAt = new Date().toISOString();
  const latlng = raw?.latlng?.data;
  if (!latlng || latlng.length === 0) {
    return { fetchedAt, hasGps: false };
  }
  return {
    fetchedAt,
    hasGps: true,
    latlng,
    time: raw?.time?.data,
    altitude: raw?.altitude?.data,
    heartrate: raw?.heartrate?.data,
    cadence: raw?.cadence?.data,
  };
}

export class StravaApiError extends DomainError {
  constructor(message: string, code: string, httpStatus: number) {
    super(message, code, httpStatus);
  }
}

async function parseError(res: Response, fallback: string): Promise<StravaApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // ignore
  }
  if (res.status === 429) {
    return new StravaApiError(
      'Límite de peticiones a Strava alcanzado, inténtalo más tarde',
      'STRAVA_RATE_LIMIT',
      429
    );
  }
  if (res.status === 401) {
    return new StravaApiError('Token de Strava inválido o expirado', 'STRAVA_UNAUTHORIZED', 401);
  }
  const detail =
    body && typeof body === 'object' && 'message' in body
      ? String((body as { message: unknown }).message)
      : res.statusText;
  return new StravaApiError(`${fallback}: ${detail}`, 'STRAVA_API_ERROR', 502);
}

export class StravaApiClient {
  private readonly cfg = getStravaConfig();

  async exchangeCode(code: string): Promise<StravaTokenResponse> {
    const res = await fetch(this.cfg.STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.cfg.STRAVA_CLIENT_ID,
        client_secret: this.cfg.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) throw await parseError(res, 'Fallo al intercambiar el código de Strava');
    return (await res.json()) as StravaTokenResponse;
  }

  async refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
    const res = await fetch(this.cfg.STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.cfg.STRAVA_CLIENT_ID,
        client_secret: this.cfg.STRAVA_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) throw await parseError(res, 'Fallo al refrescar el token de Strava');
    return (await res.json()) as StravaTokenResponse;
  }

  async getAthlete(accessToken: string): Promise<StravaAthletePayload> {
    const res = await fetch(`${this.cfg.STRAVA_API_BASE}/athlete`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw await parseError(res, 'Fallo al obtener el atleta de Strava');
    return (await res.json()) as StravaAthletePayload;
  }

  async listActivities(
    accessToken: string,
    opts: { perPage?: number; page?: number; after?: number } = {}
  ): Promise<StravaActivitySummary[]> {
    const params = new URLSearchParams();
    params.set('per_page', String(opts.perPage ?? 30));
    if (opts.page) params.set('page', String(opts.page));
    if (opts.after) params.set('after', String(opts.after));
    const res = await fetch(`${this.cfg.STRAVA_API_BASE}/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw await parseError(res, 'Fallo al listar actividades de Strava');
    return (await res.json()) as StravaActivitySummary[];
  }

  /**
   * Descarga los streams de una actividad y los devuelve normalizados.
   * Devuelve `null` si la actividad ya no existe en Strava (404). Otros errores
   * (incluido 429 rate limit) se propagan como StravaApiError para que el
   * llamante decida cómo tolerarlos.
   */
  async getActivityStreams(
    accessToken: string,
    activityId: number
  ): Promise<ActivityStreams | null> {
    const params = new URLSearchParams();
    params.set('keys', 'time,latlng,altitude,heartrate,cadence');
    params.set('key_by_type', 'true');
    const res = await fetch(
      `${this.cfg.STRAVA_API_BASE}/activities/${activityId}/streams?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw await parseError(res, 'Fallo al obtener los streams de Strava');
    const raw = (await res.json()) as StravaStreamSet;
    return normalizeStravaStreams(raw);
  }
}
