import pytest
from pydantic import ValidationError

from app.validation.draft import AgentDraftOutput

CHUNK = "3f2b8c1e-0000-4000-8000-000000000001"


def _draft(**claim_changes: object) -> dict:
    claim = {
        "claim_id": "c1",
        "objective_id": "tcs_ch01_o07",
        "text_fr": "PGCD(12 ; 15) = 3",
        "citations": [{"chunk_id": CHUNK, "quote": "le plus grand commun diviseur"}],
        "math": {"expression": "gcd(12, 15) - 3", "check": "simplify"},
        **claim_changes,
    }
    step = {"step_id": "s1", "display_text_fr": "On trouve PGCD(12 ; 15) = 3.", "claims": [claim]}
    return {"steps": [step], "suggested_status": "accepted"}


def test_a_well_formed_draft_parses() -> None:
    draft = AgentDraftOutput.model_validate(_draft())
    assert str(draft.steps[0].claims[0].citations[0].chunk_id) == CHUNK


@pytest.mark.parametrize(
    "change",
    [
        {"cited_chunk_ids": [CHUNK]},  # parallel lists are prohibited (plan §8.2)
        {"citations": [{"chunk_id": "tcs_ch01-c011", "quote": "x"}]},  # not a UUID
        {"citations": [{"chunk_id": CHUNK, "quote": ""}]},
        {"citations": [{"chunk_id": CHUNK, "quote": "x", "page": 18}]},  # server fills pages
        {"math": {"expression": "x", "check": "guess"}},
        {"math": {"expression": "x", "check": "solve", "variables": {"x": "complex"}}},
    ],
)
def test_malformed_drafts_are_rejected(change: dict) -> None:
    with pytest.raises(ValidationError):
        AgentDraftOutput.model_validate(_draft(**change))


def test_a_draft_needs_at_least_one_step() -> None:
    with pytest.raises(ValidationError):
        AgentDraftOutput.model_validate({"steps": [], "suggested_status": "accepted"})
