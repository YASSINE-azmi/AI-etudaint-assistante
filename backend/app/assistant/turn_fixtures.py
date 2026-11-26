"""Hard-coded turns for the Week-1 SSE prototype: no model, no retrieval, no database.

The fixture endpoint streams these so the frontend can be built against the real event
shapes. Delete this module once the turn engine (plan §11) produces real events.
The text and citation are synthetic, not MAXI Maths content.
"""

from app.assistant.turn_contract import (
    Citation,
    GateResult,
    RetrievalCompleted,
    TurnEvent,
    Usage,
    accepted_events,
    failure_event,
    refusal_events,
)
from app.validation.refusal import RefusalCode

TURN_ID = "00000000-0000-4000-8000-000000000001"
SESSION_ID = "00000000-0000-4000-8000-0000000000aa"
CHUNK_ID = "00000000-0000-4000-8000-0000000000c1"
REVISION_ID = "00000000-0000-4000-8000-0000000000b1"

_NO_USAGE = Usage(input_tokens=0, output_tokens=0, cost_usd=0.0)


def accepted_turn() -> list[TurnEvent]:
    return accepted_events(
        turn_id=TURN_ID,
        session_id=SESSION_ID,
        retrieval=RetrievalCompleted(chunk_ids=[CHUNK_ID], scores=[0.82]),
        text=(
            "Un nombre rationnel est un nombre qui peut s'écrire sous la forme "
            "\\(\\frac{a}{b}\\) avec \\(a \\in \\mathbb{Z}\\) et \\(b \\in \\mathbb{Z}^*\\)."
        ),
        citations=[
            Citation(
                claim_id="c1",
                chunk_id=CHUNK_ID,
                revision_id=REVISION_ID,
                page=12,
                section="Définition (fixture)",
                quote="exemple synthétique",
            )
        ],
        usage=Usage(input_tokens=1200, output_tokens=180, cost_usd=0.0006),
    )


def out_of_scope_turn() -> list[TurnEvent]:
    """Refused at the scope gate, before retrieval."""
    return refusal_events(
        turn_id=TURN_ID,
        session_id=SESSION_ID,
        code=RefusalCode.OUT_OF_SCOPE_LEVEL,
        gates=[GateResult(gate="scope", passed=False)],
        usage=_NO_USAGE,
    )


def provider_failure_turn() -> list[TurnEvent]:
    events = accepted_turn()[:2]  # started + retrieval, then the provider call fails
    return [*events, failure_event(RefusalCode.PROVIDER_UNAVAILABLE)]


FIXTURES = {
    "accepted": accepted_turn,
    "out_of_scope": out_of_scope_turn,
    "provider_failure": provider_failure_turn,
}
