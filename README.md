# AI Mathematics Tutor

A browser-based, French-first mathematics tutor for Moroccan **Tronc Commun Scientifique (TCS)** students, grounded in three reviewed chapters of **MAXI Maths — Tronc Commun Scientifique**.

**Current release target:** `v0.1.0` academic demo — synthetic data, trial AI credits, no real student pilot.

## Source of truth

- **Implementation plan:** [docs/implementation-plan.md](docs/implementation-plan.md)
- **Team execution plans:** [Imran](docs/team/member-a.md) · [Yassine](docs/team/member-b.md) · [Mohamed](docs/team/member-c.md)
- **Agent onboarding (Windows 11):** [docs/guides/agent-onboarding.md](docs/guides/agent-onboarding.md)
- **Client brief:** [docs/client-brief.md](docs/client-brief.md)
- **Stack:** [Stack.md](Stack.md)
- **Setup guide:** [need_down.md](need_down.md)
- **Service guides:** [docs/guides/](docs/guides/)
- **CI/CD & deployment:** [docs/guides/deployment.md](docs/guides/deployment.md)

If any document conflicts with `docs/implementation-plan.md`, the implementation plan wins.

## Scope in one paragraph

The tutor answers strictly from three approved TCS chapters — *L'ensemble ℕ et notions d'arithmétique*, *Les ensembles des nombres*, and *L'ordre dans ℝ* (D-46). Every teaching step is checked server-side for source validity, scope validity, grounding, and mathematical/rendering safety before it reaches the student. Missing evidence or failed validation produces a refusal or clarification, never an ungrounded answer.

## Repo layout

```text
ai-math-tutor/
├── AGENTS.md                  # agent instructions — read first
├── README.md                  # this file
├── Stack.md                   # locked stack
├── need_down.md               # Windows setup guide
├── data/                      # local MAXI corpus workspace (payloads gitignored)
├── docs/
│   ├── implementation-plan.md # authoritative plan
│   ├── client-brief.md        # client one-pager
│   ├── team/                  # Imran / Yassine / Mohamed execution plans
│   └── guides/                # agent onboarding, backend, frontend, Supabase
├── backend/                   # FastAPI + PydanticAI service
└── frontend/                  # React classroom SPA
```

## Technology

| Layer | Choice |
| --- | --- |
| Backend | Python 3.12+, FastAPI, PydanticAI, SQLAlchemy, Alembic, SymPy |
| Frontend | Vite + React 19 + TypeScript + Tailwind + shadcn/ui + Playwright |
| Database | Supabase Postgres + `pgvector` + French full-text search |
| Auth | Supabase Auth (email only) |
| AI | One OpenAI-compatible provider behind server-side adapters |
| Hosting | Local demo; optional free-tier Railway/Supabase |

## Local development

First time on a Windows 11 machine? Follow
[docs/guides/agent-onboarding.md](docs/guides/agent-onboarding.md) — it covers tool
installation, credentials, the delivery branch, and the exact verification commands.

The backend foundation and classroom shell are in place. The corpus, tutoring pipeline,
persistence, and practice flow land in the following weeks.

```powershell
# Backend
cd backend
Copy-Item .env.example .env
uv sync
uv run uvicorn app.main:app --reload

# Frontend (second terminal)
cd frontend
Copy-Item .env.example .env
pnpm install
pnpm dev
```

Verification:

```powershell
cd backend
uv run ruff check app tests
uv run mypy app
uv run python -m pytest

cd ../frontend
pnpm typecheck
pnpm lint
pnpm test:e2e
```

## Important boundaries

- No 1BAC/2BAC/university content.
- No continuous listening; push-to-talk is the voice baseline.
- Raw MAXI Maths PDFs and extracts stay local and gitignored.
- `SUPABASE_SERVICE_ROLE_KEY` and AI provider keys never reach the frontend.
- The academic demo does not claim zero hallucinations or validated mastery.
