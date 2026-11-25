# Mohamed — Platform, Auth, Backend, Database, Jobs, Deployment, Planning

> **Member:** Mohamed.
>
> **Role source:** `docs/implementation-plan.md` §17.2 RACI.
> **Read first:** `AGENTS.md`, `backend/AGENTS.md`, and the implementation plan.
> **Starting point:** Week-1 foundation (commit `ad2b78c`, PR #1). Work from `master` after the PR is merged; use `grunt` until then.
>
> This is a personal execution plan, not a second architecture document. If it conflicts with `docs/implementation-plan.md`, the plan wins.

## 1. Role contract

| Item | Detail |
| --- | --- |
| Accountable for | Platform/auth/backend/DB/jobs/deployment/planning |
| Responsible for | FastAPI platform, Supabase auth and RLS, schema and migrations, turn state machine, idempotency, budget ledger, media storage, background jobs, CI, deployment, backups, runbooks, study-plan persistence |
| Supports | Imran on API/SSE contracts, auth behavior, media upload, and resume; Yassine on retrieval schema, ingestion CLI, gate integration, evaluator persistence, and evaluation environment |
| Not responsible for | React UI, KaTeX math rendering, prompt design, retrieval ranking, gate logic, math verification, Playwright test authoring |
| Main paths | `backend/app/`, `backend/alembic/`, `backend/tests/`, `.github/workflows/`, deployment config, `docs/guides/` |
| Main interfaces | Auth/JWT, `/api/v1/me`, curriculum, sessions, turns/SSE, interrupt, exercises, progress, study plan, media, jobs, usage/budget |

**You own the safety envelope.** Identity, authorization, persistence, turn state, cancellation, credit limits, and deployment are enforced server-side and in Postgres — not in the browser and not by the model. If a rule is not enforced by the database or the API, it is not enforced.

## 2. Operating rules

- Work **25–30 hours/week**. Keep a predictable weekly rhythm.
- Read the relevant plan section before starting a feature. Do not invent tables, endpoints, or settings outside the plan.
- Use **uv** for backend dependencies and **pnpm** for frontend commands. Python is pinned to `3.12`.
- `backend/app/config.py` is the only settings source. No `os.getenv`, no `load_dotenv`, no silent defaults for required values.
- Keep route handlers thin: HTTP input/output in `api/`, logic in service/domain modules, queries in repositories.
- Every schema change ships as an Alembic migration with a working downgrade. RLS is enabled in the same migration that creates the table.
- Student-facing requests use `DATABASE_RUNTIME_URL` only. The service-role key is confined to CLI/ingest/admin paths and the import-boundary test must stay green.
- Idempotency, locking, and budget checks happen in Postgres transactions. In-process locks are only an optimization.
- No secrets, raw prompts, answers, photos, or audio in logs. Redact before logging.
- Never weaken authorization, provenance, scope control, or validation to make a demo pass.
- Every PR gets a reviewer from Imran or Yassine. No direct pushes to `master`.
- Friday demo: show one migration, one security test, and one failure path.
- **Week 12 is feature freeze** for schema, API, SSE, auth, jobs, and deployment. After that, only release blockers and approved substitutions.
- Update `docs/guides/` and the runbooks whenever an operational step changes.

## 3. Interfaces and handoffs

| When | From | To | Artifact |
| --- | --- | --- | --- |
| Week 1 | Mohamed | Yassine | SSE transport prototype and turn state sketch |
| Week 1 | Mohamed | All | Supabase project, `app_runtime` role, environment matrix |
| Week 2 | Mohamed | Imran | OpenAPI skeleton, typed error envelope, pagination contract |
| Week 2 | Mohamed | Yassine | Schema constraints, migration order, RLS policy matrix |
| Week 3 | Mohamed | Imran | Auth behavior, `/me`, 401/403/expired-token handling |
| Week 4 | Mohamed | Imran + Yassine | Session CRUD, validated history persistence |
| Week 5 | Mohamed | Yassine | Curriculum/source/chunk tables, indexes, publish/withdraw DB support |
| Week 6 | Mohamed + Yassine | Imran | SSE event sequence, final-message payload, idempotent replay |
| Week 7 | Mohamed | Imran + Yassine | Private media upload, signed URLs, STT/TTS adapters |
| Week 8 | Mohamed | Imran + Yassine | Interrupt endpoint, cancellation semantics, stale-turn rejection |
| Week 9 | Mohamed | Imran + Yassine | Attempt/hint persistence and progress endpoint |
| Week 10 | Mohamed | Imran + Yassine | Study-plan endpoints, timezone rules, regeneration transaction |
| Week 11 | Mohamed | All | Jobs, usage/budget report, metrics, demo deployment |
| Week 13 | Mohamed | Yassine | Stable evaluation environment, DB snapshot, cost/latency exports |
| Week 15 | Mohamed | All | Runbooks, restore evidence, deployment notes, platform report section |

If a contract is missing, do not guess silently. Add a typed placeholder, mark it `TODO(contract)`, and resolve it with the owning member before the dependent UI or gate work lands.

## 4. Week-by-week plan

### Weeks 1–2 — Platform baseline and contracts

**Week 1**
- [ ] Run `uv sync --frozen`, `ruff check`, `ruff format --check`, `mypy app`, and `uv run python -m pytest`; confirm the 4 foundation tests.
- [ ] Read plan §5 (data model), §6 (identity), §7 (API/SSE), §11 (engine/budget), §14 (security), §16 (testing), and §18 (operations).
- [ ] Add CI: backend lint/format/type/unit tests and frontend typecheck/lint/build/Playwright smoke.
- [ ] Harden the settings module: fail fast on missing required values, document every variable from plan Appendix A, and keep `.env.example` in sync.
- [ ] Review request IDs, structured logging, CORS, and the error envelope; make them consistent across `/health`, `/ready`, and `/api/v1/me`.
- [ ] Create or confirm the Supabase project; run `backend/scripts/bootstrap_runtime_role.sql`; verify `app_runtime` is not the table owner and cannot bypass RLS.
- [ ] Record the environment matrix: who holds which secret, where it lives, and how it rotates.
- [ ] Prototype the turn SSE transport with Yassine using a fixture response; do not connect a model or claim tutoring works.
- [ ] Draft the schema and RLS policy matrix with Yassine from plan §5.

**Week 2**
- [ ] Freeze the OpenAPI skeleton: auth, `/me`, chapters, sessions, turns, exercises, progress, study plan, media.
- [ ] Implement the standard error body `{ code, messageFr, requestId }` and map `400/401/403/404/409/422/429/502/503/504`.
- [ ] Implement cursor pagination (`?limit=20&cursor=...`) with stable `(created_at, id)` ordering.
- [ ] Add the API/DB contract notes Imran and Yassine need; keep them in the plan or a short guide, not a competing architecture document.
- [ ] Extend the service-role import-boundary test to cover future student-facing modules.
- [ ] Finalize the migration order and the RLS policy matrix with Yassine.
- [ ] Produce the Week-2 go/no-go platform evidence: auth skeleton, CI, contracts, environment risks.

**Exit evidence:** CI green, stable settings, OpenAPI skeleton, SSE prototype, `app_runtime` verified, and a reviewed schema/RLS matrix.

### Weeks 3–4 — Identity, RLS, and persistent classroom

**Week 3**
- [ ] Add the `profiles` migration with role, `academic_track='TCS'`, `is_synthetic`, and timestamps.
- [ ] Enable RLS and `FORCE ROW LEVEL SECURITY`; add policies for own-profile read/update and role checks.
- [ ] Implement `GET /api/v1/me` and `PATCH /api/v1/me` against the verified JWT and profile row.
- [ ] Verify JWKS behavior: signature, issuer, audience, expiry, `kid` rotation, clock skew, missing/invalid token.
- [ ] Add auth tests for valid, expired, wrong-audience, wrong-issuer, and unknown-user tokens.
- [ ] Prove two synthetic users cannot read or mutate each other's profile, sessions, or turns.
- [ ] Add the cross-user denial test to CI.

**Week 4**
- [ ] Add `tutoring_sessions`, `session_turns`, `teaching_steps`, and `turn_citations` migrations with the plan invariants and indexes.
- [ ] Implement session create, list, get, rename/archive, soft delete, and resume with cursor pagination.
- [ ] Persist validated history and display/spoken text from completed steps; nothing unvalidated is stored as teachable content.
- [ ] Add turn history retrieval for the classroom reload path.
- [ ] Test migration upgrade from empty and downgrade for every new revision.
- [ ] Hand session/history behavior and validated-content persistence notes to Imran and Yassine.

**Exit evidence:** two-user isolation, authenticated classroom persistence, reload/resume works, and migrations upgrade/downgrade cleanly.

### Weeks 5–6 — Curriculum, retrieval support, and the turn engine

**Week 5**
- [ ] Add `curriculum_chapters`, `curriculum_objectives`, `objective_prerequisites`, `source_documents`, `source_revisions`, `document_chunks`, `chunk_objectives`, `exercises`, and `exercise_revisions`.
- [ ] Add the HNSW index on `embedding`, the GIN index on `search_vector`, and the required B-tree/JSONB indexes.
- [ ] Implement publish/withdraw DB transitions with append-only status history and immutable published revisions.
- [ ] Support Yassine's ingestion CLI: draft, provenance, normalize, map, review, approve, publish, withdraw.
- [ ] Record audit events for publication and withdrawal.
- [ ] Add RLS/read policies for published curriculum and deny draft access to students.
- [ ] Seed only synthetic/open-licensed content in the repository. Never commit textbook text or PDFs.
- [ ] Test publication, withdrawal, retrieval exclusion, and historical citation preservation.

**Week 6**
- [ ] Implement the turn state machine: `pending → processing → completed | failed | cancelled` with conditional updates or row locks.
- [ ] Implement required `Idempotency-Key`, unique `(session_id, key)`, `request_hash`, replay, and `409` conflicts.
- [ ] Enforce max turns per session atomically with the turn insert.
- [ ] Wire the pipeline: auth → scope resolution → retrieval → draft → gates → persist → SSE final.
- [ ] Implement the SSE contract with final-only text; never forward raw model tokens.
- [ ] Add stage timeouts, bounded retries, and cancellation checks between stages.
- [ ] Add `budget_reservations` and `usage_events`; reserve before dispatch and reconcile after completion.
- [ ] Add integration tests for state transitions, replay, conflicts, timeout, and budget rejection.
- [ ] Hand the agreed SSE sequence and replay behavior to Imran.

**Exit evidence:** a persisted turn runs end-to-end through the gates, replays idempotently, and emits only the validated final message.

### Weeks 7–8 — Media, interruption, and recovery

**Week 7**
- [ ] Create a private Supabase Storage bucket for student media; never make it public.
- [ ] Implement photo upload with a 10 MB limit, MIME allowlist, re-encode, metadata stripping, and signed access.
- [ ] Enforce ownership on every media read/write; test cross-user access denial.
- [ ] Add STT and TTS provider adapters behind the server boundary.
- [ ] Never persist raw microphone audio. Delete temporary audio immediately after STT.
- [ ] Return TTS audio through an authenticated, short-lived path; never expose provider keys.
- [ ] Add upload, MIME, oversize, ownership, and audio-retention tests.
- [ ] Hand the media contract and limits to Imran and Yassine.

**Week 8**
- [ ] Implement `POST /api/v1/sessions/{id}/interrupt` with ownership checks and idempotent behavior.
- [ ] Mark turns `cancelled` on client abort when detected, release the reservation, and reject stale `turnId` events.
- [ ] Add the validated-content rendering contract and server-side safety boundary with Imran and Yassine.
- [ ] Add the worker claim pattern with `FOR UPDATE SKIP LOCKED` and the stuck-turn recovery handler.
- [ ] Add adversarial tests: forged session/turn IDs, cross-user interrupt, stale turn, replay after cancel.
- [ ] Support Imran's 20 interruption cases with deterministic backend behavior.
- [ ] Verify a failed gate or cancellation never persists a partial teachable turn.

**Exit evidence:** private media, push-to-talk support, interrupt/cancel semantics, stale-event rejection, and worker recovery.

### Weeks 9–10 — Practice and planning platform

**Week 9**
- [ ] Add `exercise_attempts` and `hint_events` with `exercise_revision_id` pinning and RLS.
- [ ] Implement exercise listing, attempt submission, hint recording, and `GET /api/v1/progress`.
- [ ] Persist evaluator results, error categories, feedback, and hint counts.
- [ ] Enforce one attempt per submission and reject attempts against unpublished exercises.
- [ ] Integrate Yassine's evaluator without moving evaluation logic into the route handler.
- [ ] Add tests for ownership, revision pinning, unpublished exercises, and repeated attempts.
- [ ] Hand persistence and error behavior to Imran and Yassine.

**Week 10**
- [ ] Add `study_plans`, `availability_windows`, and `study_tasks` with the partial unique active-plan constraint and `start < end` checks.
- [ ] Implement `GET /api/v1/study-plan`, `PUT /api/v1/study-plan`, and `PATCH /api/v1/study-tasks/{id}`.
- [ ] Implement transactional plan replacement that preserves completed tasks and never leaves two active plans.
- [ ] Enforce `Africa/Casablanca` timezone handling and bounded daily minutes at the API boundary.
- [ ] Integrate Yassine's deterministic planner rules; keep generation out of the route handler.
- [ ] Add tests for no availability, overlapping windows, DST/midnight, regeneration, and concurrent plan updates.
- [ ] Hand planner behavior to Imran and Yassine.

**Exit evidence:** attempts and hints persist, progress is queryable, and the study plan is editable, timezone-safe, and concurrency-safe.

### Weeks 11–12 — Admin, jobs, observability, and freeze

**Week 11**
- [ ] Add the `jobs` table, runner, and idempotent handlers: stuck turns, reservation release, expired idempotency keys, media cleanup, optional evaluation.
- [ ] Add usage/budget reporting and the admin read-only summary needed for the academic demo.
- [ ] Add session summaries and reconnect support if the plan's Week-11 increment requires them.
- [ ] Add metrics: p50/p95 latency by stage, gate pass/fail, refusal rate, provider errors, credit remaining, cross-user attempts.
- [ ] Add alerts for 80% credit, provider outage, stuck turns, and migration failure without student content.
- [ ] Deploy the demo environment: Supabase + Railway or local, migrations as a release step, health/readiness verified.
- [ ] Verify no service-role key or provider key is present in the frontend bundle or network calls.
- [ ] Fix integration defects found in the weekly demo.

**Week 12**
- [ ] **Feature freeze** for schema, API, SSE, auth, jobs, and deployment.
- [ ] Run the full backend suite including integration tests against `pgvector` Postgres.
- [ ] Run Alembic from empty to head and back down; record the result.
- [ ] Audit RLS coverage on every student-owned table and re-run cross-user denial tests.
- [ ] Run a secrets scan and dependency audit; record accepted risks.
- [ ] Produce the platform freeze note: known gaps, accepted risks, release blockers.
- [ ] Hand frozen contracts to Imran and Yassine.

**Exit evidence:** frozen platform, green CI, verified RLS/migrations, demo deployment, and a release-blocker list.

### Weeks 13–14 — Evaluation and release candidate

**Week 13**
- [ ] Keep the evaluation environment stable: pinned image, pinned migrations, synthetic seed data, and a database snapshot.
- [ ] Export cost, latency, provider-error, and cross-user denial evidence for Yassine's evaluation.
- [ ] Correlate request, session, and turn IDs in logs without exposing student content.
- [ ] Triage infrastructure failures separately from retrieval, validation, math, and UI failures.
- [ ] Fix platform defects that block the evaluation; do not change prompts or corpus.
- [ ] Provide Yassine with the environment and cost evidence for the evaluation report.

**Week 14**
- [ ] Run regression on the release candidate.
- [ ] Restore a backup into an isolated database and verify sessions, turns, citations, and plans.
- [ ] Rehearse rollback and a migration-failure drill; record the exact commands and outcomes.
- [ ] Test concurrency: duplicate turns, simultaneous plan updates, interrupt during processing, worker recovery.
- [ ] Simulate provider outage and credit exhaustion; verify French failure messages and hard stop.
- [ ] Re-run 100% cross-user access denial and rate-limit checks.
- [ ] Fix release blockers only.

**Exit evidence:** release-candidate platform report, restore/rollback evidence, and no known platform release blocker.

### Weeks 15–16 — Restore, report, rehearsal, and submission

**Week 15**
- [ ] Complete the runbooks: deployment, migration failure, provider outage, credit exhaustion, source withdrawal, demo failure, backup restore, incident response.
- [ ] Deploy the final demo environment; seed synthetic users, sessions, and exercises; verify migrations and readiness.
- [ ] Record a `pg_dump` before the demo and confirm the restore procedure.
- [ ] Write the platform/report section: architecture layering, auth/RLS, schema, turn state machine, budget, jobs, deployment, limitations.
- [ ] Prepare demo evidence for auth isolation, persistence, interruption, credit hard stop, and restore.
- [ ] Rehearse the live demo with Imran and Yassine, including the failure path and fallback recording.
- [ ] Update the known-issues list.

**Week 16**
- [ ] Final deploy and tag `v0.1.0`.
- [ ] Monitor logs, readiness, credit balance, and provider health during the demo.
- [ ] Execute incident response if a failure occurs; switch to the recorded fallback if needed.
- [ ] Submit deployment/restore/security evidence and the report section.
- [ ] Hand over runbooks, environment access, and known limitations.
- [ ] Record the retention deadline and schedule deletion of synthetic sessions and media 30 days after the demo.

**Exit evidence:** final demo, tagged release, restore/rollback evidence, report section, and a complete handover.

## 5. Runbooks you own

| Runbook | Must contain |
| --- | --- |
| Deployment | Exact commands, environment variables, migration step, health/readiness checks, rollback |
| Migration failure | Detection, stop condition, restore path, forward-fix vs rollback decision, owner |
| Provider outage | Detection, retry policy, French user message, fallback recording, recovery check |
| Credit exhaustion | 80% alert, hard-stop behavior, `CREDIT_EXHAUSTED`, no ungrounded fallback |
| Source withdrawal | DB transition, retrieval exclusion, historical citation behavior, exercise impact |
| Demo failure | Fallback recording, cached validated answers, who decides, how it is labeled |
| Backup restore | `pg_dump` command, isolated restore, verification queries, data-retention step |
| Incident response | Disable capability, contain, preserve diagnostics, notify, fix, document, re-enable |

Each runbook is tested at least once before Week 16. An untested runbook is a wish, not a procedure.

## 6. Tests you own

- **Unit:** settings validation, error envelope, cursor pagination, rate limits, idempotency keys, budget reservation, state transitions.
- **Integration:** migrations up/down, RLS policies, session CRUD, turn persistence, SSE, replay, interrupt, jobs, storage, study plans.
- **Security:** JWT/JWKS edge cases, cross-user access, forged IDs, service-role import boundary, media ownership, secrets in bundle/logs.
- **Reliability:** duplicate turns, concurrent sessions, timeout, cancellation, stuck-turn recovery, provider outage, credit exhaustion.
- **Operations:** backup restore, rollback, migration failure drill, health/readiness.
- **Contract:** OpenAPI schema, SSE event sequence, error codes, date/time and pagination shapes.

## 7. Release gates you must prove

| Gate | Evidence |
| --- | --- |
| 100% cross-user access denial | Automated tests for profiles, sessions, turns, media, attempts, plans |
| 0 service-role imports in student request graph | Import-boundary test in CI |
| Idempotent turns | Replay, same-key/different-hash, concurrent duplicate tests |
| No duplicate or stale speech | Interrupt, cancel, replay, stale-`turnId` tests |
| Credit hard stop | `CREDIT_EXHAUSTED` test with no generated text |
| Migrations from empty and back | CI log for every revision |
| Backup restore | Restore into isolated DB and verification query output |
| No secrets exposed | Bundle scan, log scan, repository scan |
| Latency target | p95 by stage from the demo environment |
| 10/10 journeys, 20/20 interruptions | Imran's Playwright evidence supported by stable backend behavior |

## 8. Definition of done

- RLS is enabled and forced on every student-owned table; the runtime role is not the owner.
- The service-role key never appears in a student request path.
- Every turn is idempotent, cancellable, and persisted with its validation metadata.
- Refusals are completed turns; provider/infrastructure failures are failed turns; aborts are cancelled.
- No raw model tokens, unvalidated text, or full corpus chunks leave the server.
- Budget reservation and reconciliation are atomic with the turn.
- Media is private, size/MIME checked, metadata-stripped, and access-controlled.
- Jobs are claimed with `FOR UPDATE SKIP LOCKED` and are safe to retry.
- Migrations upgrade from empty and downgrade cleanly.
- Health/readiness, logs, metrics, and alerts work in the demo environment.
- Runbooks are written and tested.
- `ruff check`, `ruff format --check`, `mypy app`, and `pytest` pass.
- The PR includes migration notes, security notes, and a short demo note.

## 9. Final deliverables

- FastAPI platform, auth, database models, repositories, migrations, and RLS policies.
- Turn engine, idempotency, SSE transport, interruption, budget ledger, and jobs.
- Media storage and speech/vision adapter integration.
- Practice/planning persistence and progress endpoints.
- CI pipeline, demo deployment, and environment documentation.
- Backup/restore, rollback, and incident runbooks.
- Platform/security/operations section of the academic report.
- Tagged `v0.1.0` release evidence and handover notes.

## 10. Risks you own

- **Trial credits exhausted:** global ledger, reservation, 80% alert, hard stop, recorded fallback.
- **Free-tier hosting limits:** local-first demo, measured resource use, fallback recording.
- **RLS or authorization bug:** FORCE RLS, non-owner role, cross-user tests on every PR.
- **Secret leakage:** single settings module, import boundary, bundle/log/repo scans.
- **Migration failure:** reviewed migrations, downgrade tests, backup before release, rollback runbook.
- **Duplicate or stuck turns:** Postgres locks, idempotency, worker recovery, cancellation checks.
- **Provider outage:** bounded retries, French failure message, fallback recording.
- **Backup/restore failure:** restore drill before the demo, not during it.
- **Late deployment:** deploy the walking skeleton early and keep the demo environment current.
- **Platform scope creep:** freeze at Week 12; no new infrastructure after that without change control.

## 11. First 7 days checklist

- [ ] Run the backend checks and tests on Windows 11.
- [ ] Read plan §5, §6, §7, §11, §14, §16, and §18.
- [ ] Add the CI workflow.
- [ ] Confirm the Supabase project, `app_runtime` role, and secret ownership.
- [ ] Prototype the SSE transport with Yassine.
- [ ] Draft the OpenAPI skeleton and error envelope.
- [ ] Draft the schema/RLS matrix with Yassine.
- [ ] Post the first Friday evidence note: one migration plan, one security test, one failure path.
