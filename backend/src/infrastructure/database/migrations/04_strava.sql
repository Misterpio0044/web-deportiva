-- 04_strava.sql: vinculación con cuentas de Strava
--
-- Permite a un atleta vincular su cuenta de Strava (OAuth 2.0) y registrar
-- usuarios que se autentican exclusivamente a través de Strava (sin password).

-- 1. Identificador del atleta en Strava (distinto del id local).
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS strava_id BIGINT UNIQUE;

-- 2. Scopes OAuth concedidos por el atleta (ej. "read,activity:read_all").
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS strava_scope VARCHAR(255);

-- 3. Marca temporal del último sync exitoso desde Strava.
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS last_strava_sync_at TIMESTAMPTZ;

-- 4. Los usuarios que se registren vía Strava no tienen contraseña local.
ALTER TABLE athletes
  ALTER COLUMN password_hash DROP NOT NULL;

-- 5. La API de Strava no expone el email del atleta; permitimos email nulo
--    para usuarios "solo Strava". Email sigue siendo UNIQUE cuando exista.
ALTER TABLE athletes
  ALTER COLUMN email DROP NOT NULL;

-- 6. Índice parcial para acelerar findByStravaId.
CREATE INDEX IF NOT EXISTS idx_athletes_strava_id
  ON athletes(strava_id)
  WHERE strava_id IS NOT NULL;
