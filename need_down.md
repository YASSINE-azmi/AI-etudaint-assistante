# Windows Setup & Technologies Guide (`need_down.md`)

Complete setup, installation, configuration, build, and test guide for the **AI Mathematics Tutor (MAXI Maths — Tronc Commun Scientifique)** on **Windows** using **PowerShell**.

For the fastest fresh-clone path, use [docs/guides/agent-onboarding.md](docs/guides/agent-onboarding.md). This file keeps the detailed reference.

---

## 1. Core System Tools (Windows)

Open **PowerShell** (run as Administrator if `winget` requests permissions) and install the core toolchain.

| Tool | Version | Purpose | Official Link | PowerShell Install Command |
| :--- | :--- | :--- | :--- | :--- |
| **Git** | latest | Source control | [git-scm.com](https://git-scm.com/download/win) | `winget install --id Git.Git -e --source winget` |
| **Python** | 3.12+ | Backend runtime (FastAPI + PydanticAI) | [python.org](https://www.python.org/downloads/) | `winget install --id Python.Python.3.12 -e --source winget` |
| **uv** | latest | Python package & venv runner | [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/) | `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 \| iex"` |
| **Node.js** | 20+ (LTS) | Frontend runtime & toolchain | [nodejs.org](https://nodejs.org/) | `winget install --id OpenJS.NodeJS.LTS -e --source winget` |
| **pnpm** | 12.18.0 | Frontend package manager (enforced) | [pnpm.io](https://pnpm.io/installation) | `npm install -g pnpm@12.18.0`<br>*(or `winget install --id pnpm.pnpm -e --source winget`, then verify the version)* |

> [!TIP]
> **PowerShell Execution Policy & Path Refresh:**
> - If PowerShell restricts running scripts, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`.
> - Restart PowerShell after installing so `git`, `python`, `uv`, `node`, and `pnpm` are refreshed in your `$env:PATH`.

### Optional Tools (Ingestion, CLI & Database Backups)

| Tool | Purpose | Official Link | PowerShell Install Command |
| :--- | :--- | :--- | :--- |
| **Supabase CLI** | Local development, database linking & migrations | [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/local-development/cli/getting-started) | `winget install Supabase.CLI` *(or `scoop install supabase`)* |
| **Poppler (`pdftotext`)** | Extract text from local MAXI Maths PDFs | [github.com/oschwartz10612/poppler-windows](https://github.com/oschwartz10612/poppler-windows/releases) | `winget install --id oschwartz10612.Poppler -e --source winget` |
| **PostgreSQL (`pg_dump`)** | Database dump and schema verification | [postgresql.org](https://www.postgresql.org/download/windows/) | `winget install --id PostgreSQL.PostgreSQL -e --source winget` |

### Verify Core Tools in PowerShell

```powershell
git --version
python --version
uv --version
node --version
pnpm --version
```

---

## 2. Cloud Accounts & Credentials

You need credentials for the following external services before running the full application:

| Service | Purpose | Resource / Guide |
| :--- | :--- | :--- |
| **Supabase** | Auth (email only), Postgres (`pgvector` + French full-text search), Private Storage (`exercise-photos`) | [Supabase Dashboard](https://supabase.com/dashboard) & [docs/guides/supabase-setup.md](docs/guides/supabase-setup.md) |
| **OpenAI / OpenAI-compatible** | LLM tutoring, Vision/OCR extraction, STT (speech-to-text), Embeddings (`vector(1536)`) | [OpenAI API Keys](https://platform.openai.com/api-keys) |
| **Railway / Supabase (optional)** | Demo hosting only; not a production environment in `v0.1.0` | [Railway Dashboard](https://railway.com) |

> [!IMPORTANT]
> - Use a **session-mode** connection for `DATABASE_URL` so Alembic can apply migrations, vector extensions, and RLS policies. On most home networks (IPv4 only) that is the **Session pooler** string (`aws-0-<region>.pooler.supabase.com:5432`); the direct host `db.<project-ref>.supabase.co` is IPv6-only on the free tier. Do not use the transaction pooler (port 6543).
> - Never place `SUPABASE_SERVICE_ROLE_KEY` or `AI_PROVIDER_API_KEY` in frontend environment files.

---

## 3. Backend Setup (`backend/`)

**Declared Stack:** Python 3.12+, FastAPI, Uvicorn, Pydantic v2, `pydantic-settings`, **PydanticAI**, OpenAI SDK, Supabase Python client, SQLAlchemy, Alembic, `psycopg[binary]`, `pgvector`, **SymPy**, **PyJWT**, `httpx`, `structlog`, `pytest`, `pytest-asyncio`, `mypy`, `ruff`.

Dependencies are locked in `backend/pyproject.toml` and `backend/uv.lock`.

### 1. Configure Environment

```powershell
cd backend
Copy-Item .env.example .env
```

Open `backend/.env` and provide your credentials:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (and `SUPABASE_SERVICE_ROLE_KEY` only if you run the reviewer CLI; the API does not read it)
- `DATABASE_URL` (session-mode connection string for Alembic)
- `DATABASE_RUNTIME_URL` (non-owner `app_runtime` role for the API)
- `AI_PROVIDER_BASE_URL`, `AI_PROVIDER_API_KEY`, `LLM_MODEL_NAME`
- `EMBEDDING_MODEL_NAME` (`text-embedding-3-small`), `EMBEDDING_DIMENSIONS` (`1536`)
- `TRIAL_CREDIT_BUDGET_USD`, `ALLOWED_ORIGINS` (`http://localhost:5173`)

### 2. Install Dependencies

```powershell
# Sync locked dependencies into backend/.venv
uv sync
```

### 3. Run Database Migrations

```powershell
# Apply Alembic migrations to Supabase Postgres
uv run alembic upgrade head
```

### 4. Start Backend Server

```powershell
# Start FastAPI server on http://localhost:8000 with auto-reload
uv run uvicorn app.main:app --reload
```

> [!NOTE]
> **Windows:** keep `--reload` on, or start without it as `uv run uvicorn app.main:app --loop asyncio:SelectorEventLoop`. Without either, uvicorn uses Windows' `ProactorEventLoop`, which psycopg's async driver refuses.

### 5. Lint & Test

```powershell
# Fast lint, type, and test checks
uv run ruff check app tests
uv run mypy app
uv run python -m pytest -m "not integration"
```

Use `python -m pytest` on Windows when Application Control blocks the `pytest.exe` console script.

---

## 4. Frontend Setup (`frontend/`)

**Declared Stack:** Plain React 19 SPA (Vite + TypeScript), React Router, Tailwind CSS, `shadcn/ui`, `@supabase/supabase-js`, Vercel AI SDK UI (`ai`, `@ai-sdk/react`), **KaTeX** (`katex`) for math notation, **Playwright** (`@playwright/test`), Web Audio API / `MediaRecorder`.

> [!NOTE]
> - This project enforces **`pnpm` only** (do not use `npm` or `yarn`).
> - A 7-day minimum release age (`minimum-release-age=10080`) is enforced via `frontend/.npmrc`.
> - All packages are already declared in `frontend/package.json` and locked in `frontend/pnpm-lock.yaml`.

### 1. Configure Environment

```powershell
cd frontend
Copy-Item .env.example .env
```

Open `frontend/.env` and fill in browser-safe values:
- `VITE_API_BASE_URL=http://localhost:8000`
- `VITE_SUPABASE_URL=https://your-project-ref.supabase.co`
- `VITE_SUPABASE_ANON_KEY=your-anon-public-key`

### 2. Install Packages

```powershell
# Install all dependencies according to pnpm-lock.yaml
pnpm install
```

### 3. Start Frontend Dev Server

```powershell
# Start Vite development server on http://localhost:5173
pnpm dev
```

### 4. Type-Check & Lint

```powershell
# TypeScript strict type check
pnpm typecheck

# Fast oxlint linting
pnpm lint

# Playwright acceptance suite (uses bundled Chromium)
pnpm test:e2e
```

On Windows, run against installed Chrome if you want to skip the browser download:
`$env:PLAYWRIGHT_CHANNEL='chrome'; pnpm test:e2e`.

### 5. Adding `shadcn/ui` Primitives (As Needed)

```powershell
# Install UI components via shadcn CLI directly
pnpm dlx shadcn@latest add <component-name>
```

---

## 5. End-to-End Quick Start Workflow

Follow this concise sequence in PowerShell to get both services running locally:

```powershell
# 1. Clone repository and select the delivery branch
git clone https://github.com/YASSINE-azmi/AI-etudaint-assistante.git
cd AI-etudaint-assistante
git switch grunt

# 2. Setup and run Backend
cd backend
Copy-Item .env.example .env
# [Edit backend/.env with your Supabase & AI provider credentials]
uv sync --frozen
uv run alembic upgrade head
uv run uvicorn app.main:app --reload

# 3. Setup and run Frontend (in a second PowerShell window)
cd frontend
Copy-Item .env.example .env
# [Edit frontend/.env with your Supabase URL & anon key]
pnpm install --frozen-lockfile
pnpm dev

# 4. Verify code quality
# In backend/:
uv run ruff check app tests
uv run mypy app
uv run python -m pytest
# In frontend/:
pnpm typecheck
pnpm lint
pnpm test:e2e
```

Access the classroom SPA at **`http://localhost:5173`** and the backend API docs at **`http://localhost:8000/docs`**.
