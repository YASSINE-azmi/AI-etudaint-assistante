# Windows Setup & Technologies Guide (`need_down.md`)

Complete setup, installation, configuration, build, and test guide for the **AI Mathematics Tutor (MAXI Maths — Tronc Commun Scientifique)** on **Windows** using **PowerShell**.

---

## 1. Core System Tools (Windows)

Open **PowerShell** (run as Administrator if `winget` requests permissions) and install the core toolchain.

| Tool | Version | Purpose | Official Link | PowerShell Install Command |
| :--- | :--- | :--- | :--- | :--- |
| **Git** | latest | Source control | [git-scm.com](https://git-scm.com/download/win) | `winget install --id Git.Git -e --source winget` |
| **Python** | 3.12+ | Backend runtime (FastAPI + PydanticAI) | [python.org](https://www.python.org/downloads/) | `winget install --id Python.Python.3.12 -e --source winget` |
| **uv** | latest | Python package & venv runner | [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/) | `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 \| iex"` |
| **Node.js** | 20+ (LTS) | Frontend runtime & toolchain | [nodejs.org](https://nodejs.org/) | `winget install --id OpenJS.NodeJS.LTS -e --source winget` |
| **pnpm** | latest | Frontend package manager (enforced) | [pnpm.io](https://pnpm.io/installation) | `winget install --id pnpm.pnpm -e --source winget`<br>*(or `corepack enable; corepack prepare pnpm@latest --activate`)* |

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
| **Supabase** | Auth (email only), Postgres (`pgvector` + French full-text search), Private Storage (`exercise-photos`, `maxi-sources`) | [Supabase Dashboard](https://supabase.com/dashboard) & [docs/guides/supabase-setup.md](docs/guides/supabase-setup.md) |
| **OpenAI / OpenAI-compatible** | LLM tutoring, Vision/OCR extraction, STT (speech-to-text), TTS (text-to-speech), Embeddings (`vector(1536)`) | [OpenAI API Keys](https://platform.openai.com/api-keys) |
| **Railway** | Production deployment (FastAPI backend + Vite SPA services) | [Railway Dashboard](https://railway.com) |

> [!IMPORTANT]
> - Use the **direct/session** database connection (`db.<project-ref>.supabase.co:5432`) for `DATABASE_URL` so Alembic can apply migrations, vector extensions, and RLS policies. Do not use the transaction pooler.
> - Never place `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` in frontend environment files.

---

## 3. Backend Setup (`backend/`)

**Declared Stack:** Python 3.12+, FastAPI, Uvicorn, Pydantic v2, `pydantic-settings`, **PydanticAI**, OpenAI SDK, Supabase Python client, SQLAlchemy, Alembic, `psycopg[binary]`, `pgvector`, `httpx`, `structlog`, `pytest`, `ruff`.

Dependencies are locked in `backend/pyproject.toml` and `backend/uv.lock`.

### 1. Configure Environment

```powershell
cd backend
Copy-Item .env.example .env
```

Open `backend/.env` and provide your credentials:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (direct connection string to Supabase Postgres)
- `OPENAI_API_KEY`, `OPENAI_EMBEDDING_MODEL` (`text-embedding-3-small`), `OPENAI_EMBEDDING_DIMENSIONS` (`1536`)
- `ALLOWED_ORIGINS` (`http://localhost:5173`)

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

### 5. Lint & Test

```powershell
# Fast code formatting & linting checks
uv run ruff check .

# Run unit tests (fast suite, mock service boundaries)
uv run pytest -m "not integration"
```

---

## 4. Frontend Setup (`frontend/`)

**Declared Stack:** Plain React 19 SPA (Vite + TypeScript), React Router, Tailwind CSS, `shadcn/ui`, `@supabase/supabase-js`, Vercel AI SDK UI (`ai`, `@ai-sdk/react`), **Excalidraw** (`@excalidraw/excalidraw`), **KaTeX** (`katex`), Web Audio API / `MediaRecorder`.

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
# TypeScript strict type checking
pnpm tsc --noEmit

# Fast oxlint linting
pnpm lint
```

### 5. Adding `shadcn/ui` Primitives (As Needed)

```powershell
# Install UI components via shadcn CLI directly
pnpm dlx shadcn@latest add <component-name>
```

---

## 5. End-to-End Quick Start Workflow

Follow this concise sequence in PowerShell to get both services running locally:

```powershell
# 1. Clone repository and navigate to root
git clone <repo-url>
cd document-copilot-main

# 2. Setup and run Backend
cd backend
Copy-Item .env.example .env
# [Edit backend/.env with your Supabase & OpenAI credentials]
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload

# 3. Setup and run Frontend (in a second PowerShell window)
cd frontend
Copy-Item .env.example .env
# [Edit frontend/.env with your Supabase URL & anon key]
pnpm install
pnpm dev

# 4. Verify code quality
# In backend/:
uv run ruff check .
# In frontend/:
pnpm tsc --noEmit
pnpm lint
```

Access the classroom SPA at **`http://localhost:5173`** and the backend API docs at **`http://localhost:8000/docs`**.
