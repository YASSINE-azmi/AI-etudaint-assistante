# Frontend setup

The **AI Mathematics Tutor** uses a Vite + React + TypeScript SPA for the interactive Tronc Commun Scientifique (TCS) classroom: French chat transcript, synchronized **Excalidraw + KaTeX** shared whiteboard, push-to-talk audio recording with `< 500 ms` local interruption, exercise photo upload with ambiguous-symbol confirmation, reviewed **MAXI Maths** practice, and weekly study planning.

We use a plain Vite SPA rather than Next.js because the app is an authenticated, interactive classroom client that communicates directly with the FastAPI backend—no SSR, server components, or frontend API routes are needed.

## Prerequisites

- Node.js `20+` (LTS)
- [`pnpm`](https://pnpm.io/installation)
- A configured Supabase project (see [Supabase setup](supabase-setup.md))
- Running FastAPI backend (see [Backend setup](backend-setup.md))

## Init (from empty `frontend/`)

```bash
cd frontend
pnpm create vite . --template react-ts
pnpm install
pnpm add react-router-dom @supabase/supabase-js ai @ai-sdk/react @excalidraw/excalidraw katex
pnpm add -D @types/katex tailwindcss @tailwindcss/vite
pnpm dlx shadcn@latest init
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
pnpm tsc --noEmit
pnpm lint
```

## Key frontend boundaries

- **Auth & HTTP (`src/lib/supabase.ts`, `src/lib/http.ts`):** All requests to FastAPI (`POST /sessions/{id}/chat/stream`, `POST /sessions/{id}/interrupt`, `POST /sessions/{id}/transcribe`, photo uploads, practice, and study plans) automatically inject `Authorization: Bearer <supabase_access_token>` and support `AbortController` cancellation.
- **Whiteboard & Voice Sync (`src/components/board/`, `src/components/media/`):** Apply validated tutor `board_actions` to Excalidraw/KaTeX and confirm the updated `board_revision` before playing French TTS audio. Clicking **Stop / Interrupt** must cancel local audio in `< 500 ms` and call `POST /sessions/{id}/interrupt`.
- **Photo Symbol Confirmation:** Uploaded exercise photos must go through the symbol-confirmation modal before the confirmed expression is submitted to a tutoring turn.
