-- Eliminar tablas vacías y sin uso
DROP TABLE IF EXISTS splits_metric;
DROP TABLE IF EXISTS laps;

-- Eliminar columnas de athletes que se almacenaban pero nunca se consultaban
ALTER TABLE athletes DROP COLUMN IF EXISTS profile_medium_url;
ALTER TABLE athletes DROP COLUMN IF EXISTS profile_url;
ALTER TABLE athletes DROP COLUMN IF EXISTS resting_heartrate;
ALTER TABLE athletes DROP COLUMN IF EXISTS measurement_preference;
