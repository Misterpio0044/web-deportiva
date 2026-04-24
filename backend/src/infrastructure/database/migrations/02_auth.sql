-- 02_auth.sql: añade soporte de autenticación y roles a athletes

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
    CHECK (role IN ('admin', 'user')),
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_athletes_role ON athletes(role);
