import { Pool } from 'pg';
import {
  AthleteRepository,
  CreateAthleteInput,
  CreateAthleteFromStravaInput,
  UpdateStravaTokensInput,
  UpdateStravaProfileInput,
  UpdateProfileInput,
  RecordSyncSuccessInput,
  RecordSyncErrorInput,
} from '../../domain/athlete/AthleteRepository';
import { Athlete, AthletePublic } from '../../domain/athlete/Athlete';

function rowToAthlete(row: Record<string, unknown>): Athlete {
  return {
    id: row.id as number,
    firstname: row.firstname as string,
    lastname: row.lastname as string,
    username: row.username as string,
    email: (row.email as string | null) ?? null,
    role: row.role as 'admin' | 'user',
    passwordHash: (row.password_hash as string | null) ?? null,
    profileMediumUrl: row.profile_medium_url as string | undefined,
    profileUrl: row.profile_url as string | undefined,
    measurementPreference: row.measurement_preference as string | undefined,
    maxHeartrate: row.max_heartrate as number | undefined,
    restingHeartrate: row.resting_heartrate as number | undefined,
    weight: row.weight as number | undefined,
    stravaId: row.strava_id ? Number(row.strava_id) : undefined,
    stravaScope: (row.strava_scope as string | undefined) ?? undefined,
    stravaAccessToken: (row.strava_access_token as string | undefined) ?? undefined,
    stravaRefreshToken: (row.strava_refresh_token as string | undefined) ?? undefined,
    stravaTokenExpiresAt: (row.strava_token_expires_at as Date | undefined) ?? undefined,
    lastStravaSyncAt: (row.last_strava_sync_at as Date | undefined) ?? undefined,
    lastStravaSyncStatus:
      (row.last_strava_sync_status as 'success' | 'error' | undefined) ?? undefined,
    lastStravaSyncError: (row.last_strava_sync_error as string | undefined) ?? undefined,
    lastStravaSyncCreated:
      row.last_strava_sync_created !== null && row.last_strava_sync_created !== undefined
        ? Number(row.last_strava_sync_created)
        : undefined,
    lastStravaSyncUpdated:
      row.last_strava_sync_updated !== null && row.last_strava_sync_updated !== undefined
        ? Number(row.last_strava_sync_updated)
        : undefined,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

export class PgAthleteRepository implements AthleteRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: number): Promise<Athlete | null> {
    const { rows } = await this.pool.query('SELECT * FROM athletes WHERE id = $1', [id]);
    return rows[0] ? rowToAthlete(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Athlete | null> {
    const { rows } = await this.pool.query('SELECT * FROM athletes WHERE email = $1', [email]);
    return rows[0] ? rowToAthlete(rows[0]) : null;
  }

  async findByUsername(username: string): Promise<Athlete | null> {
    const { rows } = await this.pool.query('SELECT * FROM athletes WHERE username = $1', [
      username,
    ]);
    return rows[0] ? rowToAthlete(rows[0]) : null;
  }

  async findByStravaId(stravaId: number): Promise<Athlete | null> {
    const { rows } = await this.pool.query('SELECT * FROM athletes WHERE strava_id = $1', [
      stravaId,
    ]);
    return rows[0] ? rowToAthlete(rows[0]) : null;
  }

  async create(input: CreateAthleteInput): Promise<Athlete> {
    const { rows } = await this.pool.query(
      `INSERT INTO athletes
         (id, firstname, lastname, username, email, password_hash, role)
       VALUES
         (nextval('athletes_local_id_seq'), $1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.firstname,
        input.lastname,
        input.username,
        input.email,
        input.passwordHash,
        input.role ?? 'user',
      ]
    );
    return rowToAthlete(rows[0]);
  }

  async createFromStrava(input: CreateAthleteFromStravaInput): Promise<Athlete> {
    const { rows } = await this.pool.query(
      `INSERT INTO athletes
         (id, firstname, lastname, username, email, password_hash, role,
          profile_medium_url, profile_url, weight, measurement_preference,
          strava_id, strava_scope, strava_access_token, strava_refresh_token,
          strava_token_expires_at)
       VALUES
         (nextval('athletes_local_id_seq'), $1, $2, $3, NULL, NULL, 'user',
          $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        input.firstname,
        input.lastname,
        input.username,
        input.profileMediumUrl ?? null,
        input.profileUrl ?? null,
        input.weight ?? null,
        input.measurementPreference ?? null,
        input.stravaId,
        input.scope,
        input.accessToken,
        input.refreshToken,
        input.tokenExpiresAt,
      ]
    );
    return rowToAthlete(rows[0]);
  }

  async updateStravaTokens(athleteId: number, input: UpdateStravaTokensInput): Promise<void> {
    await this.pool.query(
      `UPDATE athletes
         SET strava_access_token = $1,
             strava_refresh_token = $2,
             strava_token_expires_at = $3,
             strava_scope = COALESCE($4, strava_scope),
             updated_at = NOW()
       WHERE id = $5`,
      [input.accessToken, input.refreshToken, input.tokenExpiresAt, input.scope ?? null, athleteId]
    );
  }

  async linkStravaAccount(
    athleteId: number,
    input: UpdateStravaTokensInput & { stravaId: number }
  ): Promise<void> {
    await this.pool.query(
      `UPDATE athletes
         SET strava_id = $1,
             strava_access_token = $2,
             strava_refresh_token = $3,
             strava_token_expires_at = $4,
             strava_scope = $5,
             updated_at = NOW()
       WHERE id = $6`,
      [
        input.stravaId,
        input.accessToken,
        input.refreshToken,
        input.tokenExpiresAt,
        input.scope ?? null,
        athleteId,
      ]
    );
  }

  async updateStravaProfile(athleteId: number, input: UpdateStravaProfileInput): Promise<void> {
    await this.pool.query(
      `UPDATE athletes
         SET firstname = COALESCE($1, firstname),
             lastname = COALESCE($2, lastname),
             profile_medium_url = COALESCE($3, profile_medium_url),
             profile_url = COALESCE($4, profile_url),
             weight = COALESCE($5, weight),
             measurement_preference = COALESCE($6, measurement_preference),
             last_strava_sync_at = COALESCE($7, last_strava_sync_at),
             updated_at = NOW()
       WHERE id = $8`,
      [
        input.firstname ?? null,
        input.lastname ?? null,
        input.profileMediumUrl ?? null,
        input.profileUrl ?? null,
        input.weight ?? null,
        input.measurementPreference ?? null,
        input.lastStravaSyncAt ?? null,
        athleteId,
      ]
    );
  }

  async updateProfile(athleteId: number, input: UpdateProfileInput): Promise<Athlete> {
    const { rows } = await this.pool.query(
      `UPDATE athletes
         SET firstname = COALESCE($1, firstname),
             lastname = COALESCE($2, lastname),
             username = COALESCE($3, username),
             email = COALESCE($4, email),
             max_heartrate = COALESCE($5, max_heartrate),
             resting_heartrate = COALESCE($6, resting_heartrate),
             measurement_preference = COALESCE($7, measurement_preference),
             updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        input.firstname ?? null,
        input.lastname ?? null,
        input.username ?? null,
        input.email ?? null,
        input.maxHeartrate ?? null,
        input.restingHeartrate ?? null,
        input.measurementPreference ?? null,
        athleteId,
      ]
    );
    return rowToAthlete(rows[0]);
  }

  async updatePasswordHash(athleteId: number, passwordHash: string): Promise<void> {
    await this.pool.query(
      `UPDATE athletes
         SET password_hash = $1,
             updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, athleteId]
    );
  }

  async unlinkStravaAccount(athleteId: number): Promise<void> {
    await this.pool.query(
      `UPDATE athletes
         SET strava_id = NULL,
             strava_access_token = NULL,
             strava_refresh_token = NULL,
             strava_token_expires_at = NULL,
             strava_scope = NULL,
             last_strava_sync_at = NULL,
             last_strava_sync_status = NULL,
             last_strava_sync_error = NULL,
             last_strava_sync_created = NULL,
             last_strava_sync_updated = NULL,
             updated_at = NOW()
       WHERE id = $1`,
      [athleteId]
    );
  }

  async recordSyncSuccess(athleteId: number, input: RecordSyncSuccessInput): Promise<void> {
    await this.pool.query(
      `UPDATE athletes
         SET last_strava_sync_at = $1,
             last_strava_sync_status = 'success',
             last_strava_sync_error = NULL,
             last_strava_sync_created = $2,
             last_strava_sync_updated = $3,
             updated_at = NOW()
       WHERE id = $4`,
      [input.at, input.created, input.updated, athleteId]
    );
  }

  async recordSyncError(athleteId: number, input: RecordSyncErrorInput): Promise<void> {
    await this.pool.query(
      `UPDATE athletes
         SET last_strava_sync_at = $1,
             last_strava_sync_status = 'error',
             last_strava_sync_error = $2,
             updated_at = NOW()
       WHERE id = $3`,
      [input.at, input.message, athleteId]
    );
  }

  async findAll(): Promise<AthletePublic[]> {
    const { rows } = await this.pool.query(
      `SELECT a.id, a.firstname, a.lastname, a.username, a.email, a.role,
              a.profile_medium_url, a.strava_id, a.strava_scope,
              a.last_strava_sync_at, a.last_strava_sync_status,
              a.created_at, a.updated_at,
              COUNT(ac.id)::int AS activity_count
       FROM athletes a
       LEFT JOIN activities ac ON ac.athlete_id = a.id
       GROUP BY a.id
       ORDER BY a.created_at ASC`
    );
    return rows.map((r) => ({
      id: r.id,
      firstname: r.firstname,
      lastname: r.lastname,
      username: r.username,
      email: r.email ?? null,
      role: r.role as 'admin' | 'user',
      profileMediumUrl: r.profile_medium_url,
      stravaId: r.strava_id ? Number(r.strava_id) : undefined,
      stravaScope: r.strava_scope ?? undefined,
      lastStravaSyncAt: r.last_strava_sync_at ?? undefined,
      lastStravaSyncStatus: r.last_strava_sync_status ?? undefined,
      activityCount: r.activity_count ?? 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async deleteById(id: number): Promise<void> {
    await this.pool.query('DELETE FROM athletes WHERE id = $1', [id]);
  }

  async updateRole(athleteId: number, role: 'admin' | 'user'): Promise<void> {
    await this.pool.query('UPDATE athletes SET role = $1, updated_at = NOW() WHERE id = $2', [
      role,
      athleteId,
    ]);
  }
}
