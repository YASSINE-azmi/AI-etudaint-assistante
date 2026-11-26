import pytest

from app.assistant.turn_contract import (
    GateResult,
    MessageFinal,
    Usage,
    failure_event,
    refusal_events,
)
from app.assistant.turn_fixtures import (
    FIXTURES,
    accepted_turn,
    out_of_scope_turn,
    provider_failure_turn,
)
from app.validation.refusal import REFUSALS, RefusalCode

_USAGE = Usage(input_tokens=0, output_tokens=0, cost_usd=0.0)


def _names(events: list) -> list[str]:
    return [e.name for e in events]


def test_accepted_turn_follows_the_plan_sequence() -> None:
    assert _names(accepted_turn()) == [
        "turn.started",
        "retrieval.completed",
        "validation.started",
        "validation.completed",
        "message.final",
        "turn.completed",
    ]


@pytest.mark.parametrize("fixture", FIXTURES.values())
def test_text_appears_only_in_message_final(fixture) -> None:
    for event in fixture():
        has_text = "text" in event.payload.wire()
        assert has_text == (event.name == "message.final")


@pytest.mark.parametrize("fixture", FIXTURES.values())
def test_every_turn_ends_with_exactly_one_terminal_event(fixture) -> None:
    names = _names(fixture())
    terminals = [n for n in names if n in ("turn.completed", "turn.failed")]
    assert terminals == [names[-1]]
    assert names[0] == "turn.started"


def test_refusal_is_a_completed_turn_with_the_template_text() -> None:
    events = out_of_scope_turn()
    final = next(e.payload for e in events if e.name == "message.final")
    assert isinstance(final, MessageFinal)
    assert final.text == REFUSALS[RefusalCode.OUT_OF_SCOPE_LEVEL].message_fr
    assert final.citations == []
    assert final.wire()["refusalCode"] == "OUT_OF_SCOPE_LEVEL"
    assert _names(events)[-1] == "turn.completed"
    assert "retrieval.completed" not in _names(events)


def test_failure_carries_no_answer_text_and_is_terminal() -> None:
    events = provider_failure_turn()
    assert "message.final" not in _names(events)
    assert events[-1].payload.wire() == {
        "code": "PROVIDER_UNAVAILABLE",
        "educationalStatus": "provider_unavailable",
        "messageFr": REFUSALS[RefusalCode.PROVIDER_UNAVAILABLE].message_fr,
        "retryable": True,
    }


def test_payloads_serialize_in_camel_case() -> None:
    started = accepted_turn()[0].payload.wire()
    assert started == {
        "turnId": "00000000-0000-4000-8000-000000000001",
        "sessionId": "00000000-0000-4000-8000-0000000000aa",
    }
    usage = accepted_turn()[-1].payload.wire()["usage"]
    assert usage == {"inputTokens": 1200, "outputTokens": 180, "costUsd": 0.0006}


@pytest.mark.parametrize("code", [c for c, t in REFUSALS.items() if t.delivery != "refusal"])
def test_non_refusal_codes_cannot_be_streamed_as_refusals(code: RefusalCode) -> None:
    with pytest.raises(ValueError):
        refusal_events("t", "s", code, [GateResult(gate="scope", passed=False)], _USAGE)


@pytest.mark.parametrize("code", [c for c, t in REFUSALS.items() if t.delivery != "failure"])
def test_only_failure_codes_produce_turn_failed(code: RefusalCode) -> None:
    with pytest.raises(ValueError):
        failure_event(code)
