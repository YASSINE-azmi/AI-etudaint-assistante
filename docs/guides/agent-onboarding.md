# Agent onboarding — Windows 11

This is the fast, deterministic path for a teammate (or an AI coding agent) who
just cloned the repository on Windows 11. Follow it top to bottom. Do not invent
extra dependencies or change the stack.

The authoritative project plan is
[`docs/implementation-plan.md`](../implementation-plan.md). If this guide and the
plan disagree, the plan wins.

## 0. What is implemented right now

This is the **Week-1 foundation**, not the finished tutor:

- FastAPI service with `/health`, `/ready`, `/api/v1/me`, request IDs, logging
- Supabase JWKS token verification and an async database session factory
- Alembic scaffolding and the `app_runtime` bootstrap SQL
- A French classroom shell with routing, responsive navigation, and an env gate
- Playwright smoke tests

Not implemented yet:

- database tables and migrations
- MAXI Maths ingestion, corpus, and retrieval
- session/turn endpoints and SSE streaming
- the real tutor, practice flow, study planner, and auth UI

`/health` will work without a database. `/ready` needs a reachable Postgres.
The classroom is intentionally a shell; do not claim that tutoring works.

## 1. Install the tools

Open **PowerShell** (Windows Terminal is fine). Install Git, Node.js LTS, and
Chrome:

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Google.Chrome -e
```

Install `uv` with the official installer:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Close and reopen PowerShell so PATH changes take effect, then check:

```powershell
git --version
node --version
npm --version
uv --version
```

Install pnpm 12.18.0 (the version pinned in `frontend/package.json`):

```powershell
npm install -g pnpm@12.18.0
pnpm --version
```

Install Python 3.12 through `uv`. This avoids depending on a system Python and
matches `backend/.python-version`:

```powershell
uv python install 3.12
```

## 2. Clone and select the branch

```powershell
git clone https://github.com/YASSINE-azmi/AI-etudaint-assistante.git
cd AI-etudaint-assistante
git switch grunt
```

`grunt` is the delivery branch for this foundation. After it is merged, use
`master` instead.

## 3. External credentials the team must provide

These cannot be installed from the repository.

### Supabase

Create or reuse a Supabase project, then collect:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (reviewer CLI/ingestion only; the API does not read it; never put it in the frontend)
- a **session-mode** Postgres connection string: the Session pooler (port 5432) on IPv4 networks, or the IPv6-only direct host; never the transaction pooler

The API uses a non-owner runtime role so `FORCE ROW LEVEL SECURITY` can apply.
Run [`backend/scripts/bootstrap_runtime_role.sql`](../../backend/scripts/bootstrap_runtime_role.sql)
once as the project owner, replacing both password placeholders. It creates
`app_runtime` (API) and `app_worker` (worker) and revokes PostgREST's default
`anon`/`authenticated` grants. Then set `DATABASE_RUNTIME_URL` with the
`app_runtime` user.

For a local database instead, `docker compose up -d postgres` creates the same
roles with local passwords (see [backend setup](backend-setup.md#local-postgres)).

Do not use the service-role key in the browser. Do not commit `.env`.

### AI provider

The future tutor uses one OpenAI-compatible provider. Set
`AI_PROVIDER_BASE_URL` and `AI_PROVIDER_API_KEY` in `backend/.env`. The current
shell does not call the provider, but the settings module requires the values to
start.

### MAXI Maths corpus

Raw PDFs and extracts stay local and gitignored under `data/`. They are not in
the repository. Do not upload them to GitHub.

## 4. Configure the backend

```powershell
cd backend
Copy-Item .env.example .env
```

Open `backend/.env` and replace every placeholder with the real values from
step 3. Keep the variable names exactly as they appear in
`backend/.env.example`; `app/config.py` is the single source of truth.

```powershell
uv sync --frozen
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Notes:

- `uv sync --frozen` installs the locked environment and uses Python 3.12.
- There are **no migration revisions yet**, so `alembic upgrade head` currently
  connects to the database and does nothing. That is expected.
- The API runs at `http://127.0.0.1:8000`. Open `/health` and `/docs`.
- `/ready` returns `503` until a reachable database is configured.

## 5. Configure the frontend

Open a second PowerShell window:

```powershell
cd AI-etudaint-assistante\frontend
Copy-Item .env.example .env
```

Set only browser-safe values in `frontend/.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Never add the service-role key, database URL, or AI provider key to this file.

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

The classroom opens at `http://localhost:5173`. If a required `VITE_` value is
missing, the app shows a setup screen instead of crashing.

## 6. Verify the clone

Run every check before reporting success. In `backend/`:

```powershell
uv run ruff check app tests alembic
uv run ruff format --check app tests alembic
uv run mypy app
uv run python -m pytest
```

Use `uv run python -m pytest`, not `uv run pytest`. Some Windows Application
Control policies block the `pytest.exe` console script even when the package
works.

In `frontend/`:

```powershell
pnpm typecheck
pnpm lint
pnpm build
$env:PLAYWRIGHT_CHANNEL='chrome'; pnpm test:e2e
```

`PLAYWRIGHT_CHANNEL=chrome` reuses the Chrome you installed with `winget` and
avoids the bundled Chromium download. On CI, install bundled Chromium instead:

```powershell
pnpm exec playwright install chromium
pnpm test:e2e
```

Expected result for this foundation: 4 backend tests and 2 Playwright tests pass.

## 7. Rules for the AI agent

- Read [`AGENTS.md`](../../AGENTS.md), then
  [`backend/AGENTS.md`](../../backend/AGENTS.md) and
  [`frontend/AGENTS.md`](../../frontend/AGENTS.md).
- Read the relevant section of
  [`docs/implementation-plan.md`](../implementation-plan.md) before changing
  scope.
- Use `uv` for backend dependencies and `pnpm` for frontend dependencies.
- Do not add a package without checking the dependency policy in `AGENTS.md`.
- Do not read environment variables outside `backend/app/config.py` or
  `frontend/src/lib/env.ts`.
- Do not use `npm install` or `yarn` in `frontend/`.
- Do not commit `.env`, raw MAXI Maths files, provider keys, or service-role keys.
- Do not use 1BAC, 2BAC, or university content.
- Do not claim that the tutoring pipeline works until it is actually built.
- Do not merge to `master`. Push the branch and let the project owner merge.

## 8. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `uv` not found after install | Close and reopen PowerShell, then retry. |
| `uv sync` cannot find Python 3.12 | Run `uv python install 3.12` again. |
| `uv run pytest` is blocked | Use `uv run python -m pytest`. |
| Playwright browser download is slow or blocked | Use `$env:PLAYWRIGHT_CHANNEL='chrome'; pnpm test:e2e`. |
| Port 5173 or 8000 is already in use | Stop the other process, or run `pnpm dev --port 5174` and update `VITE_API_BASE_URL` only if the backend port changed. |
| Backend starts but `/ready` returns 503 | Check `DATABASE_RUNTIME_URL`, the database password, and network access to Supabase. |
| Frontend shows the setup screen | Fill in all three `VITE_` variables in `frontend/.env` and restart `pnpm dev`. |
| Git reports CRLF warnings | Harmless on Windows; do not rewrite the whole repository to fix them. |

## 9. Definition of done for a fresh clone

A clone is ready when all of these are true:

1. `uv sync --frozen` completes.
2. `uv run uvicorn app.main:app --reload` serves `/health`.
3. `pnpm install --frozen-lockfile` completes.
4. `pnpm dev` opens the French classroom shell.
5. Backend lint, format, type checks, and tests pass.
6. Frontend typecheck, lint, build, and Playwright tests pass.

If a step fails, stop and report the exact command and error. Do not hide a
setup failure behind a mock or a placeholder.
