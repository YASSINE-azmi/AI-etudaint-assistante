# Backend — agent notes

This is the FastAPI service for the **AI Mathematics Tutor** (**MAXI Maths — Tronc Commun Scientifique**). Read [../AGENTS.md](../AGENTS.md) first — universal building rules live there. This file adds backend-specific conventions.

## Stack

- Python 3.12+
- FastAPI + uvicorn
- Pydantic v2 + `pydantic-settings`
- **PydanticAI** (`pydantic-ai`) for typed tutor agent orchestration (`TutorAgentDeps`, `TutorStepOutput`)
- OpenAI-compatible SDK (`openai`) behind `providers/` adapters (LLM, Vision/OCR symbol extraction, STT, TTS, embeddings)
- `httpx` for outbound HTTP
- `pytest` + `ruff` for tests and linting
- Supabase Python client (`supabase`) for server-side DB, Auth, and Private Storage
- SQLAlchemy models + Alembic migrations for database schema changes
- Supabase `pgvector` for semantic search and Postgres French full-text search (`to_tsvector('french', ...)`) for keyword retrieval. Hybrid search runs vector and full-text queries separately—scoped by `status = 'published'`, `track = 'TCS'`, and `chapter_id`—then fuses ranked results in Python with Reciprocal Rank Fusion (RRF).
- `structlog` for PII-redacted structured logging
- `uv` for dependency + project management

## Dependency policy

See universal policy in [../AGENTS.md](../AGENTS.md). Backend-specific:

- **Prefer stdlib:** `pathlib`, `datetime`, `uuid`, `enum`, `dataclasses`, `asyncio`, `collections`, `itertools`, `json`, `urllib`.
- **Not OK without justification:** `python-dateutil`, `toolz`, `funcy`, `more-itertools`, small JSON/string micro-libs, "ergonomic" wrappers on top of declared SDKs.
- Dev deps (test/lint/build) have a looser bar but still pick widely-used, low-footprint tools (`pytest`, `ruff`, `httpx`).

## Layout (to be created during build)

```text
backend/
├── alembic/
│   ├── env.py                  # Imports app database metadata for autogenerate
│   └── versions/               # Reviewed migration files
├── alembic.ini
├── app/
│   ├── main.py                 # FastAPI entrypoint
│   ├── config.py               # Pydantic settings — single source of truth for env
│   ├── api/
│   │   ├── sessions.py         # Session lifecycle, streaming turns, interrupt & board sync
│   │   ├── curriculum.py       # Approved TCS chapters, objectives & admin publish/withdraw
│   │   ├── media.py            # Photo upload, OCR symbol extraction & confirmation
│   │   ├── practice.py         # Reviewed MAXI Maths exercises & attempt checking
│   │   └── planning.py         # Student availability & deterministic weekly study plan
│   ├── auth/
│   │   └── dependencies.py     # Supabase JWT verification and current user dependency
│   ├── classroom/
│   │   ├── orchestrator.py     # Coordinates turn lifecycle, cancellation & board revisioning
│   │   ├── messages.py         # Converts AI SDK messages to/from internal turn models
│   │   ├── streaming.py        # Emits AI SDK-compatible text, board_action & citation parts
│   │   └── board_validator.py  # Allowlists board actions, coordinates & object bounds
│   ├── assistant/
│   │   ├── agent.py            # PydanticAI tutor agent definition
│   │   ├── deps.py             # TutorAgentDeps (student, session, scope, retriever, validator)
│   │   ├── outputs.py          # TutorStepOutput, BoardAction, Citation & SourcePassage
│   │   └── instructions.md     # French-first TCS pedagogical rules & refusal contract
│   ├── retrieval/
│   │   ├── queries.py          # Scoped pgvector and French full-text SQL queries
│   │   ├── fusion.py           # Reciprocal Rank Fusion (RRF) for hybrid search
│   │   └── retriever.py        # Chapter/objective-filtered MAXI Maths passage retrieval
│   ├── grounding/
│   │   └── validator.py        # Four-gate validator (source, scope, grounding, math/safety)
│   ├── providers/
│   │   ├── llm.py              # OpenAI-compatible LLM & Vision adapter
│   │   └── speech.py           # Chained STT and TTS adapters
│   └── database/
│       ├── supabase.py         # User-scoped and service-role Supabase clients
│       ├── models.py           # SQLAlchemy table models used by Alembic
│       ├── sessions.py         # Sessions, turns, board snapshots & citations persistence
│       ├── curriculum.py       # MAXI Maths sources, revisions, chunks & review status
│       └── practice.py         # Exercises, attempts, progress indicators & study plans
├── ingest/                     # Certified MAXI Maths ingestion (extract, normalize, review, publish, embed)
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

- `app.config.settings` is the single source of truth. Import settings where needed; never call `os.getenv` in app code, never call `load_dotenv`.
- If a third-party SDK reads `os.environ` directly, add the mirror in `config.py` — don't sprinkle `setdefault` elsewhere.
- Fail fast on startup when required env vars are missing.
- Keep `SUPABASE_SERVICE_ROLE_KEY` and `AI_PROVIDER_API_KEY` strictly on the backend.

## Database migrations

- Alembic is the source of truth for schema changes. Do not change production tables manually in the Supabase dashboard.
- SQLAlchemy models describe normal tables and columns. Alembic autogenerate creates candidate migrations, but every generated migration must be reviewed before applying.
- Supabase/Postgres-specific features belong in explicit migration operations: `create extension if not exists vector`, `vector(1536)` columns, generated French `tsvector` columns (`to_tsvector('french', chunk_text)`), HNSW/GIN indexes, RLS enablement, and RLS policies.
- Alembic must use the direct/session database connection, not the Supabase transaction pooler URL.
- Run migrations from `backend/` with `uv run alembic upgrade head`.

## Tests

- **Prefer unit over integration.** Mock at the service boundary.
- Fast suite (`pytest -m "not integration"`) must stay green and hit no network / no DB.
- Integration tests go behind `@pytest.mark.integration` and may require live AI provider / Supabase credentials.
- Tests live next to what they test (`retrieval/retriever.py` → `tests/retrieval/test_retriever.py`).
- Required test coverage: certified ingestion logic, scoped hybrid retrieval, citation extraction, Four-Gate validation (`grounding/validator.py`), board-action sanitization (`classroom/board_validator.py`), and turn interruption (`CANCELLED` state).

## Anti-patterns (rejected)

- `os.getenv` / `load_dotenv` in modules.
- Wrapping FastAPI responses in custom envelope classes.
- Over-catching `Exception` just to log and re-raise; let it propagate.
- Shared state through globals instead of FastAPI `app.state` or DI.
- Silent fallbacks that hide real config errors or emit ungrounded answers when evidence is missing.
- Allowing raw OCR output from **MAXI Maths** to be published without Mathematics Reviewer sign-off.
- Mocking the LLM in unit tests without also testing the Four-Gate grounding contract.
