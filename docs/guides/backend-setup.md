# Backend setup

The **AI Mathematics Tutor** uses a dedicated Python + FastAPI backend to own authentication checks, Tronc Commun Scientifique (TCS) curriculum scoping, hybrid retrieval over published **MAXI Maths** chapters, PydanticAI orchestration, deterministic four-gate validation, math/rendering safety checks, and speech/vision provider adapters. Keeping this logic behind FastAPI keeps the React classroom SPA thin and prevents AI keys, service-role credentials, or unvalidated math outputs from reaching the browser.

New to the project on Windows 11? Start with [Agent onboarding](agent-onboarding.md), then return here for the backend details.

## Prerequisites

- Python `3.12+`
- [`uv`](https://docs.astral.sh/uv/getting-started/installation/)
- A configured Supabase project (see [Supabase setup](supabase-setup.md))
- An OpenAI-compatible API key for LLM, Vision/OCR, STT, TTS, and embeddings

## Init (from `backend/`)

All runtime and dev dependencies are declared in `backend/pyproject.toml`. Sync the lockfile; do not add them ad hoc.

```bash
cd backend
uv sync
```

## Environment configuration

Backend settings are loaded from a single typed module (`backend/app/config.py`) using `pydantic-settings`. Do not call `os.getenv` or `load_dotenv` in application modules.

Copy `backend/.env.example` to `backend/.env` and set:

| Variable | Purpose |
| -------- | ------- |
| `SUPABASE_URL` | Hosted Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for the reviewer CLI and ingestion (never expose to frontend) |
| `DATABASE_URL` | Direct/session Postgres connection string for Alembic |
| `DATABASE_RUNTIME_URL` | API connection using the non-owner `app_runtime` role |
| `AI_PROVIDER_BASE_URL` | OpenAI-compatible base URL |
| `AI_PROVIDER_API_KEY` | Server-side API key for LLM, Vision/OCR, STT, TTS, and embeddings |
| `LLM_MODEL_NAME` | Chat/reasoning model identifier |
| `EMBEDDING_MODEL_NAME` | Embedding model identifier (`vector(1536)`) |
| `EMBEDDING_DIMENSIONS` | Must match the pgvector column (`1536`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (e.g. `http://localhost:5173`) |
| `TRIAL_CREDIT_BUDGET_USD` | Global trial-credit budget; hard stop when exhausted |
| `MAX_TURN_INPUT_TOKENS` / `MAX_TURN_OUTPUT_TOKENS` | Per-turn token limits |
| `TURN_TIMEOUT_SECONDS` | Hard timeout for a turn |
| `MAX_TURNS_PER_SESSION` | Per-session turn limit |
| `RETRIEVAL_TOP_K` / `RRF_K` | Hybrid retrieval parameters |
| `PROMPT_VERSION` | Active prompt version |

`backend/.env.example` is the canonical list. Keep it in sync with `app/config.py`.

Model settings are **per role**, not routed per request: `LLM_MODEL_NAME` answers, `EMBEDDING_MODEL_NAME` embeds, `VISION_MODEL_NAME` reads photos, and the STT/TTS names drive speech. There is no router, no dynamic model selection, and no automatic provider failover (plan §8.9, ADR 0008).

## Database migrations

Alembic owns database schema changes. SQLAlchemy models live in `backend/app/database/models/`, and Alembic migrations apply them to Supabase Postgres.

Alembic is already initialized in `backend/alembic/`. Import every new model module in
`app/database/models/__init__.py` so autogenerate sees its metadata.

`alembic/env.py` reads `DATABASE_URL` from `app.config.get_settings()`. Always use the **direct/session** Supabase database connection string—not the transaction pooler URL—for migrations.

Create a migration after changing SQLAlchemy models:

```bash
uv run alembic revision --autogenerate -m "add tutor and curriculum tables"
```

Always review the generated migration in `backend/alembic/versions/` and add explicit `op.execute(...)` operations for Postgres/Supabase features that autogenerate cannot reliably infer:

- `create extension if not exists vector`
- `vector(1536)` embedding columns on `document_chunks`
- Generated French full-text search `tsvector` columns (`to_tsvector('french', chunk_text)`)
- HNSW and GIN indexes for hybrid retrieval
- Row-Level Security (RLS) enablement, `FORCE ROW LEVEL SECURITY`, and ownership policies on `tutoring_sessions`, `session_turns`, `teaching_steps`, `turn_citations`, `exercise_attempts`, `hint_events`, `study_plans`, and `study_tasks`
- The non-owner `app_runtime` role used by `DATABASE_RUNTIME_URL`

Apply migrations:

```bash
uv run alembic upgrade head
```

## Run

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

## Imports (`from app...`)

`backend/app` is installed as an editable package by `uv sync`, so `from app...` imports work from `uvicorn`, direct Python execution, `pytest`, and Jupyter kernels that use the backend venv.

The `[build-system]` and `[tool.hatch.build.targets.wheel]` sections in `backend/pyproject.toml` tell `uv` how to install the local `app/` package. Without that package install, imports depend on the working directory or a manually configured `PYTHONPATH`.

Preferred API server command:

```bash
cd backend
uv run uvicorn app.main:app --reload
```

Direct file execution also works:

```bash
cd backend
uv run python app/main.py
```

For Jupyter evaluation/debugging notebooks, install and select the backend kernel:

```bash
cd backend
uv run python -m ipykernel install --user --name ai-math-tutor-backend --display-name "AI Math Tutor Backend"
```

Then notebooks can import backend modules directly:

```python
from app.config import get_settings

settings = get_settings()
```

## Checks & tests

```bash
cd backend
uv run ruff check app tests
uv run mypy app
uv run python -m pytest
```

Use `python -m pytest` on Windows: some Application Control policies block the
`pytest.exe` console script even when the package imports correctly.

## Certified MAXI Maths ingestion

Raw **MAXI Maths — Tronc Commun Scientifique** PDFs/scans must stay local and gitignored (`data/`), and copyrighted source files must never be committed to the repository.

Only the three approved TCS chapters (*Les ensembles de nombres*, *Calcul vectoriel*, and *Généralités sur les fonctions*, or the finalized reviewer-approved trio) are ingested through the certified pipeline:

1. Extract and normalize textbook passages and exercises into clean Markdown/LaTeX.
2. Obtain explicit Mathematics Reviewer verification (`status = 'reviewed'`).
3. Publish immutable `source_revisions` (`status = 'published'`), generate `vector(1536)` embeddings, and populate `document_chunks` in Supabase Postgres.
