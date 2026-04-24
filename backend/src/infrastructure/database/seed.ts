import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker/locale/es';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── helpers ────────────────────────────────────────────────────────────────

function rnd(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function rndInt(min: number, max: number): number {
  return Math.floor(rnd(min, max + 1));
}

function rndDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(rndInt(6, 21), rndInt(0, 59), 0, 0);
  return d;
}

/** Pace in seconds/km → speed in m/s */
function paceToSpeed(paceSecPerKm: number): number {
  return 1000 / paceSecPerKm;
}

/** HR zones based on percentage of max HR */
function hrZone(hr: number, maxHr: number): number {
  const pct = hr / maxHr;
  if (pct < 0.6) return 1;
  if (pct < 0.7) return 2;
  if (pct < 0.8) return 3;
  if (pct < 0.9) return 4;
  return 5;
}

// ─── athletes ────────────────────────────────────────────────────────────────

interface AthleteSpec {
  id: number;
  email: string;
  password: string;
  role: 'admin' | 'user';
  firstname: string;
  lastname: string;
  username: string;
  maxHeartrate: number;
  restingHeartrate: number;
  weight: number;
}

const ATHLETES: AthleteSpec[] = [
  {
    id: 1001,
    email: 'admin@demo.com',
    password: 'admin123',
    role: 'admin',
    firstname: 'Carlos',
    lastname: 'Administrador',
    username: 'carlos_admin',
    maxHeartrate: 192,
    restingHeartrate: 52,
    weight: 74.5,
  },
  {
    id: 1002,
    email: 'user1@demo.com',
    password: 'user123',
    role: 'user',
    firstname: 'María',
    lastname: 'García',
    username: 'maria_runner',
    maxHeartrate: 188,
    restingHeartrate: 58,
    weight: 62.0,
  },
  {
    id: 1003,
    email: 'user2@demo.com',
    password: 'user123',
    role: 'user',
    firstname: 'Javier',
    lastname: 'López',
    username: 'javi_trail',
    maxHeartrate: 195,
    restingHeartrate: 55,
    weight: 80.0,
  },
];

// ─── gear names ─────────────────────────────────────────────────────────────

const GEAR_NAMES = [
  ['Nike Pegasus 40', 'Nike'],
  ['ASICS Gel-Nimbus 25', 'ASICS'],
  ['Brooks Ghost 15', 'Brooks'],
  ['Hoka Clifton 9', 'Hoka'],
  ['Saucony Endorphin Speed 3', 'Saucony'],
  ['Adidas Ultraboost 23', 'Adidas'],
  ['New Balance 1080v13', 'New Balance'],
];

// ─── activity name templates ─────────────────────────────────────────────────

const RUN_NAMES = [
  'Rodaje matutino',
  'Carrera por el parque',
  'Entreno de series',
  'Rodaje suave',
  'Fondo largo',
  'Recuperación activa',
  'Tempo run',
  'Carrera continua',
  'Entrenamiento de umbral',
  'Carrera del domingo',
  'Trote vespertino',
  'Carrera técnica',
];

// ─── main seed ───────────────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Apply auth columns idempotently (in case schema was init-ed without 02_auth.sql)
    await client.query(`
      ALTER TABLE athletes
        ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
          CHECK (role IN ('admin', 'user')),
        ADD COLUMN IF NOT EXISTS password_hash TEXT
    `);

    // Truncate in correct order (FK cascade)
    await client.query('TRUNCATE TABLE laps, splits_metric, activities, gear, athletes RESTART IDENTITY CASCADE');
    console.log('[seed] Tablas limpiadas');

    // ── 1. Athletes ──────────────────────────────────────────────────────────
    for (const spec of ATHLETES) {
      const hash = await bcrypt.hash(spec.password, 10);
      await client.query(
        `INSERT INTO athletes
           (id, firstname, lastname, username, email, max_heartrate, resting_heartrate, weight,
            role, password_hash, measurement_preference, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'meters',NOW(),NOW())`,
        [
          spec.id,
          spec.firstname,
          spec.lastname,
          spec.username,
          spec.email,
          spec.maxHeartrate,
          spec.restingHeartrate,
          spec.weight,
          spec.role,
          hash,
        ],
      );
    }
    console.log('[seed] 3 atletas insertados');

    // ── 2. Gear ──────────────────────────────────────────────────────────────
    let gearCounter = 1;
    const athleteGearMap: Record<number, string[]> = {};

    for (const spec of ATHLETES) {
      const numGear = rndInt(1, 2);
      athleteGearMap[spec.id] = [];
      const shuffled = [...GEAR_NAMES].sort(() => Math.random() - 0.5).slice(0, numGear);

      for (const [name, brand] of shuffled) {
        const gearId = `g${String(gearCounter).padStart(4, '0')}`;
        const isPrimary = gearCounter === 1 || athleteGearMap[spec.id].length === 0;
        await client.query(
          `INSERT INTO gear (id, athlete_id, name, is_primary, distance, brand, model, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
          [
            gearId,
            spec.id,
            name,
            isPrimary,
            Math.round(rnd(200, 900) * 1000) / 1000,
            brand,
            name,
          ],
        );
        athleteGearMap[spec.id].push(gearId);
        gearCounter++;
      }
    }
    console.log('[seed] Gear insertado');

    // ── 3. Activities (50 per athlete) ───────────────────────────────────────
    let activityId = 10_000_001;
    const ACTIVITIES_PER_ATHLETE = 50;

    for (const spec of ATHLETES) {
      const gearIds = athleteGearMap[spec.id];

      for (let i = 0; i < ACTIVITIES_PER_ATHLETE; i++) {
        // Distribute over last 365 days, denser in recent months
        const daysAgo = rndInt(1, 365);
        const startDate = rndDate(daysAgo);

        // Distance: 3–22 km (in meters)
        const distanceKm = rnd(3, 22);
        const distanceM = Math.round(distanceKm * 1000);

        // Pace: 4:30–7:30 min/km in seconds
        const paceSecPerKm = rnd(270, 450);
        const avgSpeed = paceToSpeed(paceSecPerKm);
        const maxSpeed = avgSpeed * rnd(1.05, 1.25);
        const movingTime = Math.round(distanceM / avgSpeed);
        const elapsedTime = movingTime + rndInt(60, 300);

        // Elevation: 0–200m
        const elevationGain = Math.round(rnd(0, 200) * 10) / 10;

        // Cadence: 160–185 spm
        const cadence = Math.round(rnd(160, 185) * 10) / 10;

        // Heart rate
        const avgHr = Math.round(rnd(spec.restingHeartrate + 30, spec.maxHeartrate - 10));
        const maxHr = Math.min(spec.maxHeartrate, avgHr + rndInt(10, 20));

        // Misc
        const calories = Math.round(distanceKm * rnd(55, 75));
        const sufferScore = Math.round(rnd(10, 150));
        const temp = Math.round(rnd(5, 32));
        const gearId = gearIds[rndInt(0, gearIds.length - 1)];
        const name = RUN_NAMES[rndInt(0, RUN_NAMES.length - 1)];

        // Geolocation (Spain area)
        const lat = rnd(36.5, 43.5);
        const lon = rnd(-8.5, 3.5);

        await client.query(
          `INSERT INTO activities
             (id, athlete_id, gear_id, name, sport_type,
              start_date, start_date_local, timezone, utc_offset,
              distance, moving_time, elapsed_time, total_elevation_gain,
              average_speed, max_speed, average_cadence,
              has_heartrate, average_heartrate, max_heartrate,
              average_temp, suffer_score, calories,
              start_latitude, start_longitude, end_latitude, end_longitude,
              trainer, commute, created_at, updated_at)
           VALUES
             ($1,$2,$3,$4,'Run',
              $5,$5,'Europe/Madrid',3600,
              $6,$7,$8,$9,
              $10,$11,$12,
              TRUE,$13,$14,
              $15,$16,$17,
              $18,$19,$20,$21,
              FALSE,FALSE,NOW(),NOW())`,
          [
            activityId,
            spec.id,
            gearId,
            name,
            startDate,
            distanceM,
            movingTime,
            elapsedTime,
            elevationGain,
            Math.round(avgSpeed * 1000) / 1000,
            Math.round(maxSpeed * 1000) / 1000,
            cadence,
            avgHr,
            maxHr,
            temp,
            sufferScore,
            calories,
            Math.round(lat * 1e7) / 1e7,
            Math.round(lon * 1e7) / 1e7,
            Math.round((lat - rnd(0.005, 0.02)) * 1e7) / 1e7,
            Math.round((lon + rnd(0.005, 0.02)) * 1e7) / 1e7,
          ],
        );

        // ── 3a. splits_metric (one per km) ──────────────────────────────────
        const totalKm = Math.floor(distanceKm);
        for (let km = 1; km <= totalKm; km++) {
          const splitDist = km < totalKm ? 1000 : distanceM - (totalKm - 1) * 1000;
          const splitPace = paceSecPerKm * rnd(0.9, 1.1);
          const splitSpeed = paceToSpeed(splitPace);
          const splitTime = Math.round(splitDist / splitSpeed);
          const splitHr = Math.round(avgHr * rnd(0.95, 1.05));

          await client.query(
            `INSERT INTO splits_metric
               (activity_id, split_index, distance, moving_time, elapsed_time,
                elevation_difference, average_speed, average_heartrate, pace_zone)
             VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8)
             ON CONFLICT (activity_id, split_index) DO NOTHING`,
            [
              activityId,
              km,
              splitDist,
              splitTime,
              Math.round(rnd(-5, 15) * 10) / 10,
              Math.round(splitSpeed * 1000) / 1000,
              splitHr,
              hrZone(splitHr, spec.maxHeartrate),
            ],
          );
        }

        // ── 3b. laps (2–4 per activity) ─────────────────────────────────────
        const numLaps = rndInt(2, 4);
        const lapDistM = Math.floor(distanceM / numLaps);
        for (let lap = 1; lap <= numLaps; lap++) {
          const lapDist = lap < numLaps ? lapDistM : distanceM - lapDistM * (numLaps - 1);
          const lapPace = paceSecPerKm * rnd(0.88, 1.12);
          const lapSpeed = paceToSpeed(lapPace);
          const lapTime = Math.round(lapDist / lapSpeed);
          const lapHr = Math.round(avgHr * rnd(0.93, 1.07));

          await client.query(
            `INSERT INTO laps
               (activity_id, lap_index, name, distance, moving_time, elapsed_time,
                total_elevation_gain, average_speed, max_speed,
                average_heartrate, average_cadence)
             VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (activity_id, lap_index) DO NOTHING`,
            [
              activityId,
              lap,
              `Vuelta ${lap}`,
              lapDist,
              lapTime,
              Math.round(elevationGain / numLaps * 10) / 10,
              Math.round(lapSpeed * 1000) / 1000,
              Math.round(lapSpeed * rnd(1.05, 1.2) * 1000) / 1000,
              lapHr,
              cadence,
            ],
          );
        }

        activityId++;
      }
    }
    console.log(`[seed] ${ACTIVITIES_PER_ATHLETE * ATHLETES.length} actividades insertadas con splits y laps`);

    await client.query('COMMIT');
    console.log('[seed] ✅ Seed completado con éxito');
    console.log('');
    console.log('  Credenciales de acceso:');
    console.log('  ┌────────────────────────────┬───────────┬────────┐');
    console.log('  │ Email                      │ Password  │ Rol    │');
    console.log('  ├────────────────────────────┼───────────┼────────┤');
    console.log('  │ admin@demo.com             │ admin123  │ admin  │');
    console.log('  │ user1@demo.com             │ user123   │ user   │');
    console.log('  │ user2@demo.com             │ user123   │ user   │');
    console.log('  └────────────────────────────┴───────────┴────────┘');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed] ❌ Error durante el seed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
