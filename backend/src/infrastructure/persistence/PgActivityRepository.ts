import { Pool } from 'pg';
import { ActivityRepository, DashboardData, WeeklyVolume, PaceDataPoint, HeartRateZone, HeatmapDay } from '../../domain/activity/ActivityRepository';
import { Activity } from '../../domain/activity/Activity';

function rowToActivity(row: Record<string, unknown>): Activity {
  return {
    id: row.id as number,
    athleteId: row.athlete_id as number,
    gearId: row.gear_id as string | undefined,
    name: row.name as string,
    sportType: row.sport_type as string,
    startDate: row.start_date as Date,
    startDateLocal: row.start_date_local as Date,
    timezone: row.timezone as string,
    distance: parseFloat(row.distance as string),
    movingTime: row.moving_time as number,
    elapsedTime: row.elapsed_time as number,
    totalElevationGain: row.total_elevation_gain ? parseFloat(row.total_elevation_gain as string) : undefined,
    averageSpeed: row.average_speed ? parseFloat(row.average_speed as string) : undefined,
    maxSpeed: row.max_speed ? parseFloat(row.max_speed as string) : undefined,
    averageCadence: row.average_cadence ? parseFloat(row.average_cadence as string) : undefined,
    hasHeartrate: row.has_heartrate as boolean,
    averageHeartrate: row.average_heartrate ? parseFloat(row.average_heartrate as string) : undefined,
    maxHeartrate: row.max_heartrate ? parseFloat(row.max_heartrate as string) : undefined,
    averageTemp: row.average_temp ? parseFloat(row.average_temp as string) : undefined,
    sufferScore: row.suffer_score ? parseFloat(row.suffer_score as string) : undefined,
    calories: row.calories ? parseFloat(row.calories as string) : undefined,
    trainer: row.trainer as boolean,
    commute: row.commute as boolean,
    deviceName: row.device_name as string | undefined,
    description: row.description as string | undefined,
    createdAt: row.created_at as Date,
  };
}

const HR_ZONES = ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5'];

export class PgActivityRepository implements ActivityRepository {
  constructor(private readonly pool: Pool) {}

  async findByAthleteId(athleteId: number, limit = 100): Promise<Activity[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM activities WHERE athlete_id = $1 ORDER BY start_date_local DESC LIMIT $2`,
      [athleteId, limit],
    );
    return rows.map(rowToActivity);
  }

  async findById(id: number): Promise<Activity | null> {
    const { rows } = await this.pool.query('SELECT * FROM activities WHERE id = $1', [id]);
    return rows[0] ? rowToActivity(rows[0]) : null;
  }

  async findAll(limit = 100): Promise<Activity[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM activities ORDER BY start_date_local DESC LIMIT $1`,
      [limit],
    );
    return rows.map(rowToActivity);
  }

  async getDashboardData(athleteId: number): Promise<DashboardData> {
    const [weekly, pace, hrZones, heatmap, recent, totals] = await Promise.all([
      this.getWeeklyVolume(athleteId),
      this.getPaceOverTime(athleteId),
      this.getHeartRateZones(athleteId),
      this.getActivityHeatmap(athleteId),
      this.getRecentActivities(athleteId),
      this.getTotals(athleteId),
    ]);

    return {
      weeklyVolume: weekly,
      paceOverTime: pace,
      heartRateZones: hrZones,
      activityHeatmap: heatmap,
      recentActivities: recent,
      ...totals,
    };
  }

  async getGlobalDashboardData(): Promise<DashboardData> {
    const [weekly, pace, hrZones, heatmap, recent, totals] = await Promise.all([
      this.getWeeklyVolume(null),
      this.getPaceOverTime(null),
      this.getHeartRateZones(null),
      this.getActivityHeatmap(null),
      this.getRecentActivities(null),
      this.getTotals(null),
    ]);

    return {
      weeklyVolume: weekly,
      paceOverTime: pace,
      heartRateZones: hrZones,
      activityHeatmap: heatmap,
      recentActivities: recent,
      ...totals,
    };
  }

  async deleteByAthleteId(athleteId: number): Promise<void> {
    await this.pool.query('DELETE FROM activities WHERE athlete_id = $1', [athleteId]);
  }

  // ─── private query helpers ─────────────────────────────────────────────────

  private async getWeeklyVolume(athleteId: number | null): Promise<WeeklyVolume[]> {
    const athleteFilter = athleteId ? 'AND athlete_id = $2' : '';
    const params: unknown[] = [16];
    if (athleteId) params.push(athleteId);

    const { rows } = await this.pool.query(
      `SELECT
         to_char(date_trunc('week', start_date_local), 'YYYY-MM-DD') AS week,
         SUM(distance) AS total_distance,
         COUNT(*) AS activity_count
       FROM activities
       WHERE start_date_local >= NOW() - ($1 || ' weeks')::INTERVAL
         ${athleteFilter}
       GROUP BY date_trunc('week', start_date_local)
       ORDER BY date_trunc('week', start_date_local)`,
      params,
    );

    return rows.map((r) => ({
      week: r.week,
      totalDistance: parseFloat(r.total_distance),
      activityCount: parseInt(r.activity_count, 10),
    }));
  }

  private async getPaceOverTime(athleteId: number | null): Promise<PaceDataPoint[]> {
    const athleteFilter = athleteId ? 'AND athlete_id = $1' : '';
    const params: unknown[] = athleteId ? [athleteId] : [];

    const { rows } = await this.pool.query(
      `SELECT
         to_char(start_date_local, 'YYYY-MM-DD') AS date,
         moving_time / (distance / 1000.0) AS pace_sec_per_km
       FROM activities
       WHERE distance > 0 ${athleteFilter}
       ORDER BY start_date_local DESC
       LIMIT 60`,
      params,
    );

    return rows
      .map((r) => ({
        date: r.date,
        paceSecPerKm: parseFloat(r.pace_sec_per_km),
      }))
      .reverse();
  }

  private async getHeartRateZones(athleteId: number | null): Promise<HeartRateZone[]> {
    const athleteFilter = athleteId ? 'AND a.athlete_id = $1' : '';
    const params: unknown[] = athleteId ? [athleteId] : [];

    const { rows } = await this.pool.query(
      `SELECT
         CASE
           WHEN a.average_heartrate < COALESCE(at.max_heartrate, 190) * 0.60 THEN 'Zona 1'
           WHEN a.average_heartrate < COALESCE(at.max_heartrate, 190) * 0.70 THEN 'Zona 2'
           WHEN a.average_heartrate < COALESCE(at.max_heartrate, 190) * 0.80 THEN 'Zona 3'
           WHEN a.average_heartrate < COALESCE(at.max_heartrate, 190) * 0.90 THEN 'Zona 4'
           ELSE 'Zona 5'
         END AS zone,
         COUNT(*) AS count
       FROM activities a
       JOIN athletes at ON at.id = a.athlete_id
       WHERE a.has_heartrate = TRUE ${athleteFilter}
       GROUP BY zone
       ORDER BY zone`,
      params,
    );

    // Ensure all 5 zones are present
    const resultMap = new Map(rows.map((r) => [r.zone, parseInt(r.count, 10)]));
    return HR_ZONES.map((z) => ({ zone: z, count: resultMap.get(z) ?? 0 }));
  }

  private async getActivityHeatmap(athleteId: number | null): Promise<HeatmapDay[]> {
    const athleteFilter = athleteId ? 'AND athlete_id = $1' : '';
    const params: unknown[] = athleteId ? [athleteId] : [];

    const { rows } = await this.pool.query(
      `SELECT
         to_char(start_date_local::date, 'YYYY-MM-DD') AS date,
         COUNT(*) AS count
       FROM activities
       WHERE start_date_local >= NOW() - INTERVAL '365 days' ${athleteFilter}
       GROUP BY start_date_local::date
       ORDER BY start_date_local::date`,
      params,
    );

    return rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) }));
  }

  private async getRecentActivities(athleteId: number | null): Promise<Activity[]> {
    const athleteFilter = athleteId ? 'WHERE athlete_id = $1' : '';
    const params: unknown[] = athleteId ? [athleteId] : [];

    const { rows } = await this.pool.query(
      `SELECT * FROM activities ${athleteFilter}
       ORDER BY start_date_local DESC LIMIT 10`,
      params,
    );

    return rows.map(rowToActivity);
  }

  private async getTotals(athleteId: number | null): Promise<{
    totalDistance: number;
    totalActivities: number;
    averagePaceSecPerKm: number;
  }> {
    const athleteFilter = athleteId ? 'WHERE athlete_id = $1' : '';
    const params: unknown[] = athleteId ? [athleteId] : [];

    const { rows } = await this.pool.query(
      `SELECT
         COALESCE(SUM(distance), 0) AS total_distance,
         COUNT(*) AS total_activities,
         COALESCE(AVG(moving_time / NULLIF(distance / 1000.0, 0)), 0) AS avg_pace
       FROM activities ${athleteFilter}`,
      params,
    );

    const row = rows[0];
    return {
      totalDistance: parseFloat(row.total_distance),
      totalActivities: parseInt(row.total_activities, 10),
      averagePaceSecPerKm: parseFloat(row.avg_pace),
    };
  }
}
