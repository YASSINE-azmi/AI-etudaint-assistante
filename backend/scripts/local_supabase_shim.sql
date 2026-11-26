-- Local and CI only. Never run this on the hosted Supabase project.
--
-- A plain Postgres (docker-compose, CI) lacks the roles Supabase creates. Creating
-- them here lets the same migrations and bootstrap script run unchanged.

do $$
begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin noinherit;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin noinherit;
    end if;
end
$$;
