# Imran — Frontend, Classroom, Photos, Playwright

> **Member:** Imran.
>
> **Role source:** `docs/implementation-plan.md` §17.2 RACI.
> **Read first:** `AGENTS.md`, `frontend/AGENTS.md`, and the implementation plan.
> **Starting point:** Week-1 foundation (commit `ad2b78c`, PR #1). Work from `master` after the PR is merged; use `grunt` until then.
>
> This is a personal execution plan, not a second architecture document. If it conflicts with `docs/implementation-plan.md`, the plan wins.

## 1. Role contract

| Item | Detail |
| --- | --- |
| Accountable for | Classroom/frontend/photos/Playwright |
| Responsible for | The complete React classroom experience, KaTeX math rendering in the transcript, push-to-talk UI, photo-confirmation flow, and end-to-end acceptance tests |
| Supports | Yassine on citations, refusals, practice, and planning UI; Mohamed on auth, session, SSE, and media integration |
| Not responsible for | Retrieval, four-gate validation, prompt design, database schema, RLS, deployment, credit ledger |
| Main paths | `frontend/src/`, `frontend/e2e/`, `frontend/playwright.config.ts`, `frontend/src/index.css`, `frontend/AGENTS.md` |
| Main interfaces | `/api/v1/me`, curriculum, sessions, turns/SSE, exercises, progress, study plan, media |

**You own the user-visible contract.** If the backend returns an unvalidated or unsafe message, do not render it as a normal tutor answer. If a validated message or math expression cannot be rendered safely, do not display it as a normal tutor answer.

## 2. Operating rules

- Work **25–30 hours/week**. Keep a predictable weekly rhythm.
- Read the relevant plan section before starting a feature. Do not invent scope.
- Use **pnpm only**. No `npm install`, no `yarn`.
- Every task ships with TypeScript types, error/loading/empty states, and Playwright coverage where the flow is user-visible.
- Every PR gets one reviewer from Yassine or Mohamed. No direct pushes to `master`.
- Friday demo: show one working path, one failing edge case, and the Playwright evidence.
- Update `frontend/AGENTS.md` when a convention changes.
- Never put provider keys or the Supabase service-role key in the browser.
- No continuous listening. Push-to-talk only.
- French-first UI. No 1BAC/2BAC content.

## 3. Interfaces and handoffs

| When | From | To | Artifact |
| --- | --- | --- | --- |
| Week 2 | Mohamed | Imran | OpenAPI types for `/me`, chapters, sessions, turns, exercises, study plan |
| Week 2 | Yassine | Imran | Citation, refusal, and validated-step shapes |
| Week 3 | Imran | Mohamed | Auth/session integration notes and 401/403 behavior |
| Week 4 | Mohamed | Imran | Session CRUD and persistence endpoints |
| Week 6 | Mohamed + Yassine | Imran | SSE event sequence and final-message payload |
| Week 7 | Mohamed | Imran | Photo upload, STT, TTS, and media limits |
| Week 8 | Mohamed + Yassine | Imran | Interrupt endpoint, validated-content rendering contract, stale-turn behavior |
| Week 9 | Yassine + Mohamed | Imran | Exercise types, evaluator results, attempt persistence |
| Week 10 | Yassine + Mohamed | Imran | Planner rules and study-plan endpoints |
| Week 13 | Imran | Yassine | E2E failure list and frontend metrics |
| Week 15 | Imran | All | Demo script, recorded fallback, frontend report section |

If a contract is missing, do not guess silently. Add a typed placeholder, mark it `TODO(contract)`, and ask the owning member in the PR.

## 4. Week-by-week plan

### Weeks 1–2 — Foundation and frontend contracts

**Week 1**
- [ ] Run `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and the Playwright smoke suite.
- [ ] Read plan §7 (API/SSE), §13 (frontend), and §16 (testing).
- [ ] Add the frontend client modules: `src/lib/supabase.ts`, `src/lib/http.ts`, `src/lib/api.ts`, and `src/lib/sse.ts` skeletons.
- [ ] Add `/login` and `/session/:id` route placeholders without pretending they work.
- [ ] Keep the environment gate working; no direct `import.meta.env` reads outside `src/lib/env.ts`.
- [ ] Document the component boundaries for chat, math rendering, media, practice, and planning.

**Week 2**
- [ ] Convert the API contract into TypeScript types for profile, curriculum, sessions, turns, citations, refusals, exercises, and study plans.
- [ ] Build the login screen with Supabase email auth; no Google/SSO.
- [ ] Build reusable `RefusalBanner`, `CitationList`, `EvidenceExcerpt`, and `GateStatus` components with fixtures.
- [ ] Write the Playwright plan for the 10 scripted journeys and the 20 interruption cases.
- [ ] Review keyboard navigation, focus order, labels, and contrast on the shell.
- [ ] Hand the API type map to Mohamed and the SSE expectations to Yassine/Mohamed.

**Exit evidence:** typed frontend contracts, auth screen, reusable citation/refusal components, and a written E2E matrix.

### Weeks 3–4 — Identity and persistent classroom

**Week 3**
- [ ] Wire Supabase session handling, bearer injection, logout, and protected routes.
- [ ] Call `/api/v1/me`; display the synthetic profile and role.
- [ ] Handle `401`, `403`, expired sessions, and network failures with French messages.
- [ ] Add profile preferences (display name) only if Mohamed exposes the endpoint.
- [ ] Add Playwright auth tests for valid, missing, and expired tokens.
- [ ] Prove two synthetic users cannot see each other’s sessions in the UI.

**Week 4**
- [ ] Build the classroom transcript: student message, tutor message, citations, refusal, and status states.
- [ ] Add session create, list, rename, archive, soft delete, and resume.
- [ ] Add KaTeX rendering for validated math in the transcript, behind the validated message contract.
- [ ] Add session persistence UI: reload restores the validated history.
- [ ] Add the first classroom journey test: create session → send text → reload → resume.
- [ ] Hand session UI assumptions to Mohamed.

**Exit evidence:** authenticated classroom, persistent session reload, two-user isolation test, and validated math rendering in the transcript.

### Weeks 5–6 — Retrieval and grounded teaching UI

**Week 5**
- [ ] Add the chapter and objective selector, driven only by published curriculum data.
- [ ] Render citations with chapter, section, page, and a short excerpt; never render a full chunk.
- [ ] Add retrieval states: searching, no evidence, insufficient evidence, and out-of-scope.
- [ ] Add the source/evidence panel with short quotes and clear “why this source” labels.
- [ ] Add tests for citations and scope refusals.
- [ ] Review the French copy for the scope and evidence messages.

**Week 6**
- [ ] Implement the SSE client against the agreed AI SDK protocol.
- [ ] Handle `turn.started`, `retrieval.completed`, `validation.started`, `validation.completed`, `message.final`, `turn.failed`, and `turn.completed`.
- [ ] Render only the final validated text; never stream raw model tokens.
- [ ] Render refusal codes and next actions in French.
- [ ] Add accepted, refused, insufficient-evidence, and provider-unavailable journeys.
- [ ] Add a visible gate-status indicator for the demo, without exposing internals.

**Exit evidence:** end-to-end text turn with citations, refusals, and final-only rendering.

### Weeks 7–8 — Photos, voice, and interruption

**Week 7**
- [ ] Build photo upload with preview, MIME/size checks, and the ambiguous-symbol confirmation dialog.
- [ ] Submit only the confirmed expression to the tutor.
- [ ] Build push-to-talk with `MediaRecorder`; show recording, processing, and error states.
- [ ] Stop audio capture and local playback in **under 500 ms**.
- [ ] Add microphone-permission and denied-permission tests.
- [ ] Add a test that an unconfirmed photo never starts tutoring.

**Week 8**
- [ ] Implement validated-content-before-speech: render the validated text and math, then play TTS.
- [ ] Implement interruption: stop audio, abort the SSE stream, call `/interrupt`, and reject stale `turnId` events.
- [ ] Test that TTS does not play before the validated message is rendered.
- [ ] Build the 20 interruption cases from the plan.
- [ ] Test reconnect after a dropped stream without duplicating a completed turn.
- [ ] Review math/rendering safety behavior with Yassine and Mohamed.

**Exit evidence:** photo confirmation, push-to-talk, validated rendering, and 20/20 interruption cases.

### Weeks 9–10 — Practice and planning

**Week 9**
- [ ] Build the exercise list and the four exercise UIs: MCQ, numeric, algebraic, guided multi-step.
- [ ] Show hints individually; never leak answers before submission.
- [ ] Render `correct`, `incorrect`, and `inconclusive` distinctly.
- [ ] Show error categories and feedback in French.
- [ ] Add practice attempt, retry, and hint tests.
- [ ] Hand evaluator assumptions to Yassine.

**Week 10**
- [ ] Build availability windows with `Africa/Casablanca` timezone handling.
- [ ] Build the weekly plan view with 45-minute blocks, breaks, and editable tasks.
- [ ] Add complete/skip task actions and regeneration behavior.
- [ ] Show progress and revision indicators with cautious labels, not mastery percentages.
- [ ] Add planner edge-case tests: no availability, overlapping windows, DST/midnight.
- [ ] Hand planner UI assumptions to Yassine and Mohamed.

**Exit evidence:** practice attempts persist, and the study plan is editable and resumable.

### Weeks 11–12 — Integration and feature freeze

**Week 11**
- [ ] Build session history, search, summaries, and reconnect/resume.
- [ ] Complete all loading, empty, error, and offline states.
- [ ] Review every French string with the team; remove technical jargon from student-facing text.
- [ ] Run the full journey in the demo environment.
- [ ] Add a demo-mode banner that clearly labels synthetic data and trial credits.
- [ ] Fix integration defects found in the weekly demo.

**Week 12**
- [ ] **Feature freeze.** No new UI features after this week.
- [ ] Run the full Playwright suite and capture traces.
- [ ] Review responsive layouts at mobile, tablet, and desktop widths.
- [ ] Check keyboard-only use, focus visibility, reduced motion, and screen-reader labels.
- [ ] Check bundle size, route-level loading, and repeat-render behavior.
- [ ] Produce the frontend freeze note: known gaps, accepted risks, and release blockers.

**Exit evidence:** frozen UI, full E2E run, accessibility notes, and a release-blocker list.

### Weeks 13–14 — Evaluation and release candidate

**Week 13**
- [ ] Run the 10 scripted journeys and 20 interruption cases against the evaluation build.
- [ ] Record every failure with a screenshot, trace, and reproduction steps.
- [ ] Triage failures into frontend, backend, validation, or data.
- [ ] Fix frontend blockers; do not hide failures with UI changes.
- [ ] Provide Yassine with the frontend evidence for the evaluation report.

**Week 14**
- [ ] Run regression on the release candidate.
- [ ] Re-test auth, citations, refusals, photo confirmation, interruption, practice, and planning.
- [ ] Check Chrome and Edge on Windows 11; note any browser-specific issue.
- [ ] Check no provider keys or service-role values appear in the bundle or network calls.
- [ ] Fix release blockers only.

**Exit evidence:** release-candidate E2E report and no known frontend release blocker.

### Weeks 15–16 — Report, rehearsal, submission

**Week 15**
- [ ] Write the frontend/report section: architecture, routes, state flow, accessibility, Playwright evidence, limitations.
- [ ] Build the demo script for the frontend path: login → session → text turn → citation → refusal → photo → voice → practice → plan.
- [ ] Record the fallback video with synthetic data.
- [ ] Rehearse the live demo and the failure path.
- [ ] Update the known-issues list.

**Week 16**
- [ ] Final demo.
- [ ] Submit the report and tagged release evidence.
- [ ] Confirm the fallback recording is available.
- [ ] Close frontend issues that are not release blockers.
- [ ] Hand over the demo notes and known issues.

**Exit evidence:** final demo, report section, recorded fallback, and closed frontend checklist.

## 5. Tests you own

- Playwright smoke, auth, session, citation, refusal, SSE, math rendering, photo, voice, interruption, practice, planning, and resume journeys.
- Accessibility checks: keyboard, focus, labels, contrast, reduced motion.
- Contract checks: frontend types match the backend OpenAPI/SSE contract.
- Regression: 10/10 journeys and 20/20 interruption cases at release.

## 6. Definition of done

- Every route has loading, empty, error, and unauthorized states.
- No unvalidated tutor text is rendered as a normal answer.
- No full corpus chunk is exposed in the UI.
- Interruption stops local audio in under 500 ms and rejects stale events.
- Validated text and math are rendered before speech; unsafe rendering is refused.
- Push-to-talk is the only voice mode.
- All user-facing copy is French and free of 1BAC/2BAC content.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test:e2e` pass.
- The PR includes tests and a short demo note.

## 7. Final deliverables

- Frontend implementation and Playwright suite.
- `frontend/AGENTS.md` kept current.
- Accessibility and responsive notes.
- Frontend section of the academic report.
- Demo script and recorded fallback for the frontend path.
- Known-issues list for the frontend.

## 8. Risks you own

- **Frontend orphan:** keep weekly demos and integration PRs; do not build in isolation.
- **Late integration:** use typed contracts early and test against the real API as soon as Mohamed exposes it.
- **Unsafe rendering:** never bypass the validated message contract.
- **Accessibility debt:** test keyboard and screen-reader basics every week, not only at the end.

## 9. First 7 days checklist

- [ ] Run the current frontend checks and smoke tests.
- [ ] Read plan §7, §13, and §16.
- [ ] Create the four `src/lib/` client modules.
- [ ] Add `/login` and `/session/:id` placeholders.
- [ ] Write the E2E matrix for 10 journeys and 20 interruption cases.
- [ ] Ask Mohamed for the API contract and Yassine for citation/refusal shapes.
- [ ] Post the first Friday demo note.
