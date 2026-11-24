# ADR 0003 — Media, speech, and board contracts

- **Status:** Accepted
- **Date:** 24 November 2026

## Context

Photo upload, push-to-talk, and the synchronized board are in scope, but the plan
had no endpoints or tables for them, and `POST /turns` is JSON + SSE.

## Decision

Add dedicated endpoints and tables:

- `POST /sessions/{id}/media` (signed upload / register asset),
  `POST /media/{id}/interpret`, `POST /media/{id}/confirm`.
- `POST /speech/transcribe`, `POST /speech/synthesize`.
- `GET /sessions/{id}/board`, `GET /sessions/{id}/board/revisions/{revision}`.
- Tables: `media_assets`, `board_snapshots`.
- The turn request carries `mediaAssetId` and `confirmedExpression`; the response
  and `message.final` carry `boardRevision`; the SSE stream adds `board.updated`
  and `speech.ready`.

## Consequences

- Board-before-speech and board resume are implementable with a persisted
  revision, not replayed from raw events.
- Media has ownership, MIME, size, hash, and retention metadata.
- Raw microphone audio is never persisted.
