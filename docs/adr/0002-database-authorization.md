# ADR 0002 — Database authorization: JWT claims GUC + service-role isolation

- **Status:** Accepted
- **Date:** 24 November 2026

## Context

The plan said policies use `auth.uid()` and the API connects via a non-owner
`app_runtime` role. But direct SQLAlchemy connections do not set Supabase's
`request.jwt.claims`, so `auth.uid()` would be null. Supabase PostgREST also
exposes `public` tables to the anon key unless access is explicitly revoked.

## Decision

- The API uses direct SQLAlchemy with the non-owner `app_runtime` role. Per
  transaction it sets `request.jwt.claims` from the verified JWT and
  `SET LOCAL ROLE authenticated` before queries.
- Grant `app_runtime` usage on the `auth` schema and execute on `auth.uid()`,
  or use `current_setting('request.jwt.claims', true)` policies.
- Enable and `FORCE ROW LEVEL SECURITY` on every `public` table; revoke direct
  `anon`/`authenticated` table grants so PostgREST cannot read
  `document_chunks.chunk_text`, `exercises.answer_schema`, or `profiles.role`.
- Role source is JWT `app_metadata.role`; `profiles.role` is display-only.
- `AdminSettings` (holding `SUPABASE_SERVICE_ROLE_KEY`) is separate from the API
  settings; the API process starts without the service key.

## Consequences

- `FORCE RLS` becomes a real enforcement boundary, not aspiration.
- Requires a transaction wrapper in the DB session layer and a cross-user
  isolation test using a real JWT and a direct PostgREST attempt.
- Students cannot read textbook chunks or answer schemas or self-promote.
