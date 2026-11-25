# Frontend — agent notes

This is the React classroom SPA for the **AI Mathematics Tutor** (**MAXI Maths — Tronc Commun Scientifique**). Read [../AGENTS.md](../AGENTS.md) first — universal building rules live there. This file adds frontend-specific conventions.

## Stack

- **Plain React SPA** (Vite + TypeScript, strict). **Not Next.js** — do not suggest Next, SSR, server components, or file-based routing.
- **Tailwind CSS** for styling. No CSS modules, styled-components, Emotion, or `.module.css` files for component styles. Global theme tokens live in `src/index.css`.
- **shadcn/ui** for UI primitives. Add components with `pnpm dlx shadcn@latest add <name>` — don't hand-roll what shadcn already ships.
- **React Router** for routing (Classroom, Practice, Study Plan, Session History).
- **`@supabase/supabase-js`** for auth (email only — no Google sign-in, no SSO providers).
- **Vercel AI SDK UI** (`ai`, `@ai-sdk/react`) for turn state and streaming client behavior (`useChat`).
- **KaTeX** (`katex`) for French mathematical notation rendering in the classroom transcript.
- **Web Audio API / `MediaRecorder`** for push-to-talk French audio capture and immediate (`< 500 ms`) local audio interruption.
- **Playwright** (`@playwright/test`) for end-to-end acceptance tests.

## Package manager

**`pnpm` only.** Do not use `npm install` or `yarn add`. The lockfile is `pnpm-lock.yaml`. If you see `package-lock.json` or `yarn.lock` appear, that's a bug — delete it.

**Minimum release age: 7 days.** Configured via `.npmrc` (`minimum-release-age=10080` minutes). pnpm will refuse to install any package version published less than 7 days ago. This defends against typosquat / compromised-release attacks where a malicious version of a popular package goes live and gets pulled within hours.

If a fresh package is genuinely required (e.g. urgent security fix in a dep we already use), override per-install and justify in the commit message — don't lower the global threshold.

## Dependency policy

See universal policy in [../AGENTS.md](../AGENTS.md). Frontend-specific:

- **HTTP:** use the native `fetch` API through a thin client in `src/lib/http.ts` and the `api` singleton in `src/lib/api.ts`. **No axios, ky, got, superagent, redaxios.**
- **Dates:** use native `Date` and `Intl.DateTimeFormat`. No moment, dayjs, date-fns unless genuinely needed.
- **Utilities:** use native `Array` / `Object` / `Map` methods. No lodash, ramda.
- **State:** `useState` / `useReducer` / `useContext` first. Only reach for external state libraries when the pain is real.
- **Forms:** native `<form>` + `FormData` first.
- **Validation:** only add a schema library when we actually need runtime validation at boundaries.
- **UI components:** shadcn primitives via `pnpm dlx shadcn@latest add <name>`. Don't hand-roll what shadcn already ships.

Before adding a package, check:

1. Is there a native browser or TS/JS API that does this?
2. Does shadcn/ui already cover it?
3. Is it small, well-maintained, and worth the maintenance cost?

If yes to (3), add it — but flag the decision in the commit message.

## Layout (to be created during build)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── ui/            # shadcn primitives
│   │   ├── chat/          # Transcript, MAXI Maths citations, excerpts & refusal banners
│   │   └── media/         # Push-to-talk recorder, <500ms audio stop & photo symbol modal
│   ├── lib/               # Framework-agnostic helpers (env, supabase, http, api, auth)
│   ├── pages/             # Route-level components (classroom/, practice, study plan, history)
│   ├── App.tsx            # Router
│   ├── main.tsx
│   └── index.css          # Tailwind directives + global theme tokens
├── index.html
├── e2e/                    # Playwright journeys and interruption cases
├── playwright.config.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

Keep imports consistent with the `@/*` alias (e.g. `@/lib/api`, `@/components/ui/button`).

## Code style (frontend-specific)

- **TypeScript strict.** No `any` unless there's no alternative; prefer `unknown` and narrow.
- **Small, composable functions and components** over clever abstractions. Three similar lines > a premature generic.
- **One component = one file.** Components stay small enough to fit on one screen.
- **Tailwind classes inline.** No CSS modules, styled-components, Emotion, or `.module.css` for component styles. Global tokens live in `src/index.css`.

## Configuration

- All env reads go through a single `src/lib/env.ts` module that validates `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` at boot. Never read `import.meta.env.X` directly in components.
- Env vars are prefixed `VITE_` (Vite convention). Anything not prefixed is not exposed to the client.
- Never place `SUPABASE_SERVICE_ROLE_KEY` or AI provider keys in frontend env files.

## Backend integration & Classroom contract

- Talks to the FastAPI backend over JSON/streaming. URL comes from `VITE_API_BASE_URL`.
- Always use `api.get/post/put/patch/delete` from `@/lib/api` — it handles base URL, JSON, Supabase bearer token, `AbortController` timeouts/cancellation, and typed `ApiError`s (including `isNetworkError`).
- Auth is Supabase email. The bearer token is injected automatically via `src/lib/http.ts` and the AI SDK `DefaultChatTransport`; never thread tokens through component props.
- **Validated-content-before-speech:** Render the validated message and KaTeX math before playing French TTS audio. Never narrate content that is not visible.
- **Immediate interruption:** Clicking **Stop / Interrupt** must cancel local audio in `< 500 ms`, abort the active stream, and call `POST /sessions/{id}/interrupt` so stale `turnId` events are rejected.
- **Photo symbol confirmation:** Uploaded exercise photos must pass through the ambiguous-symbol confirmation dialog before tutoring begins.

## Testing

- **Playwright** (`@playwright/test`) owns end-to-end acceptance: the 10 scripted journeys, 20 interruption cases, photo confirmation, practice attempts, session save/resume, refusal rendering, and the credit-exhausted fallback. Put specs in `e2e/`; run `pnpm test:e2e`.
- **No unit test runner by default.** Do not add vitest, Jest, or Cypress unless a component grows logic that Playwright cannot reasonably cover; record the justification in the commit.
- Type and lint gates: `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- Capture Playwright traces on failure and attach them to the CI run.

## Anti-patterns (rejected)

- Reading `import.meta.env.X` directly outside `src/lib/env.ts`.
- Importing an HTTP library when `fetch` would do.
- Mixing client state libraries (Zustand + Jotai + Redux) for one project.
- `any` annotations to silence the type-checker.
- Custom CSS files / styled-components alongside Tailwind.
- Re-implementing a shadcn primitive by hand.
- Reaching for Next.js, SSR, or any framework that requires a Node server in front of the SPA.
- Calling AI providers or Supabase Storage service-role endpoints directly from the browser.
- Adding a unit test runner without a written justification.
