# ADR 0006 — Evaluation size 20+20

- **Status:** Accepted
- **Date:** 24 November 2026

## Context

The plan said 60+60, but the mathematics reviewer has 2–3 hours/week, which
cannot grade 120 tasks in Week 13.

## Decision

Use 20 in-scope + 20 boundary tasks for `v0.1.0` acceptance. Expand only if the
reviewer confirms extra hours. 20+20 is directional evidence; the report states
the sample size and confidence limits.

## Consequences

- Reviewer workload fits the confirmed availability (~4–5 hours).
- Release gates are expressed against 20 tasks (≥ 90% = 18/20; 0 unsupported
  releases; math-gate catch rate ≥ 90%; false refusals ≤ 10%).
- No population-level accuracy claim is made.
