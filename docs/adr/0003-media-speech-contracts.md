# ADR 0003 — Media and speech contracts

- **Status:** Accepted (whiteboard deferred out of `v0.1.0`)
- **Date:** 24 November 2026 (revised 26 November 2026, D-38/D-39)

## Context

Photo upload and push-to-talk are in scope, but the plan had no endpoints or
tables for them, and `POST /turns` is JSON + SSE. The synchronized whiteboard
was descoped from `v0.1.0` and is deferred.

## Decision

Add dedicated endpoints and tables for media and speech:

- `POST /sessions/{id}/media` (signed upload / register asset),
  `POST /media/{id}/interpret`, `POST /media/{id}/confirm`.
- `POST /speech/transcribe` (push-to-talk speech-to-text only).
- Table: `media_assets`.
- The turn request carries `mediaAssetId` and `confirmedExpression`.
- **Upload path (D-38).** `POST /sessions/{id}/media` registers the asset and
  returns its path `{user_id}/{session_id}/{asset_id}`. The browser uploads with
  supabase-js to the private `exercise-photos` bucket; a `storage.objects`
  policy lets a user write and read only under their own `user_id/` prefix. The
  API downloads with the student's forwarded JWT, re-encodes with Pillow, and
  strips metadata before vision. The API never needs the service-role key.
- **No text-to-speech (D-43, supersedes D-39).** Answers are text and KaTeX
  only. There is no `/speech/synthesize` endpoint and no audio output, so
  interruption only has to stop recording and the turn stream.

## Consequences

- Media has ownership, MIME, size, hash, and retention metadata.
- Raw microphone audio is never persisted.
- The whiteboard and `board_snapshots` are deferred beyond `v0.1.0`; validated
  math is rendered as KaTeX notation in the transcript instead.
