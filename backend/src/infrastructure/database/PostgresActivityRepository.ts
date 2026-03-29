import { Pool } from 'pg';
import type { Activity } from '../../domain/models/Activity';
import type { ActivityRepository } from '../../domain/repositories/ActivityRepository';

export class PostgresActivityRepository implements ActivityRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Activity | null> {
    const result = await this.pool.query<Activity>(
      'SELECT * FROM activities WHERE id = $1',
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByAthleteId(athleteId: string): Promise<Activity[]> {
    const result = await this.pool.query<Activity>(
      'SELECT * FROM activities WHERE athlete_id = $1 ORDER BY start_date DESC',
      [athleteId],
    );
    return result.rows;
  }

  async save(activity: Activity): Promise<void> {
    await this.pool.query(
      `INSERT INTO activities (
        id, strava_id, athlete_id, name, type, distance, moving_time,
        elapsed_time, total_elevation_gain, start_date, average_speed,
        max_speed, average_heartrate, max_heartrate, calories
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        distance = EXCLUDED.distance,
        moving_time = EXCLUDED.moving_time,
        elapsed_time = EXCLUDED.elapsed_time,
        total_elevation_gain = EXCLUDED.total_elevation_gain,
        average_speed = EXCLUDED.average_speed,
        max_speed = EXCLUDED.max_speed,
        average_heartrate = EXCLUDED.average_heartrate,
        max_heartrate = EXCLUDED.max_heartrate,
        calories = EXCLUDED.calories`,
      [
        activity.id,
        activity.stravaId,
        activity.athleteId,
        activity.name,
        activity.type,
        activity.distance,
        activity.movingTime,
        activity.elapsedTime,
        activity.totalElevationGain,
        activity.startDate,
        activity.averageSpeed,
        activity.maxSpeed,
        activity.averageHeartrate,
        activity.maxHeartrate,
        activity.calories,
      ],
    );
  }

  async saveMany(activities: Activity[]): Promise<void> {
    await Promise.all(activities.map((a) => this.save(a)));
  }
}
