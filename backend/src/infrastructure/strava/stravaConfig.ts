import { z } from 'zod';

const stravaEnvSchema = z.object({
  STRAVA_CLIENT_ID: z.string().min(1, 'STRAVA_CLIENT_ID es obligatorio'),
  STRAVA_CLIENT_SECRET: z.string().min(1, 'STRAVA_CLIENT_SECRET es obligatorio'),
  STRAVA_REDIRECT_URI: z.string().url('STRAVA_REDIRECT_URI debe ser una URL válida'),
  STRAVA_AUTH_URL: z.string().url().default('https://www.strava.com/oauth/authorize'),
  STRAVA_TOKEN_URL: z.string().url().default('https://www.strava.com/api/v3/oauth/token'),
  STRAVA_API_BASE: z.string().url().default('https://www.strava.com/api/v3'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
});

export type StravaConfig = z.infer<typeof stravaEnvSchema>;

let cached: StravaConfig | null = null;

export function getStravaConfig(): StravaConfig {
  if (cached) return cached;
  const parsed = stravaEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`[Strava] Configuración inválida: ${message}`);
  }
  cached = parsed.data;
  return cached;
}

export const STRAVA_DEFAULT_SCOPES = 'read,activity:read_all,profile:read_all';
