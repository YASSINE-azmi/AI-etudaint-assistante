# Frontend setup

The **AI Mathematics Tutor** uses a Vite + React + TypeScript SPA for the interactive Tronc Commun Scientifique (TCS) classroom: French chat transcript, synchronized **Excalidraw + KaTeX** shared whiteboard, push-to-talk audio recording with `< 500 ms` local interruption, exercise photo upload with ambiguous-symbol confirmation, reviewed **MAXI Maths** practice, and weekly study planning.

New to the project on Windows 11? Start with [Agent onboarding](agent-onboarding.md), then return here for the frontend details.

We use a plain Vite SPA rather than Next.js because the app is an authenticated, interactive classroom client that communicates directly with the FastAPI backend—no SSR, server components, or frontend API routes are needed.

## Prerequisites

- Node.js `20+` (LTS)
- [`pnpm`](https://pnpm.io/installation)
- A configured Supabase project (see [Supabase setup](supabase-setup.md))
- Running FastAPI backend (see [Backend setup](backend-setup.md))

## Init

The Vite + React + TypeScript scaffold, Tailwind, routing, and Playwright are already committed. Install the locked dependencies; do not re-run the Vite generator.

```bash
cd frontend
pnpm install
```

> **Note:** Check `frontend/AGENTS.md` and the project dependency policy before adding any extra runtime packages.

## Environment configuration

Frontend environment variables are validated in a single module (`frontend/src/lib/env.ts`). Never read `import.meta.env` directly across components, and never place `SUPABASE_SERVICE_ROLE_KEY` or AI provider keys in frontend env files.

Copy `frontend/.env.example` to `frontend/.env` and set:

| Variable | Purpose |
| -------- | ------- |
| `VITE_API_BASE_URL` | FastAPI backend base URL (e.g. `http://localhost:8000`) |
| `VITE_SUPABASE_URL` | Hosted Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser-safe Supabase `anon` `public` key |

## Run

```bash
cd frontend
pnpm install
pnpm dev
```

## Check

```bash
cd frontend
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
```

Playwright uses bundled Chromium by default. Install it once with
`pnpm exec playwright install chromium`, or run against an installed Chrome with
`PLAYWRIGHT_CHANNEL=chrome pnpm test:e2e` (PowerShell:
`$env:PLAYWRIGHT_CHANNEL='chrome'; pnpm test:e2e`).

## Key frontend boundaries

- **Auth & HTTP (`src/lib/supabase.ts`, `src/lib/http.ts`):** All requests to FastAPI (`POST /api/v1/sessions/{id}/turns`, `POST /api/v1/sessions/{id}/interrupt`, practice, and study plans) inject `Authorization: Bearer <supabase_access_token>` and support `AbortController` cancellation.
- **Environment gate (`src/lib/env.ts`):** The app renders a setup screen when `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, or `VITE_SUPABASE_ANON_KEY` is missing. No other module reads `import.meta.env`.
- **Whiteboard & Voice Sync (`src/components/board/`, `src/components/media/`):** Apply validated tutor `board_actions` to Excalidraw/KaTeX and confirm the updated `board_revision` before playing French TTS audio. Clicking **Stop / Interrupt** must cancel local audio in `< 500 ms` and call `POST /api/v1/sessions/{id}/interrupt`.
- **Photo Symbol Confirmation:** Uploaded exercise photos must go through the symbol-confirmation modal before the confirmed expression is submitted to a tutoring turn.
- **Acceptance tests (`e2e/`):** Playwright owns the scripted journeys, interruption cases, photo confirmation, practice, session resume, refusal rendering, and credit-exhausted fallback.
