# Backend — agent notes

This is the FastAPI service for the **AI Mathematics Tutor** (**MAXI Maths — Tronc Commun Scientifique**). Read [../AGENTS.md](../AGENTS.md) first — universal building rules live there. This file adds backend-specific conventions.

## Stack

- Python 3.12+
- FastAPI + uvicorn
- Pydantic v2 + `pydantic-settings`
- **PydanticAI** (`pydantic-ai`) for typed tutor agent orchestration (`TutorAgentDeps`, `AgentDraftOutput`)
- OpenAI-compatible SDK (`openai`) behind `providers/` adapters (LLM, Vision/OCR symbol extraction, STT, embeddings)
- SymPy for deterministic math checks in the Mathematical & Rendering Safety gate
- PyJWT + Supabase JWKS for access-token verification
- `httpx` for outbound HTTP
- `pytest` + `pytest-asyncio` + `mypy` + `ruff` for tests, type checking, and linting
- Supabase Python client (`supabase`) for the reviewer CLI and ingestion only (service role). The API reaches Postgres through SQLAlchemy as `app_runtime` and Storage with the student's own JWT; it never holds the service-role key
- SQLAlchemy models + Alembic migrations for database schema changes
- Supabase `pgvector` for semantic search and Postgres French full-text search (`to_tsvector('french', ...)`) for keyword retrieval. Hybrid search runs vector and full-text queries separately—scoped by `status = 'published'`, `chapter_id`, and approved objective IDs (single TCS track, D-01)—then fuses ranked results in Python with Reciprocal Rank Fusion (RRF).
- `structlog` for PII-redacted structured logging
- `uv` for dependency + project management

## Dependency policy

See universal policy in [../AGENTS.md](../AGENTS.md). Backend-specific:

- **Prefer stdlib:** `pathlib`, `datetime`, `uuid`, `enum`, `dataclasses`, `asyncio`, `collections`, `itertools`, `json`, `urllib`.
- **Not OK without justification:** `python-dateutil`, `toolz`, `funcy`, `more-itertools`, small JSON/string micro-libs, "ergonomic" wrappers on top of declared SDKs.
- Dev deps (test/lint/build) have a looser bar but still pick widely-used, low-footprint tools (`pytest`, `pytest-asyncio`, `mypy`, `ruff`, `httpx`).

## Layout (to be created during build)

```text
backend/
├── alembic/
│   ├── env.py                  # Imports app database metadata for autogenerate
│   └── versions/               # Reviewed migration files
├── alembic.ini
├── app/
│   ├── main.py                 # FastAPI entrypoint, lifespan, middleware
│   ├── config.py               # Pydantic settings — single source of truth for env
│   ├── api/
│   │   ├── router.py           # /api/v1 composition
│   │   ├── health.py           # /health and /ready
│   │   ├── auth.py             # Current profile
│   │   ├── curriculum.py       # Published chapters and objectives
│   │   ├── sessions.py         # Session lifecycle
│   │   ├── turns.py            # Streaming turns and interruption
│   │   ├── practice.py         # Exercises, attempts, progress
│   │   └── planning.py         # Availability and study plan
│   ├── auth/
│   │   └── dependencies.py     # Supabase JWKS verification and current user
│   ├── core/
│   │   ├── logging.py          # structlog configuration
│   │   ├── errors.py           # Stable error envelopes
│   │   └── middleware.py       # Request IDs and request-scoped logging
│   ├── classroom/
│   │   ├── engine.py           # Turn lifecycle and cancellation
│   │   ├── streaming.py        # AI SDK-compatible SSE parts
│   │   └── idempotency.py      # Idempotency keys and request hashes
│   ├── assistant/
│   │   ├── agent.py            # PydanticAI tutor agent definition
│   │   ├── deps.py             # TutorAgentDeps (student, session, scope, retriever, validator)
│   │   ├── contracts.py        # Draft claims, steps, and citations
│   │   ├── prompts.py          # Versioned prompt constants
│   │   └── instructions.md     # French-first TCS pedagogical rules & refusal contract
│   ├── retrieval/
│   │   ├── queries.py          # Scoped pgvector and French full-text SQL queries
│   │   ├── fusion.py           # Reciprocal Rank Fusion (RRF)
│   │   └── retriever.py        # Chapter/objective-filtered MAXI Maths retrieval
│   ├── validation/
│   │   ├── source_gate.py      # Gate 1: citation and revision validity
│   │   ├── scope_gate.py       # Gate 2: chapter/objective coverage
│   │   ├── grounding_gate.py   # Gate 3: quote match and claim coverage
│   │   ├── math_parser.py      # AST allowlist parser for MathClaim expressions
│   │   ├── math_gate.py        # Gate 4a: SymPy (killable process) and rubric verification
│   │   ├── render_gate.py      # Gate 4b: KaTeX and rendering safety
│   │   ├── refusal.py          # Stable French refusal templates
│   │   └── pipeline.py         # Ordered gate execution
│   ├── practice/
│   │   ├── evaluator.py        # MCQ, numeric tolerance, algebraic expression
│   │   └── schemas.py          # Exercise and attempt contracts
│   ├── planning/
│   │   └── generator.py        # Deterministic weekly planner
│   ├── providers/
│   │   ├── llm.py              # OpenAI-compatible LLM adapter
│   │   ├── vision.py           # Vision/OCR symbol extraction
│   │   ├── embeddings.py       # Embedding adapter
│   │   ├── storage.py          # Storage REST calls with the student's JWT
│   │   └── speech.py           # STT adapter
│   ├── budget/
│   │   └── ledger.py           # Credit holds on the locked ledger row, reconciliation, hard stop
│   ├── jobs/
│   │   ├── periodic.py         # Lifespan task on the app_worker connection
│   │   └── handlers.py         # Stuck turns (SKIP LOCKED), cleanup, reservation release
│   └── database/
│       ├── session.py          # Async engine, session factory, readiness ping
│       ├── models/             # SQLAlchemy table models used by Alembic
│       └── repositories/       # Query functions grouped by aggregate
├── ingest/                     # Local extraction, review, publish, embed
├── scripts/                    # One-off operational SQL/commands
├── tests/
└── pyproject.toml
```

## Code style (backend-specific)

- **Type hints on public functions and module-level things.** Don't annotate every local.
- **Async by default in request-path code.** Don't run blocking I/O on the event loop. Tempfile + small synchronous file reads are OK (they're fast); network calls must be async.
- **Use `async def` for all route handlers** and any I/O service function.
- **Validate at boundaries only.** HTTP input is validated by Pydantic models. External API responses are validated when parsed. Internal callers are trusted.
- **Bounded agent tools only:** The PydanticAI agent interacts with the **MAXI Maths** corpus solely through bounded retrieval tools (`search_maxi_chapter`, `read_chunk`, `read_neighboring_chunks`)—never raw SQL.

## Configuration

- `app.config.get_settings()` is the single source of truth. Import settings where needed; never call `os.getenv` in app code, never call `load_dotenv`.
- If a third-party SDK reads `os.environ` directly, add the mirror in `config.py` — don't sprinkle `setdefault` elsewhere.
- Fail fast on startup when required env vars are missing.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `CHAT_PROVIDER_API_KEY`, and `AI_PROVIDER_API_KEY` strictly on the backend.

## Database migrations

- Alembic is the source of truth for schema changes. Do not change production tables manually in the Supabase dashboard.
- SQLAlchemy models describe normal tables and columns. Alembic autogenerate creates candidate migrations, but every generated migration must be reviewed before applying.
- Supabase/Postgres-specific features belong in explicit migration operations: `create extension if not exists vector`, `vector(1536)` columns, generated French `tsvector` columns (`to_tsvector('french', chunk_text)`), HNSW/GIN indexes, RLS enablement, and RLS policies.
- Alembic must use a session-mode connection (Supavisor session pooler on port 5432, or the IPv6-only direct host), never the transaction pooler. `alembic/env.py` reads only `DATABASE_URL` via `get_migration_settings()`.
- The API never runs `SET ROLE`. Policies target `app_runtime` / `app_worker` and use `public.request_user_id()` (plan §5.3, ADR 0002).
- Run migrations from `backend/` with `uv run alembic upgrade head`.

## Tests

- **Prefer unit over integration.** Mock at the service boundary.
- Fast suite (`pytest -m "not integration"`) must stay green and hit no network / no DB.
- Integration tests go behind `@pytest.mark.integration` and may require live AI provider / Supabase credentials.
- Tests live next to what they test (`retrieval/retriever.py` → `tests/retrieval/test_retriever.py`).
- Run `uv run ruff check app tests`, `uv run mypy app`, and `uv run python -m pytest`. The `python -m` form avoids Windows Application Control policies that block the console script.
- Required test coverage: certified ingestion logic, scoped hybrid retrieval, citation extraction, Four-Gate validation (`validation/pipeline.py`), math/rendering safety (`validation/render_gate.py`), turn interruption (`CANCELLED` state), and the service-role import boundary.

## Anti-patterns (rejected)

- `os.getenv` / `load_dotenv` in modules.
- Wrapping FastAPI responses in custom envelope classes.
- Over-catching `Exception` just to log and re-raise; let it propagate.
- Shared state through globals instead of FastAPI `app.state` or DI.
- Silent fallbacks that hide real config errors or emit ungrounded answers when evidence is missing.
- Allowing raw OCR output from **MAXI Maths** to be published without Mathematics Reviewer sign-off.
- Mocking the LLM in unit tests without also testing the Four-Gate grounding contract.
