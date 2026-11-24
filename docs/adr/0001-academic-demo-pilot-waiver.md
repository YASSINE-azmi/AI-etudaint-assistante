# ADR 0001 — Academic demo only; pilot deferred

- **Status:** Accepted
- **Date:** 24 November 2026

## Context

`docs/client-brief.md:78` requires a consented 5-student pilot. The plan targets
a synthetic academic demo and excludes real students, consent, and CNDP filing.

## Decision

`v0.1.0` is an academic demo with synthetic profiles only. The pilot criterion is
waived in writing by the academic supervisor before Week 2. The waiver is recorded
in `audit_events` and referenced in the final report.

## Consequences

- No consent, CNDP filing, or real-student data in `v0.1.0`.
- The client brief and the plan must not diverge silently; this ADR and the
  supervisor waiver are the recorded reconciliation.
- If the pilot becomes mandatory later, it is a separate scope decision.
