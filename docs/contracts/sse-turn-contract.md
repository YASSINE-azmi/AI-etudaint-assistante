# SSE turn contract (Week-1 prototype)

- **Status:** Content side done (Yassine). **Transport side not started (Mohamed).** Needs Mohamed's sign-off on the open questions below.
- **Plan:** §7.2 (SSE), §7.3 (payload), §7.4 (status mapping), §8.7 (refusal codes), Appendix D (wire example).
- **Tasks:** [member-b.md](../team/member-b.md) Week 1 "Prototype the SSE turn contract" · [member-c.md](../team/member-c.md) Week 1 "Prototype the turn SSE transport".

## Who owns what

| Part | Owner | Status | Where |
| --- | --- | --- | --- |
| Which events a turn emits, in what order | Yassine | ✅ Done | `backend/app/assistant/turn_contract.py` |
| Event payload shapes (camelCase on the wire) | Yassine | ✅ Done | `backend/app/assistant/turn_contract.py` |
| Refusal codes, French templates, retryable, delivery | Yassine | ✅ Draft (French wording needs reviewer approval) | `backend/app/validation/refusal.py` |
| Fixture turns (no model, no DB) | Yassine | ✅ Done | `backend/app/assistant/turn_fixtures.py` |
| Contract tests | Yassine | ✅ Done | `backend/tests/assistant/`, `backend/tests/validation/` |
| `POST /api/v1/sessions/{id}/turns` fixture endpoint | **Mohamed** | ⏳ Not started | `backend/app/api/turns.py` |
| Encoding `TurnEvent` → AI SDK UI message stream parts | **Mohamed** | ⏳ Not started | `backend/app/classroom/streaming.py` |
| Verify part names against the installed `ai` version | **Mohamed** (+ Imran) | ⏳ Not started | — |
| HTTP 429 / 409 before the stream; abort → `cancelled` | **Mohamed** | ⏳ Not started | — |

The boundary: Yassine's code returns a `list[TurnEvent]` (a name plus a Pydantic payload). It knows nothing about SSE. Mohamed's transport turns that list into stream parts and owns everything about HTTP, streaming, idempotency, and cancellation.

## Rule 1: final-only text

Text reaches the student in **exactly one event**, `message.final`, after all four gates. No other event has a `text` field, and no raw model token is ever streamed. `test_text_appears_only_in_message_final` enforces this.

## Event sequences

**Accepted answer**

```text
turn.started          { turnId, sessionId }
retrieval.completed   { chunkIds, scores }
validation.started    { gates: ["source","scope","grounding","math_render"] }
validation.completed  { gates: [{gate, passed}], educationalStatus: "accepted" }
message.final         { text, citations: [{claimId, chunkId, revisionId, page, section, quote}], refusalCode: null, nextActions }
turn.completed        { turnId, usage: {inputTokens, outputTokens, costUsd} }
```

**Refusal**: a *completed* turn (plan §7.4, §11.1). It ends like an answer, but `message.final.text` is the server's French template and `citations` is empty. `retrieval.completed` is skipped when the turn is refused before retrieval (for example, out of scope).

```text
turn.started
[retrieval.completed]
validation.started
validation.completed  { gates, educationalStatus: "outside_scope" | ... }
message.final         { text: <template>, citations: [], refusalCode: "OUT_OF_SCOPE_LEVEL" }
turn.completed
```

**Failure**: a *failed* turn. `turn.failed` is the last event and replaces `message.final`, so no answer text is sent.

```text
turn.started
[retrieval.completed]
turn.failed           { code, educationalStatus, messageFr, retryable }
```

## Codes

| Code | Delivery | `educationalStatus` | Retryable |
| --- | --- | --- | --- |
| `OUT_OF_SCOPE_LEVEL` | refusal | `outside_scope` | no |
| `OUT_OF_SCOPE_CHAPTER` | refusal | `outside_scope` | no |
| `INSUFFICIENT_EVIDENCE` | refusal | `insufficient_evidence` | no |
| `AMBIGUOUS_QUESTION` | refusal | `clarification_required` | no |
| `MATH_UNVERIFIABLE` | refusal | `validation_failed` | no |
| `MATH_INCORRECT` | refusal | `validation_failed` | no |
| `RENDERING_UNSAFE` | refusal | `validation_failed` | no |
| `SOURCE_WITHDRAWN` | refusal | `source_withdrawn` | no |
| `PROVIDER_UNAVAILABLE` | `turn.failed` | `provider_unavailable` | **yes** |
| `CREDIT_EXHAUSTED` | `turn.failed` | `credit_exhausted` | no |
| `RATE_LIMITED` | HTTP 429, no stream | — | yes (after a wait) |
| `TURN_LIMIT_REACHED` | HTTP 409, no stream | — | no (new session) |

The French messages are in `refusal.py` (version `refusal-fr-v0.1`), approved by the mathematics reviewer on 2026-11-26 ([teaching-contracts.md](teaching-contracts.md)).

## Fixtures

`turn_fixtures.FIXTURES` has three turns for the prototype endpoint: `accepted`, `out_of_scope`, and `provider_failure`. They use synthetic text and fixed UUIDs, with no MAXI Maths content. Delete the module once the turn engine (plan §11) emits real events.

## Mohamed's part: start here

1. **Endpoint.** Add `POST /api/v1/sessions/{id}/turns` that, for the prototype, picks a fixture (for example, with a `?fixture=accepted|out_of_scope|provider_failure` query parameter in development only) and streams `FIXTURES[name]()`. No model, no database.
2. **Encoding** (`classroom/streaming.py`), following plan Appendix D:
   - send `{"type":"start","messageId":<turnId>}` first;
   - send each `TurnEvent` except `message.final` as `{"type":"data-<name with . replaced by ->","data": payload.wire()}`;
   - send `message.final` as `text-start`, **one** `text-delta` with the whole `text`, and `text-end`, then `data-message-final` with the remaining fields (`citations`, `refusalCode`, `nextActions`);
   - end with `{"type":"finish"}` and `data: [DONE]`.
3. **Verify** the part names against the installed `ai` package with Imran: `useChat` must render the text and expose the data parts.
4. **Outside the event list:** return 429 / 409 JSON for `RATE_LIMITED` / `TURN_LIMIT_REACHED` before opening the stream; on client abort, mark the turn `cancelled` (no event, because the client is gone); on idempotent replay, re-encode the stored events without calling the model.
5. Tick the checkbox in `member-c.md` and fill in the open questions below.

## Open questions for Mohamed

- **Timeout code.** The plan has no code for a server-side turn timeout (`TURN_TIMEOUT_SECONDS`). Proposal: stream `PROVIDER_UNAVAILABLE` (retryable), or add a `TURN_TIMEOUT` code. Decide before Week 6.
- **Refusal vs. `turn.failed`.** This contract sends refusals as `message.final` (a completed turn), as plan §7.4 says, and keeps `turn.failed` for failed turns only. Confirm that this matches your turn state machine.
- **`data-<name>` naming.** Confirm that the dotted event names map to `data-turn-started`, etc., as Appendix D shows.
