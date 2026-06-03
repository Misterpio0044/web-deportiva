import { Pool } from 'pg';
import { GearRepository, GearDistanceStat } from '../../domain/gear/GearRepository';
import { Gear } from '../../domain/gear/Gear';

function rowToGear(row: Record<string, unknown>): Gear {
  return {
    id: row.id as string,
    athleteId: row.athlete_id as number,
    name: row.name as string,
    isPrimary: row.is_primary as boolean,
    distance: parseFloat(row.distance as string),
    brand: (row.brand as string | null) ?? undefined,
    model: (row.model as string | null) ?? undefined,
    lastSyncedAt: (row.last_synced_at as Date | null) ?? undefined,
    createdAt: row.created_at as Date,
  };
}

export class PgGearRepository implements GearRepository {
  constructor(private readonly pool: Pool) {}

  async findByAthleteId(athleteId: number): Promise<Gear[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM gear WHERE athlete_id = $1 ORDER BY is_primary DESC, name ASC`,
      [athleteId]
    );
    return rows.map(rowToGear);
  }

  async findAll(): Promise<Gear[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM gear ORDER BY athlete_id, is_primary DESC, name ASC`
    );
    return rows.map(rowToGear);
  }

  async upsertManyForAthlete(athleteId: number, gears: Gear[]): Promise<void> {
    // Si no hay gear, protegemos contra borrado accidental (scope revocado)
    if (gears.length === 0) return;

    const ids = gears.map((g) => g.id);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Eliminar gear que ya no existe en la cuenta de Strava del atleta
      await client.query(
        `DELETE FROM gear WHERE athlete_id = $1 AND id <> ALL($2::varchar[])`,
        [athleteId, ids]
      );

      // Upsert de cada gear
      for (const g of gears) {
        await client.query(
          `INSERT INTO gear (id, athlete_id, name, is_primary, distance, brand, model, last_synced_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             is_primary = EXCLUDED.is_primary,
             distance = EXCLUDED.distance,
             brand = COALESCE(EXCLUDED.brand, gear.brand),
             model = COALESCE(EXCLUDED.model, gear.model),
             last_synced_at = NOW()`,
          [g.id, athleteId, g.name, g.isPrimary, g.distance, g.brand ?? null, g.model ?? null]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getGearDistanceStats(athleteId: number): Promise<GearDistanceStat[]> {
    const { rows } = await this.pool.query(
      `SELECT
         g.id            AS gear_id,
         g.name,
         g.brand,
         g.model,
         g.is_primary,
         COALESCE(SUM(a.distance), 0) AS total_distance,
         COUNT(a.id)     AS activity_count
       FROM gear g
       LEFT JOIN activities a ON a.gear_id = g.id
       WHERE g.athlete_id = $1
       GROUP BY g.id, g.name, g.brand, g.model, g.is_primary
       ORDER BY total_distance DESC`,
      [athleteId]
    );
    return rows.map(rowToStat);
  }

  async getGlobalGearDistanceStats(): Promise<GearDistanceStat[]> {
    const { rows } = await this.pool.query(
      `SELECT
         g.id            AS gear_id,
         g.name,
         g.brand,
         g.model,
         g.is_primary,
         COALESCE(SUM(a.distance), 0) AS total_distance,
         COUNT(a.id)     AS activity_count
       FROM gear g
       LEFT JOIN activities a ON a.gear_id = g.id
       GROUP BY g.id, g.name, g.brand, g.model, g.is_primary
       ORDER BY total_distance DESC`
    );
    return rows.map(rowToStat);
  }
}

function rowToStat(row: Record<string, unknown>): GearDistanceStat {
  return {
    gearId: row.gear_id as string,
    name: row.name as string,
    brand: (row.brand as string | null) ?? undefined,
    model: (row.model as string | null) ?? undefined,
    isPrimary: row.is_primary as boolean,
    totalDistance: parseFloat(row.total_distance as string),
    activityCount: parseInt(row.activity_count as string, 10),
  };
}
