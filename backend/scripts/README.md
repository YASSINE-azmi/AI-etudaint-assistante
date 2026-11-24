# Backend scripts

`bootstrap_runtime_role.sql` creates the non-owner `app_runtime` role used by
`DATABASE_RUNTIME_URL`. Run it once as the Supabase project owner, with a real
password substituted for the placeholder. Table-level `FORCE ROW LEVEL SECURITY`
belongs in Alembic migrations, not in this bootstrap script.
