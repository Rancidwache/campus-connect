-- One-time database bootstrap for local development.
-- Run this once as the PostgreSQL superuser, then `npm run db:migrate` handles
-- the rest.
--
--   psql -U postgres -h 127.0.0.1 -f scripts/bootstrap-db.sql
--
-- (Skip this file entirely if you use the bundled docker-compose.yml — that image
--  creates the role and database from its environment variables.)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'campusconnect') THEN
    CREATE ROLE campusconnect LOGIN PASSWORD 'campusconnect';
  END IF;
END
$$;

SELECT 'CREATE DATABASE campusconnect OWNER campusconnect'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'campusconnect')\gexec

GRANT ALL PRIVILEGES ON DATABASE campusconnect TO campusconnect;
