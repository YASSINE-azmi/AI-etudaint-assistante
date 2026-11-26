"""What the model must return for one teaching turn (plan §8.2, D-36, D-37).

This is untrusted input: the four gates validate it before anything reaches a student.
The model cites a chunk and a verbatim quote only; the server fills page, section,
revision and hash from the chunk (turn_contract.Citation is the server-side shape).
"""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

DRAFT_CONTRACT_VERSION = "draft-output-v0.1"


class _Draft(BaseModel):
    # Unknown fields fail: this rejects e.g. parallel cited_chunk_ids / quoted_excerpts lists.
    model_config = ConfigDict(extra="forbid", frozen=True)


class MathClaim(_Draft):
    expression: str  # restricted SymPy syntax, e.g. "(x + 1)**2 - (x**2 + 2*x + 1)"
    variables: dict[str, Literal["real", "integer", "natural", "vector2"]] = {}
    assumptions: list[str] = []  # same restricted syntax, e.g. "x > 0"
    expected_form: str | None = None
    check: Literal["simplify", "solve", "interval", "vector", "property"]


class CitationDraft(_Draft):
    chunk_id: UUID
    quote: str = Field(min_length=1)  # verbatim from the chunk


class ClaimDraft(_Draft):
    claim_id: str
    objective_id: str
    text_fr: str = Field(min_length=1)  # must appear verbatim inside display_text_fr
    citations: list[CitationDraft] = []
    math: MathClaim | None = None


class TeachingStepDraft(_Draft):
    step_id: str
    display_text_fr: str = Field(min_length=1)
    claims: list[ClaimDraft]
    next_actions: list[str] = []


class AgentDraftOutput(_Draft):
    steps: list[TeachingStepDraft] = Field(min_length=1)
    suggested_status: str  # diagnostic only; the server never uses it to release
