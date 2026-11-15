# Supabase setup

The **AI Mathematics Tutor** uses Supabase for:

- **Auth:** Email sign-in only (students, mathematics reviewers, and admins).
- **Postgres (`pgvector` + French full-text search):** Student profiles, TCS curriculum chapters/objectives, immutable **MAXI Maths** `source_revisions`, `document_chunks` (`vector(1536)` + `tsvector`), `tutoring_sessions`, `session_turns`, `turn_citations`, `board_snapshots`, `media_assets`, `exercises`, `exercise_attempts`, and `study_plans`.
- **Private Storage:** Student-uploaded exercise photos and restricted **MAXI Maths** source materials (accessed exclusively via short-lived signed URLs).

You need one hosted Supabase project before wiring up `backend/` and `frontend/`.

## 1. Create an account

1. Go to [supabase.com](https://supabase.com) and sign up (GitHub or email).
2. Confirm your email if prompted.
3. You land in the [dashboard](https://supabase.com/dashboard). The free tier is sufficient for local development and the consented PFE pilot.

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
| **service_role (secret) key** | Same page → `service_role` `secret` key | Backend only (`SUPABASE_SERVICE_ROLE_KEY`) — **never expose to the browser** |
| **Project ref** | Dashboard URL `supabase.com/dashboard/project/<ref>` or `supabase projects list` | CLI commands |
| **Direct database connection string** | Dashboard → **Project Settings** → **Database** → Connection string (Direct / Session) | Backend (`DATABASE_URL`) & Alembic migrations |
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
3. For local dev, you may disable **Confirm email** under **Authentication** → **Email** so sign-up works without inbox access (re-enable for the consented student pilot and production).

## 5. Private Storage buckets

Create private buckets for student media and copyrighted source files (never mark these buckets as public):

1. Dashboard → **Storage** → **New bucket**.
2. Create `exercise-photos` with **Public bucket** turned **OFF** (for student-uploaded exercise images after metadata stripping).
3. Create `maxi-sources` with **Public bucket** turned **OFF** (for restricted **MAXI Maths** review assets, accessed only by reviewers/backend via signed URLs).

## 6. Database schema management

The backend manages all Postgres tables, indexes, and RLS policies via SQLAlchemy models and Alembic migrations. Do not create production tables manually in the Supabase dashboard.

Alembic migrations create and update:

- The `vector` extension for `pgvector`
- `profiles`, `curriculum_chapters`, and `curriculum_objectives` (TCS scope)
- `source_documents`, `source_revisions`, and `document_chunks` (`vector(1536)` + generated `to_tsvector('french', chunk_text)`)
- HNSW and GIN indexes for scoped hybrid retrieval
- `tutoring_sessions`, `session_turns`, `turn_citations`, and `board_snapshots`
- `media_assets`, `exercises`, `exercise_attempts`, and `study_plans`
- Row-Level Security (RLS) policies enforcing student ownership and cross-user isolation

Use the **direct/session** database connection string for Alembic—never the transaction pooler connection string.

From `backend/`:

```bash
uv run alembic upgrade head
```

See [Backend setup](backend-setup.md) for the full Alembic workflow.

## 7. Pilot & data governance reminders

- Raw microphone audio is never persisted in Supabase Storage or Postgres.
- Student records, exercise photos, and session logs are strictly access-controlled via Supabase Auth + RLS, in line with institutional pilot consent and Moroccan Law 09-08 (CNDP) guidelines.
- Document and verify your backup/restore procedure (`pg_dump` / Supabase backups) before running the consented student pilot.

## Next steps

- [Backend setup](backend-setup.md) — Python/FastAPI service, PydanticAI, and Alembic migrations
- [Frontend setup](frontend-setup.md) — React + Excalidraw/KaTeX classroom SPA
