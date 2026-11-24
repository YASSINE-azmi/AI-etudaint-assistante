# ADR 0007 — Hosted private corpus

- **Status:** Accepted
- **Date:** 24 November 2026

## Context

The plan called the corpus "local-only" but also stored `chunk_text` in Supabase.
Those statements conflict.

## Decision

Reviewed `document_chunks` live in a private Supabase Postgres project; raw
PDFs/scans stay local and gitignored. Direct `anon`/`authenticated` reads of
`chunk_text` and `exercises.answer_schema` are revoked; only FastAPI returns
short excerpts (≤ 25 words / ≤ 300 chars). The academic-use note and supervisor
acknowledgment precede publication.

## Consequences

- The demo is private-hosted, not local-only; wording is corrected throughout.
- Copyright exposure is limited to short quotes surfaced by FastAPI.
- A quote-length check also applies to generated `display_text_fr`.
