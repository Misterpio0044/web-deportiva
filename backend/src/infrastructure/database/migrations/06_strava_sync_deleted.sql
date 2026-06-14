-- Número de actividades eliminadas en la última sincronización con Strava
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS last_strava_sync_deleted INTEGER;
