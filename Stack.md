# Stack

Browser tutor for Moroccan Tronc Commun Scientifique (MAXI Maths). French-first. Local demo first; no production environment in `v0.1.0`.

## Runtime

| Piece | For |
| --- | --- |
| Python 3.12+ | Backend |
| Node.js 20+ | Frontend toolchain |
| uv | Backend dependencies and scripts |
| pnpm | Frontend packages |

## Backend

| Piece | For |
| --- | --- |
| FastAPI | HTTP API |
| uvicorn | ASGI server |
| Pydantic | Request and response models |
| pydantic-settings | Env config (`app/config.py`) |
| PydanticAI | Tutor agent (typed steps, tools, outputs) |
| OpenAI SDK | LLM, vision/OCR, speech-to-text, text-to-speech, embeddings (behind server adapters) |
| SymPy | Deterministic math checks in the safety gate |
| PyJWT | Supabase JWKS access-token verification |
| httpx | Outbound HTTP |
| Supabase Python client | Server DB, auth, private storage |
| SQLAlchemy | Table models |
| Alembic | Schema migrations |
| psycopg | Postgres driver |
| pgvector | Vector columns and similarity search |
| structlog | Structured logs (PII redacted) |
| pytest + pytest-asyncio | Sync and async tests |
| mypy | Static type checking |
| ruff | Lint and format |

## Frontend

| Piece | For |
| --- | --- |
| Vite | Dev server and production build |
| React 19 | UI |
| TypeScript | Types (strict) |
| React Router | Classroom, practice, study plan, session history |
| Tailwind CSS | Styling |
| shadcn/ui | UI primitives |
| `@supabase/supabase-js` | Email login and session token |
| Vercel AI SDK (`ai`, `@ai-sdk/react`) | Chat turns and streaming (`useChat`) |
| Excalidraw | Shared whiteboard |
| KaTeX | Math notation |
| oxlint | Lint |
| Playwright | End-to-end acceptance tests |
| Web Audio / MediaRecorder | Push-to-talk and instant audio stop (browser APIs) |

## Data and auth

| Piece | For |
| --- | --- |
| Supabase Postgres | Profiles, curriculum, chunks, sessions, board snapshots, practice, study plans |
| pgvector | Semantic search over published MAXI Maths chunks |
| Postgres French full-text (`to_tsvector('french', …)`) | Keyword search; fused with vectors by Reciprocal Rank Fusion |
| Supabase Auth | Email-only login |
| Supabase Private Storage | Exercise photos and student media (RLS) |
| Row Level Security | Per-user access to records and files |

## Hosting

| Piece | For |
| --- | --- |
| Local machine | Demo runtime (FastAPI + Vite) |
| Railway / Supabase (optional free tier) | Demo hosting only; not a production environment |
