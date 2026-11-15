# Backend setup

The **AI Mathematics Tutor** uses a dedicated Python + FastAPI backend to own authentication checks, Tronc Commun Scientifique (TCS) curriculum scoping, hybrid retrieval over published **MAXI Maths** chapters, PydanticAI orchestration, deterministic four-gate validation, whiteboard action sanitization, and speech/vision provider adapters. Keeping this logic behind FastAPI keeps the React classroom SPA thin and prevents AI keys, service-role credentials, or unvalidated math outputs from reaching the browser.

## Prerequisites

- Python `3.12+`
- [`uv`](https://docs.astral.sh/uv/getting-started/installation/)
- A configured Supabase project (see [Supabase setup](supabase-setup.md))
- An OpenAI-compatible API key for LLM, Vision/OCR, STT, TTS, and embeddings

## Init (from `backend/`)

```bash
cd backend
uv sync
uv add fastapi uvicorn pydantic pydantic-settings httpx structlog openai supabase pydantic-ai sqlalchemy alembic "psycopg[binary]" pgvector
uv add --dev pytest ruff
```

## Environment configuration

Backend settings are loaded from a single typed module (`backend/app/config.py`) using `pydantic-settings`. Do not call `os.getenv` or `load_dotenv` in application modules.

Copy `backend/.env.example` to `backend/.env` and set:

| Variable | Purpose |
| -------- | ------- |
| `SUPABASE_URL` | Hosted Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for privileged writes and private Storage (never expose to frontend) |
| `DATABASE_URL` | Direct/session Postgres connection string (required for Alembic and SQLAlchemy) |
| `AI_PROVIDER_BASE_URL` | OpenAI-compatible base URL |
| `AI_PROVIDER_API_KEY` | Server-side API key for LLM, Vision/OCR, STT, TTS, and embeddings |
| `LLM_MODEL_NAME` | Chat/reasoning model identifier |
| `EMBEDDING_MODEL_NAME` | Embedding model identifier (`vector(1536)`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (e.g. `http://localhost:5173`) |
| `MONTHLY_BUDGET_CAP_USD` | Server-enforced monthly AI spend cap |
| `MAX_TURNS_PER_SESSION` | Per-session turn limit |

## Database migrations

Alembic owns database schema changes. SQLAlchemy models live in `backend/app/database/models.py`, and Alembic migrations apply them to Supabase Postgres.

Initialize Alembic once from `backend/` (if not already initialized):

```bash
uv run alembic init alembic
```

Configure `alembic/env.py` to import the app's SQLAlchemy metadata and read `DATABASE_URL` from `app.config.settings`. Always use the **direct/session** Supabase database connection string—not the transaction pooler URL—for migrations.

Create a migration after changing SQLAlchemy models:

```bash
uv run alembic revision --autogenerate -m "add tutor and curriculum tables"
```

Always review the generated migration in `backend/alembic/versions/` and add explicit `op.execute(...)` operations for Postgres/Supabase features that autogenerate cannot reliably infer:

- `create extension if not exists vector`
- `vector(1536)` embedding columns on `document_chunks`
- Generated French full-text search `tsvector` columns (`to_tsvector('french', chunk_text)`)
- HNSW and GIN indexes for hybrid retrieval
- Row-Level Security (RLS) enablement and ownership policies on `tutoring_sessions`, `session_turns`, `board_snapshots`, `media_assets`, `exercise_attempts`, and `study_plans`

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
from app.config import settings
```

## Checks & tests

```bash
cd backend
uv run ruff check .
uv run pytest
```

## Certified MAXI Maths ingestion

Raw **MAXI Maths — Tronc Commun Scientifique** PDFs/scans must stay local and gitignored (`data/`), and copyrighted source files must never be committed to the repository.

Only the three approved TCS chapters (*Les ensembles de nombres*, *Calcul vectoriel*, and *Généralités sur les fonctions*, or the finalized reviewer-approved trio) are ingested through the certified pipeline:

1. Extract and normalize textbook passages and exercises into clean Markdown/LaTeX.
2. Obtain explicit Mathematics Reviewer verification (`status = 'reviewed'`).
3. Publish immutable `source_revisions` (`status = 'published'`), generate `vector(1536)` embeddings, and populate `document_chunks` in Supabase Postgres.
