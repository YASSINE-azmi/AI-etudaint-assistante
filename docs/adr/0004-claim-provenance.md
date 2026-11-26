# ADR 0004 — Claim-level provenance (`teaching_claims`)

- **Status:** Accepted
- **Date:** 24 November 2026 (revised 26 November 2026, D-37)

## Context

`turn_citations.claim_id` pointed at a claim with no table or stored text, so
provenance could not be reconstructed after a turn.

## Decision

Add a first-class `teaching_claims` table (claim text, objective, span, and an
optional `MathClaim`). `turn_citations.teaching_claim_id` references it, and
every citation belongs to a claim on the same turn. `ClaimDraft` carries
`objective_id`, `text_fr`, and citations of `{chunk_id, quote}`; connective text
outside spans is allowed without a citation.

Revision (D-37): the model does not produce spans, pages, revisions, or hashes.
The server computes `claim_span_start/end` by locating `text_fr` verbatim in
the step's `display_text_fr`, and copies page, section, revision, and hash from
the cited chunk. LLMs are unreliable at character offsets and metadata, so
asking for them only produced false Gate-1 refusals.

## Consequences

- Gate 2 objective mapping and Gate 3 grounding are auditable per claim.
- Refusals and final payloads persist on `session_turns`, so history reloads
  correctly.
- Slightly more schema and persistence work; accepted for the demo.
