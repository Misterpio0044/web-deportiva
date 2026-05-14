-- 03_register.sql: soporte para registro de usuarios locales
--
-- La tabla athletes.id es BIGINT sin auto-increment porque originalmente
-- estaba pensada para recibir IDs proporcionados por la API de Strava.
-- Para permitir registros locales sin colisionar con IDs reales de Strava,
-- creamos una secuencia que empieza en un rango muy alto (9 mil millones).
-- Strava no opera en ese rango, por lo que ambos mundos conviven sin choques.

CREATE SEQUENCE IF NOT EXISTS athletes_local_id_seq
  START WITH 9000000000
  INCREMENT BY 1
  NO CYCLE;
