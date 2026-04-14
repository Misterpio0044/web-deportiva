-- 1. Tabla de Atletas (solo running)
CREATE TABLE IF NOT EXISTS athletes (
    id BIGINT PRIMARY KEY,
    firstname VARCHAR(100),
    lastname VARCHAR(100),
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    profile_medium_url TEXT,
    profile_url TEXT,
    
    -- Métricas para corredores
    max_heartrate SMALLINT,
    resting_heartrate SMALLINT,
    weight NUMERIC(5,2),
    
    -- Preferencias
    measurement_preference VARCHAR(10) DEFAULT 'meters',
    
    -- OAuth
    strava_access_token TEXT,
    strava_refresh_token TEXT,
    strava_token_expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_athletes_email ON athletes(email);

-- 2. Tabla gear (zapatillas)
CREATE TABLE IF NOT EXISTS gear (
    id VARCHAR(50) PRIMARY KEY,
    athlete_id BIGINT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    distance NUMERIC(12,2) DEFAULT 0,
    brand VARCHAR(100),
    model VARCHAR(100),
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gear_athlete ON gear(athlete_id);

-- 3. Tabla activities (central, solo running)
CREATE TABLE IF NOT EXISTS activities (
    id BIGINT PRIMARY KEY,
    athlete_id BIGINT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    gear_id VARCHAR(50) NULL REFERENCES gear(id) ON DELETE SET NULL,
    
    -- Datos básicos
    name VARCHAR(255) NOT NULL,
    sport_type VARCHAR(50) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    start_date_local TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(100),
    utc_offset INTEGER,
    
    -- Métricas esenciales
    distance NUMERIC(10,2) NOT NULL,
    moving_time INTEGER NOT NULL,
    elapsed_time INTEGER NOT NULL,
    total_elevation_gain NUMERIC(8,2),
    
    -- Ritmo y cadencia
    average_speed NUMERIC(8,3),
    max_speed NUMERIC(8,3),
    average_cadence NUMERIC(6,2),
    
    -- Frecuencia cardíaca
    has_heartrate BOOLEAN DEFAULT FALSE,
    average_heartrate NUMERIC(6,2),
    max_heartrate NUMERIC(6,2),
    
    -- Contexto
    average_temp NUMERIC(5,2),
    suffer_score NUMERIC(6,1),
    calories NUMERIC(8,2),
    
    -- Geolocalización (inicio y fin)
    start_latitude NUMERIC(10,7),
    start_longitude NUMERIC(10,7),
    end_latitude NUMERIC(10,7),
    end_longitude NUMERIC(10,7),
    
    trainer BOOLEAN DEFAULT FALSE,
    commute BOOLEAN DEFAULT FALSE,
    device_name VARCHAR(100),
    description TEXT,
    
    streams_json JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_activities_athlete_date ON activities(athlete_id, start_date_local DESC);
CREATE INDEX IF NOT EXISTS idx_activities_gear ON activities(gear_id);

-- 4. Tabla splits_metric (parciales por km/milla)
CREATE TABLE IF NOT EXISTS splits_metric (
    id SERIAL PRIMARY KEY,
    activity_id BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    split_index INTEGER NOT NULL,
    distance NUMERIC(10,2) NOT NULL,
    moving_time INTEGER,
    elapsed_time INTEGER,
    elevation_difference NUMERIC(8,2),
    average_speed NUMERIC(8,3),
    average_heartrate NUMERIC(6,2),
    pace_zone INTEGER,
    UNIQUE(activity_id, split_index)
);

CREATE INDEX IF NOT EXISTS idx_splits_activity ON splits_metric(activity_id);

-- 5. Tabla laps (vueltas manuales)
CREATE TABLE IF NOT EXISTS laps (
    id SERIAL PRIMARY KEY,
    activity_id BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    lap_index INTEGER NOT NULL,
    name VARCHAR(100),
    distance NUMERIC(10,2),
    moving_time INTEGER,
    elapsed_time INTEGER,
    total_elevation_gain NUMERIC(8,2),
    average_speed NUMERIC(8,3),
    max_speed NUMERIC(8,3),
    average_heartrate NUMERIC(6,2),
    average_cadence NUMERIC(6,2),
    UNIQUE(activity_id, lap_index)
);

CREATE INDEX IF NOT EXISTS idx_laps_activity ON laps(activity_id);