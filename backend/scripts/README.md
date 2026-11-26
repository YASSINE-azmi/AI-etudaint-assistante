# Backend scripts

- `bootstrap_runtime_role.sql` creates the non-owner `app_runtime` (API) and
  `app_worker` (background worker) roles and revokes the default Supabase
  `anon`/`authenticated` table grants. Run it once as the Supabase project owner,
  with real passwords substituted for both placeholders. Table-level
  `FORCE ROW LEVEL SECURITY` and policies belong in Alembic migrations.
- `local_supabase_shim.sql` creates the `anon` and `authenticated` roles on a plain
  Postgres. **Local and CI only.**
- `local_db_init.sh` runs the shim and the bootstrap with local passwords. Docker
  Compose mounts it as an init script; CI runs it before migrations.
