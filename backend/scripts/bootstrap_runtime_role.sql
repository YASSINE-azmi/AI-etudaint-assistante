-- Bootstrap the non-owner database roles used by the API and the worker.
--
-- Run once as the Supabase project owner (postgres) in the SQL editor.
-- Replace both password placeholders first; never commit the real passwords.
-- FORCE ROW LEVEL SECURITY and the policies are created per table in Alembic migrations.
--
-- Authorization model (plan §5.3, ADR 0002):
-- * The API connects as `app_runtime` and STAYS `app_runtime`. It never runs
--   `SET ROLE authenticated`: that role's table grants are revoked below so PostgREST
--   cannot read internal tables, and switching to it would deny the API too.
-- * Per transaction the API runs
--   `select set_config('request.jwt.claims', <verified JWT claims json>, true)`;
--   policies read the caller through `public.request_user_id()` (first table migration).
-- * `app_runtime` is not the table owner and has no BYPASSRLS, so RLS always applies to it.
-- * `app_worker` is the background worker's login. It also has no BYPASSRLS; migrations
--   give it explicit `TO app_worker` policies on the tables it recovers or cleans up.

do $$
begin
    if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
        create role app_runtime
            login
            password 'REPLACE_WITH_A_STRONG_PASSWORD'
            noinherit;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'app_worker') then
        create role app_worker
            login
            password 'REPLACE_WITH_A_STRONG_WORKER_PASSWORD'
            noinherit;
    end if;
end
$$;

grant usage on schema public to app_runtime, app_worker;

-- Existing tables, if this is re-run after schema creation.
grant select, insert, update, delete on all tables in schema public to app_runtime, app_worker;
grant usage, select on all sequences in schema public to app_runtime, app_worker;

-- Tables created later by migrations (run as postgres).
alter default privileges for role postgres in schema public
    grant select, insert, update, delete on tables to app_runtime, app_worker;
alter default privileges for role postgres in schema public
    grant usage, select on sequences to app_runtime, app_worker;

-- Supabase grants every new public table to anon/authenticated by default, which exposes
-- it through PostgREST. FastAPI is the only student data path, so revoke both.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges for role postgres in schema public
    revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
    revoke all on sequences from anon, authenticated;

-- Neither role is a member of any admin role, owns tables, or may switch roles.
