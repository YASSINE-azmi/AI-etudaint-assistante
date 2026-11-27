# Week-2 go/no-go evidence

- **Date:** 2026-11-26 (end of Week 2)
- **Prepared by:** Yassine (teaching, retrieval, validation, evaluation)
- **Rule:** plan §17.4. Proceed only if every criterion holds; otherwise reduce scope and record the decision.
- **Recommendation:** **Conditional GO.** The technical criteria and the reviewer hours are met. Three sign-offs are still open; each one has an owner and a deadline in section 3. If any is still open at its deadline, reduce scope.

## 1. Criteria

| # | Criterion (§17.4) | Status | Evidence |
| --- | --- | --- | --- |
| 1 | The three chapters and objectives are confirmed | ✅ Met | [coverage-v0.1](curriculum/coverage-matrix.md): TCS chapters 1–3, 22 objectives, pages 15–28 / 29–50 / 51–72, approved by the reviewer (D-46) |
| 2 | The academic-use note is recorded | 🟨 Partly met | Input recorded in [academic-use-input.md](academic-use-input.md): 3 chapters, academic use only, excerpts to DeepSeek. The team lead's note and the supervisor's acknowledgment are missing |
| 3 | The reviewer is active and has confirmed hours in writing (§22.1) | ✅ Met | The reviewer is active (D-45) and has signed the rubric, cases, coverage and refusal texts. Hours confirmed in writing on 2026-11-26 (section 2) |
| 4 | The model benchmark is acceptable | ✅ Met | [Benchmark.md](Benchmark.md): `deepseek-flash` 15/15 correct, JSON parses, worst latency 5.9 s, $0.0045 for 15 prompts. Gaps: 5 of 20 prompts and vision not yet run (section 3) |
| 5 | The SSE/turn contract is agreed | 🟨 Partly met | Content side done ([sse-turn-contract.md](contracts/sse-turn-contract.md)); teaching shapes frozen and accepted ([teaching-contracts-v0.1](contracts/teaching-contracts.md)). Mohamed still has 3 open questions and the fixture endpoint |
| 6 | The team confirms the 16-week scope | ⬜ Open | The scope is unchanged apart from D-46 (chapters) and D-47 (task rebalance). Imran and Mohamed have not confirmed yet |

Supporting evidence from Week 2:

- **Retrieval:** 56 graded queries across all 22 objectives. RRF Recall@5 is **0.89** overall and **0.81** on the holdout; MRR is 0.80 / 0.88 / 0.64 per chapter ([spike](spikes/retrieval-rrf-ch01.md)). The Week-4 target is Recall@5 ≥ 0.90 and MRR ≥ 0.70 on the holdout, so both still need work (the reranker, §10.7).
- **Corpus quality:** all 2,352 math spans render in KaTeX. One OCR error was found by reading and fixed in the local source.
- **Evaluation:** [rubric-v0.1](evaluation/rubric.md) approved. [cases-v0.2](evaluation/cases.json) (7 / 7 / 6 over the three chapters) is a draft waiting for reviewer question 8.

## 2. Reviewer hours (written confirmation, §22.1)

The plan asks for these hours to be confirmed in writing at this gate.

| Work | Plan budget | Done in Weeks 1–2 | Still to do |
| --- | --- | --- | --- |
| Corpus review (Weeks 2–12) | ~25 h | Text of chapters 1–3 checked against the book; coverage matrix | Mapping chunks to objectives, publication sign-off per chapter |
| 20+20 grading (Week 13) | 4–5 h | Rubric and 40 cases | Grading the release-candidate run |
| Retrieval labels | 3–5 h | 301 pairs graded (delegated to Claude) | Spot-check about 30 pairs; relabel against the published revision |
| Wrong-answer set | 1–2 h | — | Review 20 corrupted solutions |
| Exercises, hints, answer schemas, out-of-scope lexicon, spoken-math map (D-42) | 8–12 h | Refusal templates approved | Everything else |
| **Total** | **~41–49 h**, about 3 h/week | | Week 13 alone needs 8–10 h |

| Reviewer | Confirms the hours above | Date |
| --- | --- | --- |
| Yassine (D-45) | **Confirmed** | 2026-11-26 |

## 3. Open conditions

| # | Condition | Owner | Deadline | If missed |
| --- | --- | --- | --- | --- |
| 1 | Supervisor acknowledges the academic-use note, and waives the client-brief 5-student pilot in writing (§22.1) | Team lead | Before chapter 1 is published (Week 5) | Nothing is uploaded to Supabase or sent to DeepSeek |
| 2 | Mohamed answers the 3 open SSE questions and streams the fixture endpoint | Mohamed | Week 3, before Week 6 at the latest | Week 6 integration slips |
| 3 | Imran and Mohamed confirm the 16-week scope and the D-47 rebalance | Imran, Mohamed | Week 3 | Revert D-47 and keep the original split |
| 4 | Run the 5 missing benchmark prompts and one vision (photo) test | Yassine | Week 7 (photos) | Keep `deepseek-flash` for text; decide the vision model separately |

## 4. Risks (changes since the plan's register, §17.5)

| Risk | Status | Mitigation | Owner |
| --- | --- | --- | --- |
| Book content lives in images (the PGCD successive-division steps, the prime table up to 100) | **New** | The reviewer transcribes them before publication, or the tutor refuses those topics | Yassine |
| STT provider undecided: DeepSeek has no speech model | **New** | Choose and benchmark a provider in Week 7 with the STT adapter (D-47) | Yassine |
| DeepSeek returns `\( \)` / `\[ \]` delimiters, not `$` | **New** | Gate 4 and KaTeX accept them, or the prompt asks for `$` | Yassine |
| `PROMPT_VERSION` in settings is `v0.1.0`, but the benchmark used `teach-v0.1` | **New** | Align them when the prompts are written (Week 6) | Yassine |
| A DeepSeek API key was pasted in a chat | **New** | Rotate the key and keep it only in `backend/.env` | Yassine |
| Reviewer is also the builder (D-45) | Known | The supervisor checks a sample of the grades | Yassine |
| Chapter-3 ranking is weak (MRR 0.64) | Known | Content-type prior in the §10.7 reranker | Yassine |
| Ramadan 2027 overlaps Weeks 12–16 | Known | Book the Week-13 reviewer hours and the demo date by mid-December | Team lead |

## 5. Decision

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Prepared by | Yassine | Conditional GO | 2026-11-26 |
| Team lead | | | |
| Supervisor | | | |
