# CI/CD and deployment

This page explains the automated pipelines and how to ship the demo. The CI
pipeline is active now; the CD (deploy) pipeline is prepared but deferred until
the end of the project.

## CI — `.github/workflows/ci.yml`

Runs on every push to `master`/`grunt` and every pull request. Three jobs:

| Job | What it checks |
| --- | --- |
| **Backend** | `uv sync --frozen` → `ruff check` → `ruff format --check` → `mypy app` → `pytest -m "not integration"` → `pip-audit` on the locked dependencies |
| **Frontend** | `pnpm install --frozen-lockfile` → `pnpm audit` → `typecheck` → `lint` → `build` → Playwright E2E smoke |
| **Security** | `gitleaks` scans the full history for leaked secrets |

Notes:

- Backend unit tests run with `-m "not integration"` so they hit no network and
  no database. Integration tests (live Postgres/pgvector) are added separately
  behind the `integration` marker.
- `pip-audit` reads a `requirements.txt` exported from the frozen `uv.lock`.
- Playwright browsers are cached; failures upload the report as an artifact.

## CD — `.github/workflows/deploy.yml` (deferred)

Triggered by a tag push (`v*`) or manually. It builds and publishes two images
to GitHub Container Registry:

- `ghcr.io/<org>/<repo>/backend` — FastAPI + uvicorn (`backend/Dockerfile`)
- `ghcr.io/<org>/<repo>/frontend` — the Vite SPA behind nginx (`frontend/Dockerfile`)

The frontend image takes three **public** build-time variables (never secrets):

- `VITE_API_BASE_URL` — the deployed backend URL
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — the browser-safe anon key

Set these as GitHub Actions **variables** (not secrets) under
Repository → Settings → Actions → Variables.

The Railway step is skipped until `RAILWAY_TOKEN` is configured.

## Finishing CD at the end

1. Create two Railway services (backend + frontend) from the repo, pointing each
   at its subdirectory, or deploy the GHCR images directly.
2. Add `RAILWAY_TOKEN` (Repository → Settings → Actions → Secrets) and an
   `environment` named `demo`.
3. Set the backend environment variables in Railway (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL`,
   `DATABASE_RUNTIME_URL`, `AI_PROVIDER_*`, `ALLOWED_ORIGINS`, etc.). Never set
   `SUPABASE_SERVICE_ROLE_KEY` on the API service: it is for the local reviewer CLI only.
4. Set the three `VITE_*` variables in GitHub Actions, then push a `v*` tag or
   run the workflow manually.

The demo remains local-first: nothing deploys automatically, and no production
environment exists until the team opts in.
