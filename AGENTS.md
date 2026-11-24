# Agent Instructions

This file is the source of truth for any coding agent (Claude Code, Cursor, Codex, etc.) working in this repo. Read it before touching code.

New machine setup on Windows 11: follow [docs/guides/agent-onboarding.md](docs/guides/agent-onboarding.md) before making changes.

## Product & Scope

This repository implements the **AI Mathematics Tutor** — a browser-based, French-first (Option Française) educational assistant for Moroccan **Tronc Commun Scientifique (TCS)** students, grounded strictly in three reviewed chapters of **MAXI Maths — Tronc Commun Scientifique**.

- **Zero ungrounded fallback:** Missing corpus evidence or failed validation must trigger a clear refusal or clarification request, never an ungrounded generative answer.
- **Strict TCS scope:** Only approved **MAXI Maths (TCS)** chapters and objectives are in scope. Never use 1BAC, 2BAC, or university theorems.
- **Four-Gate Validation:** Every teaching step is validated server-side for Source Validity, Scope Validity, Grounding Sufficiency, and Mathematical & Board Safety before reaching the student.
- **Copyright & Privacy:** Raw **MAXI Maths** PDFs/scans remain local and gitignored (`data/`). Raw microphone audio is never persisted. Student records and exercise photos are access-controlled via Supabase Auth, RLS, and private Storage.

## Stack

- **Backend:** Python 3.12+ + FastAPI + PydanticAI
- **Frontend:** Vite + React SPA + TypeScript + Tailwind CSS + `shadcn/ui` + Excalidraw + KaTeX + Vercel AI SDK UI
- **Database & Storage:** Supabase Postgres (profiles, TCS curriculum/revisions, chunks, tutoring sessions, board snapshots, media assets, practice, study plans) + Supabase Private Storage
- **Migrations:** SQLAlchemy models + Alembic from the backend
- **Retrieval:** Supabase `pgvector` + Postgres French full-text search (`to_tsvector('french', ...)`) + RRF fusion
- **Auth:** Supabase Auth (email only)
- **Hosting:** Railway (backend service + frontend service)
- **AI Providers:** OpenAI-compatible SDK behind server-side provider adapters (LLM, Vision/OCR, STT, TTS, embeddings)

Stack is locked unless explicitly changed. Don't propose alternatives without a stated reason.

## Repo layout

```text
ai-math-tutor/
├── AGENTS.md           # this file
├── README.md
├── data/               # local MAXI Maths corpus & ingestion scripts (raw payloads gitignored)
├── docs/               # specs, client brief, architecture, setup guides
├── backend/            # FastAPI + PydanticAI service (see backend/AGENTS.md)
└── frontend/           # React Classroom SPA (see frontend/AGENTS.md)
```

## Dependency policy

**Default: write it yourself. Reach for a library only when the alternative would be non-trivial, error-prone, or reinvention of a standard.** Every dependency is a liability — bundle size, supply-chain risk, future upgrade work.

OK to depend on:

- Things that are genuinely hard to get right (HTTP clients, ASGI servers, SQL drivers, parsers, LLM/agent SDKs, ORM, migrations, auth SDKs, math/whiteboard renderers).
- The declared stack (FastAPI, PydanticAI, React, Vite, Supabase clients, OpenAI SDK, Excalidraw, KaTeX, Vercel AI SDK UI, etc.).

Not OK:

- Helper libraries that wrap 5–20 lines of stdlib or platform APIs.
- Frameworks where a function would do.
- "Nicer API" layers on top of an already-present dependency.

Before adding a runtime dep, answer in the commit message:

1. What exactly does it do that we can't write in <30 lines of clear code?
2. How often does it get used?
3. What's its maintenance / transitive-dep footprint?

Per-stack specifics live in `backend/AGENTS.md` and `frontend/AGENTS.md`.

## Configuration

A single settings module is the source of truth for environment per service (`backend/app/config.py`, `frontend/src/lib/env.ts`). Do not call `os.getenv` / read `process.env` / read `import.meta.env` directly in app code. Do not call `load_dotenv` anywhere. If a third-party SDK reads env vars directly, mirror them in the settings module — don't sprinkle `setdefault` elsewhere.

Fail fast on startup if required config is missing. No silent fallbacks that hide real config errors. Never expose `SUPABASE_SERVICE_ROLE_KEY` or AI provider keys to the frontend.

## Code style (universal)

- **Small, obvious functions.** A 15-line function with clear names beats a three-class abstraction.
- **No premature abstraction.** Three similar lines is better than a badly-named base class. Extract when there's a third caller, not a hypothetical one.
- **No error handling for cases that can't happen.** Trust internal callers and framework guarantees. Validate only at boundaries: HTTP input, external APIs, DB writes, untrusted parsing.
- **No backwards-compat shims** unless explicitly asked for.
- **No feature flags** added speculatively.
- **Comments:** explain *why* when non-obvious, never *what*. Remove stale TODOs.
- **Keep files focused.** Prefer small modules.
