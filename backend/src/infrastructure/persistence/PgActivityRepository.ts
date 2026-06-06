import { Pool } from 'pg';
import {
  ActivityRepository,
  DashboardData,
  WeeklyVolume,
  MonthlyDistance,
  HeartRateZone,
  HeatmapDay,
  UpsertManyResult,
  SearchActivitiesParams,
  SearchActivitiesResult,
  ActivitySortField,
} from '../../domain/activity/ActivityRepository';
import { Activity } from '../../domain/activity/Activity';

const ACTIVITY_SORT_COLUMNS: Record<ActivitySortField, string> = {
  date: 'start_date_local',
  name: 'name',
  distance: 'distance',
  time: 'moving_time',
  speed: 'average_speed',
  hr: 'average_heartrate',
};

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
    utcOffset: row.utc_offset != null ? (row.utc_offset as number) : undefined,
    distance: parseFloat(row.distance as string),
    movingTime: row.moving_time as number,
    elapsedTime: row.elapsed_time as number,
    totalElevationGain: row.total_elevation_gain
      ? parseFloat(row.total_elevation_gain as string)
      : undefined,
    averageSpeed: row.average_speed ? parseFloat(row.average_speed as string) : undefined,
    maxSpeed: row.max_speed ? parseFloat(row.max_speed as string) : undefined,
    averageCadence: row.average_cadence ? parseFloat(row.average_cadence as string) : undefined,
    hasHeartrate: row.has_heartrate as boolean,
    averageHeartrate: row.average_heartrate
      ? parseFloat(row.average_heartrate as string)
      : undefined,
    maxHeartrate: row.max_heartrate ? parseFloat(row.max_heartrate as string) : undefined,
    averageTemp: row.average_temp ? parseFloat(row.average_temp as string) : undefined,
    sufferScore: row.suffer_score ? parseFloat(row.suffer_score as string) : undefined,
    calories: row.calories ? parseFloat(row.calories as string) : undefined,
    trainer: row.trainer as boolean,
    commute: row.commute as boolean,
    deviceName: row.device_name as string | undefined,
    description: row.description as string | undefined,
    startLatitude:
      row.start_latitude != null ? parseFloat(row.start_latitude as string) : undefined,
    startLongitude:
      row.start_longitude != null ? parseFloat(row.start_longitude as string) : undefined,
    endLatitude: row.end_latitude != null ? parseFloat(row.end_latitude as string) : undefined,
    endLongitude: row.end_longitude != null ? parseFloat(row.end_longitude as string) : undefined,
    createdAt: row.created_at as Date,
  };
}

const HR_ZONES = ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5'];

export class PgActivityRepository implements ActivityRepository {
  constructor(private readonly pool: Pool) {}

  async findByAthleteId(athleteId: number, limit = 100): Promise<Activity[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM activities WHERE athlete_id = $1 ORDER BY start_date_local DESC LIMIT $2`,
      [athleteId, limit]
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
      [limit]
    );
    return rows.map(rowToActivity);
  }

  async searchActivities(params: SearchActivitiesParams): Promise<SearchActivitiesResult> {
    const {
      athleteId = null,
      page,
      limit,
      sortBy,
      sortDir,
      search,
      sportType,
      dateFrom,
      dateTo,
    } = params;

    // Whitelist de columnas y dirección para evitar inyección SQL en ORDER BY.
    const sortColumn = ACTIVITY_SORT_COLUMNS[sortBy] ?? 'start_date_local';
    const direction = sortDir === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (athleteId != null) {
      values.push(athleteId);
      conditions.push(`athlete_id = $${values.length}`);
    }
    if (search) {
      values.push(`%${search}%`);
      conditions.push(`name ILIKE $${values.length}`);
    }
    if (sportType) {
      values.push(sportType);
      conditions.push(`sport_type = $${values.length}`);
    }
    if (dateFrom) {
      values.push(dateFrom);
      conditions.push(`start_date_local >= $${values.length}`);
    }
    if (dateTo) {
      values.push(dateTo);
      conditions.push(`start_date_local <= $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM activities ${whereClause}`,
      values
    );
    const total = (countResult.rows[0]?.total as number) ?? 0;

    const offset = (page - 1) * limit;
    const limitParam = `$${values.length + 1}`;
    const offsetParam = `$${values.length + 2}`;
    const { rows } = await this.pool.query(
      `SELECT * FROM activities ${whereClause}
       ORDER BY ${sortColumn} ${direction} NULLS LAST, id DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      [...values, limit, offset]
    );

    return { items: rows.map(rowToActivity), total };
  }

  async getDashboardData(athleteId: number): Promise<DashboardData> {
    const [weekly, monthly, hrZones, heatmap, recent, totals] = await Promise.all([
      this.getWeeklyVolume(athleteId),
      this.getMonthlyDistance(athleteId),
      this.getHeartRateZones(athleteId),
      this.getActivityHeatmap(athleteId),
      this.getRecentActivities(athleteId),
      this.getTotals(athleteId),
    ]);

    return {
      weeklyVolume: weekly,
      monthlyDistance: monthly,
      heartRateZones: hrZones,
      activityHeatmap: heatmap,
      recentActivities: recent,
      ...totals,
    };
  }

  async getGlobalDashboardData(): Promise<DashboardData> {
    const [weekly, monthly, hrZones, heatmap, recent, totals] = await Promise.all([
      this.getWeeklyVolume(null),
      this.getMonthlyDistance(null),
      this.getHeartRateZones(null),
      this.getActivityHeatmap(null),
      this.getRecentActivities(null),
      this.getTotals(null),
    ]);

    return {
      weeklyVolume: weekly,
      monthlyDistance: monthly,
      heartRateZones: hrZones,
      activityHeatmap: heatmap,
      recentActivities: recent,
      ...totals,
    };
  }

  async deleteByAthleteId(athleteId: number): Promise<void> {
    await this.pool.query('DELETE FROM activities WHERE athlete_id = $1', [athleteId]);
  }

  async upsertMany(activities: Activity[]): Promise<UpsertManyResult> {
    if (activities.length === 0) return { created: 0, updated: 0 };

    const ids = activities.map((a) => a.id);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: existingRows } = await client.query(
        `SELECT id FROM activities WHERE id = ANY($1::bigint[])`,
        [ids]
      );
      const existing = new Set<number>(existingRows.map((r) => Number(r.id)));
      for (const a of activities) {
        await client.query(
          `INSERT INTO activities (
             id, athlete_id, gear_id, name, sport_type,
             start_date, start_date_local, timezone, utc_offset,
             distance, moving_time, elapsed_time, total_elevation_gain,
             average_speed, max_speed, average_cadence,
             has_heartrate, average_heartrate, max_heartrate,
             average_temp, suffer_score, calories,
             trainer, commute, device_name, description
           ) VALUES (
             $1, $2, $3, $4, $5,
             $6, $7, $8, $9,
             $10, $11, $12, $13,
             $14, $15, $16,
             $17, $18, $19,
             $20, $21, $22,
             $23, $24, $25, $26
           )
           ON CONFLICT (id) DO UPDATE SET
             athlete_id = EXCLUDED.athlete_id,
             gear_id = EXCLUDED.gear_id,
             name = EXCLUDED.name,
             sport_type = EXCLUDED.sport_type,
             start_date = EXCLUDED.start_date,
             start_date_local = EXCLUDED.start_date_local,
             timezone = EXCLUDED.timezone,
             utc_offset = EXCLUDED.utc_offset,
             distance = EXCLUDED.distance,
             moving_time = EXCLUDED.moving_time,
             elapsed_time = EXCLUDED.elapsed_time,
             total_elevation_gain = EXCLUDED.total_elevation_gain,
             average_speed = EXCLUDED.average_speed,
             max_speed = EXCLUDED.max_speed,
             average_cadence = EXCLUDED.average_cadence,
             has_heartrate = EXCLUDED.has_heartrate,
             average_heartrate = EXCLUDED.average_heartrate,
             max_heartrate = EXCLUDED.max_heartrate,
             average_temp = EXCLUDED.average_temp,
             suffer_score = EXCLUDED.suffer_score,
             calories = EXCLUDED.calories,
             trainer = EXCLUDED.trainer,
             commute = EXCLUDED.commute,
             device_name = EXCLUDED.device_name,
             description = EXCLUDED.description,
             updated_at = NOW()`,
          [
            a.id,
            a.athleteId,
            a.gearId ?? null,
            a.name,
            a.sportType,
            a.startDate,
            a.startDateLocal,
            a.timezone,
            a.utcOffset ?? null,
            a.distance,
            a.movingTime,
            a.elapsedTime,
            a.totalElevationGain ?? null,
            a.averageSpeed ?? null,
            a.maxSpeed ?? null,
            a.averageCadence ?? null,
            a.hasHeartrate,
            a.averageHeartrate ?? null,
            a.maxHeartrate ?? null,
            a.averageTemp ?? null,
            a.sufferScore ?? null,
            a.calories ?? null,
            a.trainer,
            a.commute,
            a.deviceName ?? null,
            a.description ?? null,
          ]
        );
      }
      await client.query('COMMIT');
      const updated = activities.filter((a) => existing.has(Number(a.id))).length;
      const created = activities.length - updated;
      return { created, updated };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── private query helpers ─────────────────────────────────────────────────

  private async getWeeklyVolume(athleteId: number | null): Promise<WeeklyVolume[]> {
    const athleteFilter = athleteId ? 'AND athlete_id = $1' : '';
    const params: unknown[] = athleteId ? [athleteId] : [];

    // Últimas 16 semanas terminando en la semana actual; rellena huecos con 0.
    const { rows } = await this.pool.query(
      `WITH weeks AS (
         SELECT generate_series(
           date_trunc('week', NOW()) - INTERVAL '15 weeks',
           date_trunc('week', NOW()),
           INTERVAL '1 week'
         ) AS week_start
       ),
       agg AS (
         SELECT
           date_trunc('week', start_date_local) AS week_start,
           SUM(distance) AS total_distance,
           COUNT(*) AS activity_count
         FROM activities
         WHERE start_date_local >= date_trunc('week', NOW()) - INTERVAL '15 weeks'
           AND start_date_local < date_trunc('week', NOW()) + INTERVAL '1 week'
           ${athleteFilter}
         GROUP BY date_trunc('week', start_date_local)
       )
       SELECT
         to_char(w.week_start, 'YYYY-MM-DD') AS week,
         COALESCE(a.total_distance, 0) AS total_distance,
         COALESCE(a.activity_count, 0) AS activity_count
       FROM weeks w
       LEFT JOIN agg a ON a.week_start = w.week_start
       ORDER BY w.week_start`,
      params
    );

    return rows.map((r) => ({
      week: r.week,
      totalDistance: parseFloat(r.total_distance),
      activityCount: parseInt(r.activity_count, 10),
    }));
  }

  private async getMonthlyDistance(athleteId: number | null): Promise<MonthlyDistance[]> {
    const athleteFilter = athleteId ? 'AND athlete_id = $1' : '';
    const params: unknown[] = athleteId ? [athleteId] : [];

    // Últimos 12 meses terminando en el mes actual; rellena huecos con 0.
    const { rows } = await this.pool.query(
      `WITH months AS (
         SELECT generate_series(
           date_trunc('month', NOW()) - INTERVAL '11 months',
           date_trunc('month', NOW()),
           INTERVAL '1 month'
         ) AS month_start
       ),
       agg AS (
         SELECT
           date_trunc('month', start_date_local) AS month_start,
           ROUND(SUM(distance) / 1000.0, 2) AS total_distance_km
         FROM activities
         WHERE start_date_local >= date_trunc('month', NOW()) - INTERVAL '11 months'
           AND start_date_local < date_trunc('month', NOW()) + INTERVAL '1 month'
           ${athleteFilter}
         GROUP BY date_trunc('month', start_date_local)
       )
       SELECT
         to_char(m.month_start, 'YYYY-MM') AS month,
         COALESCE(a.total_distance_km, 0) AS total_distance_km
       FROM months m
       LEFT JOIN agg a ON a.month_start = m.month_start
       ORDER BY m.month_start`,
      params
    );

    return rows.map((r) => ({
      month: r.month,
      totalDistanceKm: parseFloat(r.total_distance_km),
    }));
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
      params
    );

    // Ensure all 5 zones are present
    const resultMap = new Map(rows.map((r) => [r.zone, parseInt(r.count, 10)]));
    return HR_ZONES.map((z) => ({ zone: z, count: resultMap.get(z) ?? 0 }));
  }

  private async getActivityHeatmap(athleteId: number | null): Promise<HeatmapDay[]> {
    const athleteFilter = athleteId ? 'WHERE athlete_id = $1' : '';
    const params: unknown[] = athleteId ? [athleteId] : [];

    // Heatmap de los 365 días previos a la actividad más reciente del atleta.
    const { rows } = await this.pool.query(
      `WITH anchor AS (
         SELECT COALESCE(MAX(start_date_local), NOW()) AS d
         FROM activities ${athleteFilter}
       )
       SELECT
         to_char(a.start_date_local::date, 'YYYY-MM-DD') AS date,
         COUNT(*) AS count
       FROM activities a, anchor
       WHERE a.start_date_local >= anchor.d - INTERVAL '365 days'
         AND a.start_date_local <= anchor.d
         ${athleteId ? 'AND a.athlete_id = $1' : ''}
       GROUP BY a.start_date_local::date
       ORDER BY a.start_date_local::date`,
      params
    );

    return rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) }));
  }

  private async getRecentActivities(athleteId: number | null): Promise<Activity[]> {
    const athleteFilter = athleteId ? 'WHERE athlete_id = $1' : '';
    const params: unknown[] = athleteId ? [athleteId] : [];

    const { rows } = await this.pool.query(
      `SELECT * FROM activities ${athleteFilter}
       ORDER BY start_date_local DESC LIMIT 10`,
      params
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
      params
    );

    const row = rows[0];
    return {
      totalDistance: parseFloat(row.total_distance),
      totalActivities: parseInt(row.total_activities, 10),
      averagePaceSecPerKm: parseFloat(row.avg_pace),
    };
  }
}
