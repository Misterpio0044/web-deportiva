import { Pool } from 'pg';
import { AthleteRepository } from '../../domain/athlete/AthleteRepository';
import { Athlete, AthletePublic } from '../../domain/athlete/Athlete';

function rowToAthlete(row: Record<string, unknown>): Athlete {
  return {
    id: row.id as number,
    firstname: row.firstname as string,
    lastname: row.lastname as string,
    username: row.username as string,
    email: row.email as string,
    role: row.role as 'admin' | 'user',
    passwordHash: row.password_hash as string,
    profileMediumUrl: row.profile_medium_url as string | undefined,
    maxHeartrate: row.max_heartrate as number | undefined,
    restingHeartrate: row.resting_heartrate as number | undefined,
    weight: row.weight as number | undefined,
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

  async findAll(): Promise<AthletePublic[]> {
    const { rows } = await this.pool.query(
      `SELECT id, firstname, lastname, username, email, role,
              profile_medium_url, max_heartrate, resting_heartrate, weight,
              created_at, updated_at
       FROM athletes
       ORDER BY created_at ASC`,
    );
    return rows.map((r) => ({
      id: r.id,
      firstname: r.firstname,
      lastname: r.lastname,
      username: r.username,
      email: r.email,
      role: r.role as 'admin' | 'user',
      passwordHash: '',
      profileMediumUrl: r.profile_medium_url,
      maxHeartrate: r.max_heartrate,
      restingHeartrate: r.resting_heartrate,
      weight: r.weight,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async deleteById(id: number): Promise<void> {
    await this.pool.query('DELETE FROM athletes WHERE id = $1', [id]);
  }
}
