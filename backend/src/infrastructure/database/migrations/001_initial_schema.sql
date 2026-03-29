-- Initial schema for web-deportiva

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS athletes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strava_id        BIGINT UNIQUE NOT NULL,
  username         VARCHAR(255) NOT NULL,
  first_name       VARCHAR(255) NOT NULL,
  last_name        VARCHAR(255) NOT NULL,
  profile_image_url TEXT NOT NULL,
  city             VARCHAR(255),
  country          VARCHAR(255),
  access_token     TEXT NOT NULL,
  refresh_token    TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activities (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strava_id             BIGINT UNIQUE NOT NULL,
  athlete_id            UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  name                  VARCHAR(255) NOT NULL,
  type                  VARCHAR(100) NOT NULL,
  distance              DOUBLE PRECISION NOT NULL DEFAULT 0,
  moving_time           INTEGER NOT NULL DEFAULT 0,
  elapsed_time          INTEGER NOT NULL DEFAULT 0,
  total_elevation_gain  DOUBLE PRECISION NOT NULL DEFAULT 0,
  start_date            TIMESTAMPTZ NOT NULL,
  average_speed         DOUBLE PRECISION NOT NULL DEFAULT 0,
  max_speed             DOUBLE PRECISION NOT NULL DEFAULT 0,
  average_heartrate     DOUBLE PRECISION,
  max_heartrate         DOUBLE PRECISION,
  calories              DOUBLE PRECISION,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activities_athlete_id_idx ON activities(athlete_id);
CREATE INDEX IF NOT EXISTS activities_start_date_idx ON activities(start_date DESC);
