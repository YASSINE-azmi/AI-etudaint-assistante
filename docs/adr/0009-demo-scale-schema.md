# ADR 0009 — Demo-scale schema and chapter-by-chapter publication

- **Status:** Accepted
- **Date:** 26 November 2026

## Context

The plan review (implementation plan §23) found that `v0.1.0` carried 28 tables
for a single-instance demo built by three developers in 16 weeks, with reviewer
time already fully allocated. Four tables existed only for multi-instance
production concerns. Separately, publication required the full retrieval label
set (Weeks 5–8) while Week 6 already needed published content.

## Decision

- **D-40.** Drop four tables from `v0.1.0`:
  - `rate_limit_counters` → process-local limits (one API process).
  - `jobs` → a periodic task in the API lifespan on an `app_worker` connection.
  - `budget_reservations` → `session_turns.reserved_usd` plus the locked
    `budget_ledger` row, which already makes the cap check atomic.
  - `hint_events` → `exercise_attempts.hints_requested`.
- **D-41.** Chapters publish one at a time. Chapter 1 publishes by Week 5 with
  its own ≥ 10-pair retrieval set (Recall@5 ≥ 0.80). The overall 40–60-pair
  gate (Recall@5 ≥ 0.90) applies from Week 8.
- **D-42.** Guided multi-step exercises move to the reduction ladder. The
  reviewer confirms in writing, at the Week-2 go/no-go, the hours for the
  exercise bank, hints, refusal templates, lexicon, and spoken-math map.

## Consequences

- Fewer migrations, policies, and tests in Weeks 3–4; no change to the release
  gates, the four gates, or authorization.
- Each dropped table is the documented upgrade if the API ever runs more than
  one instance.
- Week-6 teaching runs on real published content instead of a sample.
