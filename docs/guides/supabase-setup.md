# Supabase setup

The **AI Mathematics Tutor** uses Supabase for:

- **Auth:** Email sign-in only (students, mathematics reviewers, and admins).
- **Postgres (`pgvector` + French full-text search):** Student profiles, TCS curriculum chapters/objectives, immutable **MAXI Maths** `source_revisions`, `document_chunks` (`vector(1024)` + `tsvector`), `tutoring_sessions`, `session_turns`, `turn_citations`, `media_assets`, `exercises`, `exercise_attempts`, and `study_plans`.
- **Private Storage:** Student-uploaded exercise photos only, under per-user path prefixes. Raw **MAXI Maths** sources never leave the local `data/` folder.

You need one hosted Supabase project before wiring up `backend/` and `frontend/`.

## 1. Create an account

1. Go to [supabase.com](https://supabase.com) and sign up (GitHub or email).
2. Confirm your email if prompted.
3. You land in the [dashboard](https://supabase.com/dashboard). The free tier is sufficient for the synthetic academic demo (no real-student pilot in `v0.1.0`).

## 2. Create a project

1. Open [New project](https://supabase.com/dashboard/new).
2. Pick your organization (a personal org is created automatically on first signup).
3. Set a **project name** (e.g. `ai-math-tutor-tcs`).
4. Choose a **database password** — save it somewhere safe; you need it for direct DB access, Alembic migrations, and `supabase link`.
5. Pick a **region** close to you (e.g. EU West / Paris or Frankfurt for low latency from Morocco).
6. Click **Create new project** and wait until status is healthy (~1–2 minutes).

## 3. Collect credentials

Configure these values in `backend/.env` and `frontend/.env` (validated in `backend/app/config.py` and `frontend/src/lib/env.ts`):

| Value | Where to find it | Used by |
| ----- | ---------------- | ------- |
| **Project URL** | Dashboard → **Project Settings** → **API** → Project URL | Frontend (`VITE_SUPABASE_URL`) + Backend (`SUPABASE_URL`) |
| **anon (public) key** | Same page → `anon` `public` key | Frontend (`VITE_SUPABASE_ANON_KEY`) + Backend (`SUPABASE_ANON_KEY`) |
| **service_role (secret) key** | Same page → `service_role` `secret` key | Reviewer CLI and ingestion only (`SUPABASE_SERVICE_ROLE_KEY`). The API does not read it. **Never expose to the browser** |
| **Project ref** | Dashboard URL `supabase.com/dashboard/project/<ref>` or `supabase projects list` | CLI commands |
| **Session-mode connection string** | Dashboard → **Connect** → **Session pooler** (IPv4) or **Direct connection** (IPv6 only on the free tier) | Backend (`DATABASE_URL`) & Alembic migrations |
| **Database password** | What you set at project creation | Direct Postgres connection |

From the CLI you can also print API keys:

```bash
supabase projects api-keys --project-ref <your-project-ref>
```

Keep `service_role` out of git, client bundles, and frontend env files.

## 4. Auth settings (email only)

This app uses email auth only — no Google/SSO.

1. Dashboard → **Authentication** → **Providers**.
2. Leave **Email** enabled.
3. For local dev, you may disable **Confirm email** under **Authentication** → **Email** so synthetic sign-up works without inbox access (re-enable for any future real-student use, which is out of scope for `v0.1.0`).

## 4b. JWT signing keys (required)

The API verifies access tokens against the project's JWKS and accepts only
asymmetric algorithms (`ES256`/`RS256`, `backend/app/auth/dependencies.py`).
Projects that still use the legacy shared HS256 secret publish no usable JWKS
key, so every request would return `401`.

1. Dashboard → **Project Settings** → **JWT Keys**.
2. If the project still uses the legacy secret, migrate to **JWT signing keys**
   and rotate so the new asymmetric key is the one in use.
3. Check `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` lists a key.

## 5. Private Storage buckets

Create private buckets for student media and copyrighted source files (never mark these buckets as public):

1. Dashboard → **Storage** → **New bucket**.
2. Create `exercise-photos` with **Public bucket** turned **OFF** (student exercise images; re-encoded and stripped of metadata by the API). In the bucket settings, set **Restrict file upload size** to `10 MB` and **Allowed MIME types** to `image/jpeg, image/png, image/webp`, so bad files are refused before they are stored.
3. Add `storage.objects` policies so an authenticated user can insert and select only objects whose path starts with their own user ID (`{user_id}/{session_id}/{asset_id}`). The browser uploads directly; the API reads with the student's JWT (plan §13.3, ADR 0003).

Do not upload raw **MAXI Maths** PDFs or scans to Storage: they stay local and gitignored under `data/` (plan §14.2). Only reviewed chunks live in Postgres.

## 6. Database schema management

The backend manages all Postgres tables, indexes, and RLS policies via SQLAlchemy models and Alembic migrations. Do not create production tables manually in the Supabase dashboard.

Alembic migrations create and update:

- The `vector` extension for `pgvector`
- `profiles`, `curriculum_chapters`, and `curriculum_objectives` (TCS scope)
- `source_documents`, `source_revisions`, and `document_chunks` (`vector(1024)` + generated `to_tsvector('french', chunk_text)`)
- HNSW and GIN indexes for scoped hybrid retrieval
- `tutoring_sessions`, `session_turns`, and `turn_citations`
- `media_assets`, `exercises`, `exercise_attempts`, and `study_plans`
- Row-Level Security (RLS) policies enforcing student ownership and cross-user isolation

Use a **session-mode** connection string for Alembic (Session pooler on IPv4 networks, or the direct host if you have IPv6), never the transaction pooler.

Through the Session pooler, a custom role logs in as `<role>.<project-ref>`: for example `postgresql+psycopg://app_runtime.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres` for `DATABASE_RUNTIME_URL`, and `postgres.<project-ref>` for `DATABASE_URL`.

Before the first migration, run `backend/scripts/bootstrap_runtime_role.sql` once in the SQL editor (replace both passwords). It creates `app_runtime` and `app_worker` and revokes the default `anon`/`authenticated` grants so PostgREST cannot read internal tables.

From `backend/`:

```bash
uv run alembic upgrade head
```

See [Backend setup](backend-setup.md) for the full Alembic workflow.

## 7. Data governance reminders (synthetic demo)

- Raw microphone audio is never persisted in Supabase Storage or Postgres.
- Synthetic records, exercise photos, and session logs are strictly access-controlled via Supabase Auth + RLS. No real-student pilot, consent collection, or CNDP filing happens in `v0.1.0`.
- Document and verify your backup/restore procedure (`pg_dump` / Supabase backups) before the demo.

## Next steps

- [Backend setup](backend-setup.md) — Python/FastAPI service, PydanticAI, and Alembic migrations
- [Frontend setup](frontend-setup.md) — React + KaTeX classroom SPA
