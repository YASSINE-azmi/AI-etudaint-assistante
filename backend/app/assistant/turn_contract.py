"""Content of the turn stream (plan §7.2 to §7.4, docs/contracts/sse-turn-contract.md).

This module decides *which* events a turn emits and *what* they carry. It does not
know about SSE or the AI SDK wire format: the transport (`classroom/streaming.py`)
encodes each `TurnEvent` into stream parts.

Final-only text: answer or refusal text appears in exactly one event, `message.final`,
after validation. No event carries raw model output.
"""

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.validation.refusal import REFUSALS, EducationalStatus, RefusalCode

GateName = Literal["source", "scope", "grounding", "math_render"]
GATES: tuple[GateName, ...] = ("source", "scope", "grounding", "math_render")

EventName = Literal[
    "turn.started",
    "retrieval.completed",
    "validation.started",
    "validation.completed",
    "message.final",
    "turn.completed",
    "turn.failed",
]


class Payload(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, frozen=True)

    def wire(self) -> dict[str, object]:
        return self.model_dump(by_alias=True, mode="json")


class TurnStarted(Payload):
    turn_id: str
    session_id: str


class RetrievalCompleted(Payload):
    chunk_ids: list[str]
    scores: list[float]


class ValidationStarted(Payload):
    gates: list[GateName]


class GateResult(Payload):
    gate: GateName
    passed: bool


class ValidationCompleted(Payload):
    gates: list[GateResult]
    educational_status: EducationalStatus


class Citation(Payload):
    claim_id: str
    chunk_id: str
    revision_id: str
    page: int
    section: str
    quote: str


class MessageFinal(Payload):
    text: str
    citations: list[Citation]
    refusal_code: RefusalCode | None = None
    next_actions: list[str] = []


class Usage(Payload):
    input_tokens: int
    output_tokens: int
    cost_usd: float


class TurnCompleted(Payload):
    turn_id: str
    usage: Usage


class TurnFailed(Payload):
    code: RefusalCode
    educational_status: EducationalStatus
    message_fr: str
    retryable: bool


@dataclass(frozen=True)
class TurnEvent:
    name: EventName
    payload: Payload


def accepted_events(
    turn_id: str,
    session_id: str,
    retrieval: RetrievalCompleted,
    text: str,
    citations: list[Citation],
    usage: Usage,
) -> list[TurnEvent]:
    """A validated answer: every gate passed, text released once."""
    return [
        TurnEvent("turn.started", TurnStarted(turn_id=turn_id, session_id=session_id)),
        TurnEvent("retrieval.completed", retrieval),
        TurnEvent("validation.started", ValidationStarted(gates=list(GATES))),
        TurnEvent(
            "validation.completed",
            ValidationCompleted(
                gates=[GateResult(gate=g, passed=True) for g in GATES],
                educational_status=EducationalStatus.ACCEPTED,
            ),
        ),
        TurnEvent("message.final", MessageFinal(text=text, citations=citations)),
        TurnEvent("turn.completed", TurnCompleted(turn_id=turn_id, usage=usage)),
    ]


def refusal_events(
    turn_id: str,
    session_id: str,
    code: RefusalCode,
    gates: list[GateResult],
    usage: Usage,
    retrieval: RetrievalCompleted | None = None,
) -> list[TurnEvent]:
    """A refusal is a completed turn: it ends with the French template, never model text.

    `retrieval` is None when the turn is refused before retrieval (e.g. out of scope).
    """
    template = REFUSALS[code]
    if template.delivery != "refusal" or template.educational_status is None:
        raise ValueError(f"{code} is not a refusal; use failure_events or an HTTP error")
    events = [TurnEvent("turn.started", TurnStarted(turn_id=turn_id, session_id=session_id))]
    if retrieval is not None:
        events.append(TurnEvent("retrieval.completed", retrieval))
    events += [
        TurnEvent("validation.started", ValidationStarted(gates=list(GATES))),
        TurnEvent(
            "validation.completed",
            ValidationCompleted(gates=gates, educational_status=template.educational_status),
        ),
        TurnEvent(
            "message.final",
            MessageFinal(text=template.message_fr, citations=[], refusal_code=code),
        ),
        TurnEvent("turn.completed", TurnCompleted(turn_id=turn_id, usage=usage)),
    ]
    return events


def failure_event(code: RefusalCode) -> TurnEvent:
    """The single terminal event of a failed turn; it replaces message.final, so no text."""
    template = REFUSALS[code]
    if template.delivery != "failure" or template.educational_status is None:
        raise ValueError(f"{code} is not a streamed failure")
    return TurnEvent(
        "turn.failed",
        TurnFailed(
            code=code,
            educational_status=template.educational_status,
            message_fr=template.message_fr,
            retryable=template.retryable,
        ),
    )
