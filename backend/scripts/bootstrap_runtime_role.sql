-- Bootstrap the non-owner runtime role used by DATABASE_RUNTIME_URL.
--
-- Run once as the Supabase project owner (postgres) in the SQL editor.
-- Replace the password placeholder first; never commit the real password.
-- FORCE ROW LEVEL SECURITY is enabled per table in Alembic migrations.

do $$
begin
    if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
        create role app_runtime
            login
            password 'REPLACE_WITH_A_STRONG_PASSWORD'
            noinherit;
    end if;
end
$$;

grant usage on schema public to app_runtime;

-- Existing tables, if this is re-run after schema creation.
grant select, insert, update, delete on all tables in schema public to app_runtime;
grant usage, select on all sequences in schema public to app_runtime;

-- Tables created later by migrations.
alter default privileges in schema public
    grant select, insert, update, delete on tables to app_runtime;
alter default privileges in schema public
    grant usage, select on sequences to app_runtime;

-- app_runtime is deliberately not a member of any admin role and does not own tables.
