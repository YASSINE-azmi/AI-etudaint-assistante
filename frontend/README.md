# Frontend — classroom SPA

React + TypeScript + Vite client for the **AI Mathematics Tutor** (TCS academic demo).

## Commands

```powershell
Copy-Item .env.example .env
pnpm install
pnpm dev
```

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Local dev server on `http://localhost:5173` |
| `pnpm typecheck` | TypeScript project build check |
| `pnpm lint` | Oxlint |
| `pnpm build` | Typecheck and production build |
| `pnpm test:e2e` | Playwright acceptance suite |
| `pnpm test:e2e:ui` | Playwright interactive mode |

Playwright installs its browser on first use: `pnpm exec playwright install chromium`.

## Environment

Only browser-safe values belong in `.env`:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never add the service-role key, database URL, or AI provider keys. `src/lib/env.ts` is the only module that reads `import.meta.env`; the app renders a setup screen when required values are missing.

## Structure

```text
src/
├── components/       # Shell, page header, empty state, icons
├── lib/              # env.ts (API/Supabase helpers land here)
├── pages/            # Classroom, practice, study plan, history, setup
├── App.tsx           # Routes
├── main.tsx          # Env gate + router bootstrap
└── index.css         # Tailwind import and design tokens
```

The shell is intentionally non-functional until the corpus and tutoring pipeline are published. It shows the locked scope and the next delivery step rather than simulating answers.

## Boundaries

- French-first UI.
- No 1BAC/2BAC content.
- No continuous listening.
- No provider keys in the browser.
- Playwright owns end-to-end acceptance; see `../AGENTS.md` and `AGENTS.md`.
