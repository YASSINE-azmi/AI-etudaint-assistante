# ADR 0002 — Database authorization: JWT claims GUC + service-role isolation

- **Status:** Accepted
- **Date:** 24 November 2026 (revised 26 November 2026, D-35)

## Context

The plan said policies use `auth.uid()` and the API connects via a non-owner
`app_runtime` role. But direct SQLAlchemy connections do not set Supabase's
`request.jwt.claims`, so `auth.uid()` would be null. Supabase PostgREST also
exposes `public` tables to the anon key unless access is explicitly revoked.

## Decision

- The API uses direct SQLAlchemy with the non-owner `app_runtime` role (no
  `BYPASSRLS`). Per transaction it runs
  `select set_config('request.jwt.claims', <claims json>, true)` with the
  verified JWT claims. It **stays** `app_runtime` and never runs
  `SET ROLE authenticated`.
- Policies are written `TO app_runtime` and read the caller through
  `public.request_user_id()`, a `stable` SQL function over
  `current_setting('request.jwt.claims', true)::jsonb ->> 'sub'`. No grant on
  the Supabase `auth` schema is needed, and the same migrations run on plain
  Postgres in CI.
- The background worker logs in as a separate `app_worker` role (no
  `BYPASSRLS`) with explicit `TO app_worker` policies on the tables it recovers
  or cleans up.
- Enable and `FORCE ROW LEVEL SECURITY` on every `public` table; revoke direct
  `anon`/`authenticated` table grants so PostgREST cannot read
  `document_chunks.chunk_text`, `exercises.answer_schema`, or `profiles.role`.
- Role source is JWT `app_metadata.role`; `profiles.role` is display-only.
- `AdminSettings` (holding `SUPABASE_SERVICE_ROLE_KEY`) is separate from the API
  settings; the API process starts without the service key.

### Revision (26 November 2026)

The first version also told the API to `SET LOCAL ROLE authenticated`. That
cannot work together with revoking `authenticated`'s table grants: the switch
needs `app_runtime` to be a member of `authenticated`, and once switched, every
query runs with the revoked privileges and is denied. The API therefore keeps
its own role, and `authenticated` stays revoked for PostgREST only.

## Consequences

- `FORCE RLS` becomes a real enforcement boundary, not aspiration.
- Requires a transaction wrapper in the DB session layer and a cross-user
  isolation test using a real JWT and a direct PostgREST attempt. RLS tests must
  connect as the non-superuser `app_runtime`: a superuser bypasses RLS, which is
  why CI and Docker Compose now run Postgres as `postgres` and create the roles
  with `backend/scripts/local_db_init.sh`.
- Students cannot read textbook chunks or answer schemas or self-promote.
