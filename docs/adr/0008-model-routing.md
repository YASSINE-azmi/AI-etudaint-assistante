# ADR 0008 — Model routing is static by role

- **Status:** Accepted
- **Date:** 26 November 2026

## Context

The plan needs several distinct model capabilities: a chat model for teaching,
an embedding model for retrieval, a vision model for exercise photos, speech
a speech-to-text model for push-to-talk, and an optional judge model for entailment/rubric
checks. Each is configured separately in `backend/app/config.py`:

| Role | Setting |
| --- | --- |
| Teaching answer | `LLM_MODEL_NAME` |
| Query and chunk embeddings | `EMBEDDING_MODEL_NAME` |
| Photo / OCR extraction | `VISION_MODEL_NAME` |
| Speech-to-text | `STT_MODEL_NAME` |
| Entailment judge (optional) | `JUDGE_MODEL_NAME` |

This raised the question of whether the architecture has "AI model routing",
on the assumption that retrieval-augmented generation requires it. It does not.
RAG is retrieval plus grounded generation; selecting among models is a separate
concern. Leaving the distinction undocumented invites two failure modes: a
reviewer concluding a required component is missing, or a contributor adding
runtime model selection that silently invalidates the evaluation.

## Decision

1. Model routing in `v0.1.0` is **static, role-based, and resolved from settings
   at startup**. Exactly one model per role.
2. There is **no dynamic routing**: no per-request selection by difficulty,
   cost, latency, or student tier; no A/B or canary split; no automatic
   multi-provider fallback for content generation.
3. Retrieval routing is orthogonal and stays as specified in §10. The scoped
   filters (`status = 'published'`, `chapter_id`, approved objectives) select corpus
   evidence, never a model.
4. Provider adapters in `app/providers/` own provider-specific details. Callers
   request a role, not a model identifier string.
5. The model actually used is recorded per turn (`session_turns.model_name`) and
   per usage row (`usage_events.model_name`), alongside `prompt_version`, so a
   model change is auditable and attributable.
6. Changing a model is a configuration change, not a code path: update the
   setting, benchmark it, rerun the 20+20 regression evaluation, and record the
   result in the decision log.

## Consequences

- The 20+20 evaluation stays reproducible: one model plus one prompt version per
  run, so a score change is attributable to a specific change.
- There is no second-attempt latency budget inside `TURN_TIMEOUT_SECONDS = 20`.
- A provider outage fails the turn with a stable error; the demo-day fallback is
  the pre-validated cached answer set (D-16, D-19), not a silent model switch.
- Cost stays predictable against `TRIAL_CREDIT_BUDGET_USD`.
- Adding a second model later stays contained in `providers/` and `config.py`;
  it does not reach the Four-Gate pipeline.

## Deferred and revisit triggers

Dynamic routing is deferred beyond `v0.1.0`. Reopen this ADR when any of the
following is observed and measured:

- provider outages or rate limits cause repeated turn failures;
- a cheap/strong split is justified by measured cost or latency, with evaluation
  evidence rather than intuition;
- the optional judge role becomes required for Gate 3 or Gate 4;
- in-scope accuracy saturates (≥ 95%) so model quality, not corpus coverage, is
  the limiting factor.

Explicit non-goals: per-student model tiers, runtime prompt/model experimentation
in production, and provider failover that changes the answer mid-turn.
