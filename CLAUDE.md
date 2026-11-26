# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Per-service rules are not auto-loaded — read [backend/AGENTS.md](backend/AGENTS.md) before touching `backend/` and [frontend/AGENTS.md](frontend/AGENTS.md) before touching `frontend/`. If any doc conflicts with [docs/implementation-plan.md](docs/implementation-plan.md), the plan wins. Decision IDs like `D-28` and `§5.3` refer to that plan; architectural decisions are in [docs/adr/](docs/adr/).

## Commands

Backend (run from `backend/`, managed with `uv`; Python 3.12):

```sh
uv sync --frozen                                   # install
uv run uvicorn app.main:app --reload               # dev server (needs backend/.env, see .env.example)
uv run ruff check app tests alembic                # lint
uv run ruff format --check app tests alembic       # format check (CI enforces)
uv run mypy app                                    # strict type check
uv run python -m pytest -m "not integration"       # fast suite: no network, no DB
uv run python -m pytest tests/test_me.py::test_name  # single test
uv run alembic upgrade head                        # migrations (DATABASE_URL, session-mode connection)
```

Always use `python -m pytest`, not the `pytest` console script — Windows Application Control blocks the latter.

Integration tests (`-m integration`) need the local Postgres: `docker compose up -d postgres` from the repo root (pgvector/pg16; its init script creates the Supabase `anon`/`authenticated` shim plus the non-superuser `app_runtime` / `app_worker` roles), then `uv run alembic upgrade head` and run with `DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/ai_math_tutor` and `DATABASE_RUNTIME_URL=postgresql+psycopg://app_runtime:app_runtime_password@localhost:5432/ai_math_tutor`.

Frontend (run from `frontend/`, **pnpm only**):

```sh
pnpm install --frozen-lockfile
pnpm dev                 # Vite dev server on :5173
pnpm typecheck           # tsc -b
pnpm lint                # oxlint
pnpm build
pnpm test:e2e            # Playwright (e2e/); single spec: pnpm exec playwright test e2e/smoke.spec.ts
```

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs all of the above plus `pip-audit`, `pnpm audit --audit-level high`, gitleaks, and Docker builds of both services. Both package managers refuse releases younger than 7 days (`exclude-newer` in `pyproject.toml`, `minimum-release-age` in `.npmrc`) — don't lower it.

## Architecture

- **Two services, no Node server:** a FastAPI API (`backend/app`) and a static Vite React SPA (`frontend/`, served by nginx in Docker). The SPA talks to the API at `VITE_API_BASE_URL`; routes are mounted under `/api/v1` (health routes at the root).
- **App wiring:** `app/main.py` `create_app()` + `lifespan` builds the async SQLAlchemy engine, session factory and Supabase `PyJWKClient`, and stores them on `app.state`. Dependencies read from `app.state` (`database/session.py:get_session`, `auth/dependencies.py:get_current_user`) — no module globals.
- **Auth:** the API verifies Supabase access tokens itself against the project JWKS (ES256/RS256, `aud=authenticated`). Role comes from `app_metadata.role` (`student` / `reviewer` / `admin`), defaulting to `student`.
- **Three settings classes in `app/config.py`, on purpose:** `Settings` (API runtime), `MigrationSettings` (Alembic, `DATABASE_URL` only), and `AdminSettings` (service-role key; reviewer CLI and ingestion only). The API process must never load `AdminSettings`, `app.database.admin`, `ingest`, or the `supabase` client — [tests/test_service_role_boundary.py](backend/tests/test_service_role_boundary.py) enforces this by scanning the student-facing packages (`app/api`, `auth`, `classroom`, `assistant`, `retrieval`, `validation`).
- **Database roles and RLS:** the API connects as `app_runtime` via `DATABASE_RUNTIME_URL`, background jobs as `app_worker`; migrations run as the owner via `DATABASE_URL`. RLS policies target those roles and use `public.request_user_id()`; the API never runs `SET ROLE` (ADR 0002). Role bootstrap SQL lives in `backend/scripts/`; policies, `FORCE ROW LEVEL SECURITY`, pgvector, French `tsvector` columns and HNSW/GIN indexes go in explicit Alembic operations.
- **Test env:** `tests/conftest.py` sets dummy env vars before `app.main` imports (settings validate at import), switches to `WindowsSelectorEventLoopPolicy` on Windows (psycopg async requirement), and strips `SUPABASE_SERVICE_ROLE_KEY`.
- **Planned modules** (retrieval with RRF, Four-Gate `validation/`, PydanticAI tutor agent, `providers/`, budget ledger, jobs, `ingest/`) are described in [backend/AGENTS.md](backend/AGENTS.md) but mostly not written yet; the frontend pages are placeholders. Check what exists before assuming a module is there.

## Output & Communication Rule

After completing any command, file edit, or sub-agent task, ALWAYS print a concise 3–5 bullet summary in the main chat explaining:
1. Which files were created or modified.
2. Which tests or checks were executed.
3. The exact outcome and next step.
Never finish a turn silently after a tool call.
