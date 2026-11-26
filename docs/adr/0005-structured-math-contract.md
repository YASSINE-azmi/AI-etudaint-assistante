# ADR 0005 — Structured math contract + SymPy

- **Status:** Accepted
- **Date:** 24 November 2026 (revised 26 November 2026, D-36)

## Context

`ClaimDraft` had only `math_expression`, but Gate 4 required assumptions and
deterministic checks. A bare string cannot carry variables, domains, or the
expected form.

## Decision

Add a `MathClaim` structure: `expression`, `variables`, `assumptions`,
`expected_form`, and `check` (`simplify`/`solve`/`interval`/`vector`/`property`).
Unverifiable claims return `MATH_UNVERIFIABLE`.

Revision (D-36):

- `expression` and `assumptions` use a restricted SymPy syntax
  (`(x + 1)**2`, `sqrt(2)`, `Interval(0, 1)`), not LaTeX. SymPy's
  `parse_latex` needs an extra parser package (`antlr4-python3-runtime` or
  `lark`), and its LaTeX coverage is partial.
- `validation/math_parser.py` parses with `ast.parse(..., mode="eval")` and
  accepts only numeric constants, declared variables, arithmetic and comparison
  operators, and allowlisted SymPy constructors, building the SymPy object node
  by node. `sympify` and `parse_expr` are never called on model output because
  both use `eval`.
- Each check runs in a worker process with a hard 2 s kill. Threads cannot be
  stopped and `signal.alarm` does not exist on Windows.
- The displayed LaTeX is generated from the parsed expression with
  `sympy.latex`, so the rendered, checked, and spoken math are one object.

## Consequences

- Deterministic math checks are meaningful, not best-effort string parsing.
- The model must emit structured math; prompt/contract changes are required and
  versioned.
- Risk of false refusal is controlled by the clarification path and the
  `MATH_UNVERIFIABLE` behavior.
