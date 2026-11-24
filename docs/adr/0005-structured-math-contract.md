# ADR 0005 — Structured math contract + SymPy

- **Status:** Accepted
- **Date:** 24 November 2026

## Context

`ClaimDraft` had only `math_expression`, but Gate 4 required assumptions and
deterministic checks. A bare string cannot carry variables, domains, or the
expected form.

## Decision

Add a `MathClaim` structure: `expression_latex`, `variables`, `assumptions`,
`expected_form`, and `check` (`simplify`/`solve`/`interval`/`vector`/`property`).
SymPy parses from this structure (never free text) in a sandbox with a short
timeout and a banned-function allowlist. Unverifiable claims return
`MATH_UNVERIFIABLE`.

## Consequences

- Deterministic math checks are meaningful, not best-effort string parsing.
- The model must emit structured math; prompt/contract changes are required and
  versioned.
- Risk of false refusal is controlled by the clarification path and the
  `MATH_UNVERIFIABLE` behavior.
