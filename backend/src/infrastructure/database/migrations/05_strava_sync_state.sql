-- Estado de la última sincronización con Strava
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS last_strava_sync_status VARCHAR(20);
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS last_strava_sync_error TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS last_strava_sync_created INTEGER;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS last_strava_sync_updated INTEGER;

ALTER TABLE athletes DROP CONSTRAINT IF EXISTS athletes_sync_status_check;
ALTER TABLE athletes ADD CONSTRAINT athletes_sync_status_check
  CHECK (last_strava_sync_status IS NULL OR last_strava_sync_status IN ('success', 'error'));
