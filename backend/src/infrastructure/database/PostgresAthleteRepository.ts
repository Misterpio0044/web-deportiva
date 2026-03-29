import { Pool } from 'pg';
import type { Athlete } from '../../domain/models/Athlete';
import type { AthleteRepository } from '../../domain/repositories/AthleteRepository';

export class PostgresAthleteRepository implements AthleteRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Athlete | null> {
    const result = await this.pool.query<Athlete>(
      'SELECT * FROM athletes WHERE id = $1',
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByStravaId(stravaId: number): Promise<Athlete | null> {
    const result = await this.pool.query<Athlete>(
      'SELECT * FROM athletes WHERE strava_id = $1',
      [stravaId],
    );
    return result.rows[0] ?? null;
  }

  async save(athlete: Athlete): Promise<void> {
    await this.pool.query(
      `INSERT INTO athletes (
        id, strava_id, username, first_name, last_name, profile_image_url,
        city, country, access_token, refresh_token, token_expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        profile_image_url = EXCLUDED.profile_image_url,
        city = EXCLUDED.city,
        country = EXCLUDED.country,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expires_at = EXCLUDED.token_expires_at`,
      [
        athlete.id,
        athlete.stravaId,
        athlete.username,
        athlete.firstName,
        athlete.lastName,
        athlete.profileImageUrl,
        athlete.city,
        athlete.country,
        athlete.accessToken,
        athlete.refreshToken,
        athlete.tokenExpiresAt,
      ],
    );
  }
}
