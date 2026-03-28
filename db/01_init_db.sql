SET client_encoding = 'UTF8';

-- Create Schema
CREATE SCHEMA "celadon_schema";

-- Revoke public schema
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE celadon FROM PUBLIC;
REVOKE ALL PRIVILEGES ON SCHEMA public FROM PUBLIC;
REVOKE USAGE ON SCHEMA public from PUBLIC;


-- Read-only role
CREATE ROLE celadon_ro NOLOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT;
GRANT CONNECT ON DATABASE celadon TO celadon_ro;
GRANT USAGE ON SCHEMA celadon_schema TO celadon_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA celadon_schema TO celadon_ro;
ALTER ROLE celadon_ro IN DATABASE celadon SET search_path TO celadon_schema;


-- Read/write role
CREATE ROLE celadon_rw NOLOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB NOINHERIT;
GRANT CONNECT, TEMPORARY ON DATABASE celadon TO celadon_rw;
GRANT USAGE, CREATE ON SCHEMA celadon_schema TO celadon_rw;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA celadon_schema TO celadon_rw;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA celadon_schema TO celadon_rw;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA celadon_schema TO celadon_rw;
ALTER ROLE celadon_rw IN DATABASE celadon SET search_path TO celadon_schema;

-- Set database search paths
ALTER DATABASE celadon SET search_path TO celadon_schema;


-- Create Service User
CREATE USER celadon WITH PASSWORD 'XXX_FAKE_PASSWORD_XXX' NOSUPERUSER NOCREATEROLE NOCREATEDB INHERIT;
GRANT celadon_rw to celadon;


-- Event trigger: auto-assign ownership to celadon_rw on new objects
CREATE OR REPLACE FUNCTION trg_create_set_celadon_rw_owner()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'CREATE INDEX')
      AND schema_name NOT LIKE 'pg_temp%'
  LOOP
    IF obj.schema_name = 'celadon_schema' THEN
      EXECUTE format('ALTER %s %s OWNER TO celadon_rw', obj.object_type, obj.object_identity);
    END IF;
  END LOOP;
END;
$function$;

CREATE EVENT TRIGGER trg_create_set_celadon_rw_owner
 ON ddl_command_end
 WHEN tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'CREATE INDEX')
 EXECUTE FUNCTION trg_create_set_celadon_rw_owner();


-- ══════════════════════════════════════════════════════════════════════════════
-- Default privileges for future objects
-- ══════════════════════════════════════════════════════════════════════════════
-- IMPORTANT: ALTER DEFAULT PRIVILEGES without FOR ROLE only applies to the user
-- running this script (root/postgres). It does NOT cover tables created by the
-- service account in production. We must explicitly set default privileges for
-- every role that creates objects:
--   • celadon     — the service account (creates tables at runtime)
--   • celadon_rw  — the event trigger reassigns ownership here
-- Without these, _ro users silently lose access to new tables over time.
-- ══════════════════════════════════════════════════════════════════════════════

GRANT celadon TO CURRENT_USER;
GRANT celadon_rw TO CURRENT_USER;

-- When the service account creates tables/sequences → _ro gets SELECT
ALTER DEFAULT PRIVILEGES FOR ROLE celadon IN SCHEMA celadon_schema
  GRANT SELECT ON TABLES TO celadon_ro;
ALTER DEFAULT PRIVILEGES FOR ROLE celadon IN SCHEMA celadon_schema
  GRANT SELECT ON SEQUENCES TO celadon_ro;

-- When anything owned by _rw creates tables/sequences → _ro gets SELECT
ALTER DEFAULT PRIVILEGES FOR ROLE celadon_rw IN SCHEMA celadon_schema
  GRANT SELECT ON TABLES TO celadon_ro;
ALTER DEFAULT PRIVILEGES FOR ROLE celadon_rw IN SCHEMA celadon_schema
  GRANT SELECT ON SEQUENCES TO celadon_ro;

-- Ensure _rw gets full access on objects created by the service account
ALTER DEFAULT PRIVILEGES FOR ROLE celadon IN SCHEMA celadon_schema
  GRANT ALL ON TABLES TO celadon_rw;
ALTER DEFAULT PRIVILEGES FOR ROLE celadon IN SCHEMA celadon_schema
  GRANT ALL ON SEQUENCES TO celadon_rw;

REVOKE celadon FROM CURRENT_USER;
REVOKE celadon_rw FROM CURRENT_USER;
