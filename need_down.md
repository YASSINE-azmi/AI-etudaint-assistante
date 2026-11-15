# Windows Setup & Technologies Needed (`need_down.md`)

Everything you need to install, configure, build, and test the **AI Mathematics Tutor (MAXI Maths — Tronc Commun Scientifique)** project on **Windows** using **PowerShell**.

---

## 1. Core System Tools (Windows)

Open **PowerShell** (as a normal user, or Administrator if `winget` prompts) and install the core toolchain.

| Tool | Version | Purpose | Official Link | PowerShell Install Command |
| :--- | :--- | :--- | :--- | :--- |
| **Git** | latest | Source control | [git-scm.com](https://git-scm.com/download/win) | `winget install --id Git.Git -e --source winget` |
| **Python** | 3.12+ | Backend runtime (FastAPI + PydanticAI) | [python.org](https://www.python.org/downloads/) | `winget install --id Python.Python.3.12 -e --source winget` |
| **uv** | latest | Python package, venv, and runner | [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/) | `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 \| iex"` |
| **Node.js** | 20+ (LTS) | Frontend toolchain | [nodejs.org](https://nodejs.org/) | `winget install --id OpenJS.NodeJS.LTS -e --source winget` |
| **pnpm** | latest | Frontend package manager (required) | [pnpm.io](https://pnpm.io/installation) | `corepack enable; corepack prepare pnpm@latest --activate` |

> **Tip:** Restart PowerShell after installing so `git`, `python`, `uv`, `node`, and `pnpm` are refreshed in your `PATH`.

### Optional Tools (CLI, Ingestion & Backups)

| Tool | Purpose | Official Link | PowerShell Install Command |
| :--- | :--- | :--- | :--- |
| **Supabase CLI** | Inspect project keys & link Supabase project | [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/local-development/cli/getting-started) | `scoop install supabase` *(or `winget install Supabase.CLI`)* |
| **Poppler (`pdftotext`)** | Extract text from local MAXI Maths PDFs | [github.com/oschwartz10612/poppler-windows](https://github.com/oschwartz10612/poppler-windows/releases) | `winget install --id oschwartz10612.Poppler -e --source winget` |
| **PostgreSQL (`pg_dump`)** | Database backup/restore verification | [postgresql.org](https://www.postgresql.org/download/windows/) | `winget install --id PostgreSQL.PostgreSQL -e --source winget` |

### Verify Core Tools in PowerShell

```powershell
git --version
python --version
uv --version
node --version
pnpm --version
```

---

## 2. Cloud Accounts & API Keys

You need these external services before running the full app:

| Service | Purpose | Link |
| :--- | :--- | :--- |
| **Supabase** | Auth (email), Postgres (`pgvector` + French FTS), Private Storage (`exercise-photos`, `maxi-sources`) | [supabase.com/dashboard](https://supabase.com/dashboard) |
| **OpenAI (or OpenAI-compatible provider)** | LLM, Vision/OCR symbol extraction, STT (speech-to-text), TTS (text-to-speech), Embeddings (`vector(1536)`) | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| **Railway** *(for deployment)* | Hosts the FastAPI backend and static Vite frontend services | [railway.com](https://railway.com) |

See [docs/guides/supabase-setup.md](docs/guides/supabase-setup.md) for creating the Supabase project, private buckets, and collecting your keys.

---

## 3. Backend Technologies (`backend/`)

**Stack:** Python 3.12+, FastAPI, Uvicorn, Pydantic v2, `pydantic-settings`, **PydanticAI**, OpenAI SDK, Supabase Python client, SQLAlchemy, Alembic, `psycopg[binary]`, `pgvector`, `httpx`, `structlog`, `pytest`, `ruff`.

### Install & Initialize (PowerShell)

```powershell
cd backend
uv sync
uv add fastapi uvicorn pydantic pydantic-settings httpx structlog openai supabase pydantic-ai sqlalchemy alembic "psycopg[binary]" pgvector
uv add --dev pytest ruff
```

### Migrate, Run & Test (PowerShell)

```powershell
# Copy env template and fill in your Supabase + AI provider keys
Copy-Item .env.example .env

# Apply Alembic migrations to Supabase Postgres (use direct/session DATABASE_URL)
uv run alembic upgrade head

# Start FastAPI dev server
uv run uvicorn app.main:app --reload

# Lint & run unit tests (fast suite, no network/DB required)
uv run ruff check .
uv run pytest -m "not integration"
```

---

## 4. Frontend Technologies (`frontend/`)

**Stack:** Vite, React, TypeScript, React Router, Tailwind CSS, `shadcn/ui`, `@supabase/supabase-js`, Vercel AI SDK UI (`ai`, `@ai-sdk/react`), **Excalidraw** (`@excalidraw/excalidraw`), **KaTeX** (`katex`), Web Audio API / `MediaRecorder`.

> **Note:** This repo enforces `pnpm` only (with a 7-day `minimum-release-age` in `frontend/.npmrc`). Do not use `npm` or `yarn`.

### Install & Initialize (PowerShell)

```powershell
cd frontend
pnpm create vite . --template react-ts
pnpm install
pnpm add react-router-dom @supabase/supabase-js ai @ai-sdk/react @excalidraw/excalidraw katex
pnpm add -D @types/katex tailwindcss @tailwindcss/vite
pnpm dlx shadcn@latest init
```

### Run & Check (PowerShell)

```powershell
# Copy env template and fill in VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
Copy-Item .env.example .env

# Start Vite dev server
pnpm dev

# Type-check and lint
pnpm tsc --noEmit
pnpm lint
```

---

## 5. Quick Start Order

1. Install **Git**, **Python 3.12+**, **uv**, **Node.js 20+**, and **pnpm** using the PowerShell commands above.
2. Create your **Supabase** project and private storage buckets (`exercise-photos`, `maxi-sources`) following [docs/guides/supabase-setup.md](docs/guides/supabase-setup.md).
3. Configure `backend/.env` and `frontend/.env`.
4. Run `uv run alembic upgrade head` and `uv run uvicorn app.main:app --reload` in `backend/`.
5. Run `pnpm dev` in `frontend/`.
6. Verify backend tests (`uv run pytest -m "not integration"`) and frontend checks (`pnpm tsc --noEmit` and `pnpm lint`).
