# Yassine — Teaching, Retrieval, Validation, Evaluation

> **Member:** Yassine.
>
> **Role source:** `docs/implementation-plan.md` §17.2 RACI.
> **Read first:** `AGENTS.md`, `backend/AGENTS.md`, and the implementation plan.
> **Starting point:** Week-1 foundation (commit `ad2b78c`, PR #1). Work from `master` after the PR is merged; use `grunt` until then.
>
> This is a personal execution plan, not a second architecture document. If it conflicts with `docs/implementation-plan.md`, the plan wins.

## 1. Role contract

| Item | Detail |
| --- | --- |
| Accountable for | Teaching/retrieval/validation/evaluation |
| Responsible for | Corpus mapping, hybrid retrieval, RRF, sufficiency, PydanticAI tutor, prompts, four gates, SymPy/rubric math checks, exercise evaluator, planner rules, evaluation harness |
| Supports | Imran on citations, refusals, practice, and planning; Mohamed on retrieval schema, ingestion, and turn-engine integration |
| Not responsible for | React UI, database migrations, auth/RLS, deployment, jobs, Playwright infrastructure |
| Main paths | `backend/app/retrieval/`, `assistant/`, `validation/`, `practice/`, `planning/`, `backend/ingest/`, `backend/tests/` |
| Main interfaces | Published chunks, retrieval results, validated steps, citations, refusal codes, evaluator results, planner inputs |

**You own the truthfulness contract.** The model is never authoritative. Scope, evidence, math checks, and refusal codes are decided by deterministic code plus the reviewer-approved corpus.

## 2. Operating rules

- Work **25–30 hours/week**.
- Read the relevant plan section before starting. Do not invent objectives, chapters, exercises, or thresholds.
- Every claim must have a valid citation. If evidence is missing, refuse or clarify; never fall back to an ungrounded answer.
- The model writes a **draft**; the server decides release.
- No raw model tokens reach the student before validation.
- No 1BAC/2BAC/university content.
- Keep prompts and gate versions explicit; a prompt change requires regression evaluation.
- Prepare the mathematics reviewer’s packet every week. Reviewer time is **2–3 hours/week**.
- Friday demo: show retrieval evidence, gate results, and one failure case.

## 3. Interfaces and handoffs

| When | From | To | Artifact |
| --- | --- | --- | --- |
| Week 2 | Yassine | Imran + Mohamed | Draft output, citation, refusal, and SSE message shapes |
| Week 2 | Yassine + reviewer | Team | Coverage matrix and academic-use input |
| Week 3 | Yassine | Mohamed | Retrieval schema requirements: chunks, objectives, indexes, search text |
| Week 5 | Yassine + reviewer | Mohamed | Publish/withdraw CLI requirements and sample published content |
| Week 6 | Yassine | Mohamed + Imran | Validated-step payload and gate status contract |
| Week 7 | Yassine | Imran + Mohamed | Photo symbol-confirmation contract and math-gate behavior |
| Week 8 | Yassine | Mohamed + Imran | Math/rendering gate results and stale-turn behavior |
| Week 9 | Yassine | Mohamed + Imran | Exercise evaluator contract and error categories |
| Week 10 | Yassine | Mohamed + Imran | Planner inputs, constraints, and tie-break rules |
| Week 13 | Yassine | All | Evaluation results and triage list |
| Week 15 | Yassine | All | Teaching/validation/evaluation report sections and demo evidence |

If a contract is missing, fail closed and mark the gap. Do not let the UI or provider fill it with invented behavior.

## 4. Week-by-week plan

### Weeks 1–2 — Benchmark, corpus sample, and scope gate

**Week 1**
- [x] Benchmark 20 French math prompts for correctness, latency, cost, and JSON reliability.
- [x] Record the candidate model, provider, prompt version, and failure modes. Model choice is static per role (ADR 0008): benchmark first, then pin it in settings — no runtime routing.
- [ ] Prototype the SSE turn contract with Mohamed; agree on final-only text and failure events. Content side done ([contract](../contracts/sse-turn-contract.md)); tick once Mohamed signs off and his fixture endpoint streams it.
- [ ] Extract one chapter sample and run the retrieval/RRF spike.
- [ ] Draft the evaluation rubric with the mathematics reviewer.
- [ ] Read plan §8, §9, §10, and §16.

**Week 2**
- [ ] Build the coverage matrix: three chapters, objectives, concept tags, and prerequisites.
- [ ] Confirm chapter IDs, objective IDs, page ranges, and coverage with the reviewer.
- [ ] Record the academic-use note input with the team lead and supervisor.
- [ ] Freeze the draft output contract, citation contract, refusal codes, and status mapping.
- [ ] Build the first reviewer-labeled retrieval set: 40–60 query → chunk pairs, graded 0/1/2, ≥ 10 per chapter, every published objective represented; 70/30 tune/holdout split.
- [ ] Produce the Week-2 go/no-go evidence: benchmark, coverage, contracts, and risks.

**Exit evidence:** benchmark report, sample RRF result, reviewer-confirmed coverage matrix, and signed-off contracts.

### Weeks 3–4 — Retrieval and sufficiency

**Week 3**
- [ ] Specify the retrieval schema: `document_chunks` with `unit_id`, `chunk_objectives`, `search_text`, embeddings, and indexes.
- [ ] Create the seed corpus with synthetic/open-licensed content; never commit textbook text.
- [ ] Benchmark embedding models on math queries, not prose only; keep `text-embedding-3-small` at 1536 only if it wins or ties on Recall@5.
- [ ] Implement query normalization: accents, case, LaTeX delimiters, math symbols, spoken math ("x au carré", "racine de"), French synonyms.
- [ ] Implement chunking with math-block atomicity and `unit_id` grouping.
- [ ] Add unit tests for normalization and scope filters.

**Week 4**
- [ ] Implement scoped hybrid retrieval: pgvector cosine + French full-text search.
- [ ] Implement RRF with `k = 60`, deterministic tie-break, deduplication, and top-k selection.
- [ ] Implement the deterministic reranker (§10.7) before the top-5–8 cut.
- [ ] Build the retrieval query from chapter/objective titles plus the last validated topic (§10.6); no model rewrite.
- [ ] Add neighbor expansion by `(revision_id, unit_id)` and the context token budget.
- [ ] Implement the sufficiency check using raw cosine, lexical coverage, objective match, and citable evidence.
- [ ] Measure Recall@5 and MRR on the reviewer-labeled set and confirm on the 30% holdout (Recall@5 ≥ 0.90, MRR ≥ 0.70).
- [ ] Add retrieval failure cases: missing evidence, wrong chapter, ambiguous question.

**Exit evidence:** retrieval module with unit tests, RRF output, sufficiency behavior, and a baseline retrieval report.

### Weeks 5–6 — Corpus, agent, and four gates

**Week 5**
- [ ] Build the ingestion pipeline with Mohamed: extract, normalize, chunk, map objectives, and publish.
- [ ] Implement the reviewer workflow: draft → provenance → normalize → map → review → approve → publish.
- [ ] Implement publication checks: academic-use note, reviewer sign-off, objective mapping, math notation, retrieval tests, embeddings, content hash.
- [ ] Implement withdrawal semantics: exclude future retrieval, preserve historical citations, flag dependent exercises.
- [ ] Publish chapter 1 with its own ≥ 10-pair retrieval set (Recall@5 ≥ 0.80) and run retrieval against it (D-41). Weeks 3–4 retrieval work runs on the Week-1 sample extract.
- [ ] Label 10–15 retrieval pairs while reviewing each chapter (§10.5); store them against the revision ID. Do not defer labeling to Week 13.
- [ ] Add ingestion and publication tests.

**Week 6**
- [ ] Build the PydanticAI tutor agent with bounded tools (citations are `{chunk_id, quote}` only; the server fills page, revision, hash, and claim spans, D-37): `search_maxi_chapter`, `read_chunk`, `read_neighboring_chunks`; at most 3 extra reads per turn, then re-check sufficiency (§10.3).
- [ ] Write `assistant/instructions.md` and versioned prompts.
- [ ] Implement Gate 1 (source validity), Gate 2 (scope validity), and Gate 3 (grounding). Gate 4 lands in Week 7.
- [ ] Implement French refusal templates and stable refusal codes.
- [ ] Add the wrong-answer set: at least 20 corrupted solutions, balanced across simplify, solve, interval, vector, and property.
- [ ] Run an initial evaluation and fix the highest-impact failures.

**Exit evidence:** published sample content, grounded draft, four gates, refusal templates, and initial evaluation report.

### Weeks 7–8 — Photos, rendering safety, and adversarial behavior

**Week 7**
- [ ] Define the photo symbol-confirmation contract with Imran: raw image → extracted symbols → confirmed expression.
- [ ] Implement Gate 4: the AST allowlist math parser over restricted SymPy syntax (no `sympify`/`parse_expr`), SymPy checks in a killable worker process with a 2 s limit, and the KaTeX rendering allowlist (D-36).
- [ ] Add math-gate checks for the confirmed expression.
- [ ] Test ambiguous symbols, unsupported notation, and unsafe input.
- [ ] Review the STT behavior with Mohamed; keep voice push-to-talk only.
- [ ] Add tests that raw OCR output never reaches the tutor.

**Week 8**
- [ ] Integrate the gates into the turn engine with Mohamed.
- [ ] Validate math and rendering payloads with Imran and Mohamed: KaTeX allowlist, length bounds, and no raw HTML, URLs, or scripts.
- [ ] Add adversarial tests: direct prompt injection, document injection, photo injection, forged IDs.
- [ ] Test cancellation and stale `turnId` behavior with Imran/Mohamed.
- [ ] Verify that a failed gate produces a refusal, not a partial answer.
- [ ] Record gate pass/fail telemetry for the evaluation.

**Exit evidence:** photo path enters controlled tutoring; math/rendering payloads are validated; adversarial tests pass.

### Weeks 9–10 — Practice, progress, and planning

**Week 9**
- [ ] Implement the exercise evaluator: MCQ, numeric tolerance, algebraic expression (guided multi-step is deferred, D-42).
- [ ] Use SymPy canonicalization for algebraic answers; support multiple solutions and `inconclusive`.
- [ ] Record hints individually and classify error categories.
- [ ] Pin attempts to `exercise_revision_id`.
- [ ] Review exercises and grading rules with the reviewer.
- [ ] Add tests for units, significant figures, equivalent forms, and unsupported forms.

**Week 10**
- [ ] Define progress indicators: objectives attempted, recent practice, repeated errors, hints, last-practiced date.
- [ ] Build revision suggestions with reasons; avoid mastery percentages.
- [ ] Define planner inputs and constraints: availability, target hours, prerequisites, weak areas, 45-minute blocks, breaks, week start, timezone.
- [ ] Implement deterministic tie-break rules and regeneration behavior.
- [ ] Add planner tests for no availability, overlaps, DST, and midnight.
- [ ] Hand planner contracts to Imran and Mohamed.

**Exit evidence:** evaluator covers all four types; progress and planner rules are deterministic and tested.

### Weeks 11–12 — Evaluation harness and freeze

**Week 11**
- [ ] Build the evaluation harness with development and held-out acceptance sets.
- [ ] Prepare 20 in-scope and 20 boundary tasks with fixed quotas: 8 out-of-scope, 6 missing-evidence, 6 prompt-injection (D-26); expand only if reviewer hours are confirmed.
- [ ] Include out-of-scope, missing-evidence, prompt-injection, and ambiguity cases.
- [ ] Run the reviewer grading workflow with a written rubric.
- [ ] Record application, model, prompt, corpus, and gate versions for every run.
- [ ] Report correctness, citation validity, unsupported releases, false refusals, math-gate catch rate, retrieval Recall@5/MRR, latency, and cost.

**Week 12**
- [ ] **Feature freeze for prompts, corpus, gates, and evaluation.** No changes without a regression run.
- [ ] Review three-chapter coverage with the reviewer.
- [ ] Freeze the evaluation dataset and rubric version.
- [ ] Secure written confirmation of extra reviewer hours for Week 13 (8–10 hours: 20+20 grading, retrieval labels, wrong-answer set).
- [ ] Produce the freeze note: known failures, accepted risks, and release blockers.
- [ ] Hand the frozen contracts to Imran and Mohamed.

**Exit evidence:** evaluation harness, frozen corpus/prompts/gates, and a release-blocker list.

### Weeks 13–14 — Full evaluation and release candidate

**Week 13**
- [ ] Run the full evaluation against the release candidate: 20 in-scope, 20 boundary (per category), and the retrieval set.
- [ ] Triage failures into retrieval, scope, grounding, math, rendering, provider, or UI.
- [ ] Fix teaching/retrieval defects; rerun affected cases.
- [ ] Record false refusals and unsupported releases separately.
- [ ] Provide the evaluation report to the team.

**Week 14**
- [ ] Run regression on the release candidate.
- [ ] Re-run the wrong-answer set and adversarial prompt-injection cases.
- [ ] Verify release gates: ≥90% in-scope correct/scoped, 0 unsupported releases, 100% citation validity.
- [ ] Verify retrieval metrics and cost per turn.
- [ ] Fix release blockers only.

**Exit evidence:** release-candidate evaluation report and no known teaching/validation release blocker.

### Weeks 15–16 — Report, rehearsal, submission

**Week 15**
- [ ] Write the teaching/validation/evaluation report sections: corpus, retrieval, four gates, math verification, metrics, limitations — including why this release covers 3 of the 15 chapters and what each added chapter requires (§2.7).
- [ ] Prepare the demo evidence: accepted answer, citation, refusal, insufficient evidence, math refusal, practice evaluation.
- [ ] Rehearse the live demo with Imran and Mohamed.
- [ ] Prepare the fallback evidence for provider failure or credit exhaustion.
- [ ] Update the known-issues list.

**Week 16**
- [ ] Final demo.
- [ ] Submit the evaluation evidence and report sections.
- [ ] Confirm the frozen corpus and prompt versions are recorded.
- [ ] Hand over the evaluation harness and known limitations.

**Exit evidence:** final evaluation report, report sections, and demo evidence.

## 5. Reviewer workflow

Every week:

- [ ] Send the reviewer a focused packet, not the whole corpus.
- [ ] Prioritize corpus review first, evaluation second.
- [ ] Record reviewer decisions and unresolved notation issues.
- [ ] Never publish unreviewed content.
- [ ] Keep the reviewer at 2–3 hours/week; if capacity is tight, reduce evaluation size, not corpus quality.

## 6. Tests you own

- Unit: normalization, RRF, sufficiency, gates, math checks, evaluator, planner, chunker.
- Integration: ingestion, publication, retrieval, turn engine, SSE, practice, planning.
- Security: prompt injection, document injection, photo injection, forged IDs, scope bypass.
- Evaluation: 20+20 cases, wrong-answer set, retrieval set, reviewer rubric.
- Contract: draft output, citations, refusals, SSE final message.

## 7. Definition of done

- Every claim has a valid citation or the turn is refused/clarified.
- Gate 1–4 are deterministic where required and fail closed.
- No raw model tokens or unvalidated text are released.
- No full corpus chunk is exposed to the client.
- SymPy checks use explicit assumptions; unverifiable claims refuse.
- Refusal templates are French, stable-coded, and reviewer-approved.
- Prompts and gate versions are recorded per turn.
- Evaluation is reproducible and meets release gates.
- `ruff check`, `ruff format --check`, `mypy app`, and `pytest` pass.

## 8. Final deliverables

- Retrieval, agent, prompts, four gates, evaluator, and planner code.
- Reviewer-approved coverage matrix and corpus mapping.
- Evaluation datasets, harness, rubric, and results.
- Teaching/validation/evaluation sections of the academic report.
- Demo evidence and known limitations.

## 9. Risks you own

- **Reviewer capacity:** prepare small packets, corpus first, 20+20 scope.
- **Model quality:** benchmark early, switch models if needed, narrow scope.
- **Math errors:** SymPy, rubric, wrong-answer set, reviewer sampling.
- **Prompt injection:** four gates, delimited evidence, allowlisted tools, adversarial tests.
- **Unsupported release:** fail closed; never trade truthfulness for demo smoothness.

## 10. First 7 days checklist

- [ ] Run the backend checks and tests.
- [ ] Read plan §8, §9, §10, and §16.
- [ ] Benchmark 20 French math prompts.
- [ ] Extract one chapter sample and run the RRF spike.
- [ ] Draft the evaluation rubric.
- [ ] Book the first reviewer session.
- [ ] Draft the output/citation/refusal contract for Imran and Mohamed.
- [ ] Post the first Friday evidence note.
