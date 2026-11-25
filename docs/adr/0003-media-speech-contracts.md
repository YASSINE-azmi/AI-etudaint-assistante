# ADR 0003 — Media and speech contracts

- **Status:** Accepted (whiteboard deferred out of `v0.1.0`)
- **Date:** 24 November 2026

## Context

Photo upload and push-to-talk are in scope, but the plan had no endpoints or
tables for them, and `POST /turns` is JSON + SSE. The synchronized whiteboard
was descoped from `v0.1.0` and is deferred.

## Decision

Add dedicated endpoints and tables for media and speech:

- `POST /sessions/{id}/media` (signed upload / register asset),
  `POST /media/{id}/interpret`, `POST /media/{id}/confirm`.
- `POST /speech/transcribe`, `POST /speech/synthesize`.
- Table: `media_assets`.
- The turn request carries `mediaAssetId` and `confirmedExpression`; the SSE
  stream adds `speech.ready`.

## Consequences

- Media has ownership, MIME, size, hash, and retention metadata.
- Raw microphone audio is never persisted.
- The whiteboard and `board_snapshots` are deferred beyond `v0.1.0`; validated
  math is rendered as KaTeX notation in the transcript instead.
