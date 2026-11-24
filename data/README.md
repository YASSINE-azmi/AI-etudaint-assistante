# Data

Local-only workspace for the **MAXI Maths — Tronc Commun Scientifique** corpus.

## Rules

- Raw PDFs, scans, extracted text, images, and audio stay **local and gitignored**.
- Do not commit copyrighted textbook payloads.
- Do not use unrelated corpora; this project only uses the three approved TCS chapters.
- Seed fixtures for tests and CI must be synthetic or open-licensed.
- Ingestion is handled from `backend/ingest/` with reviewer approval before publication.

## Expected local layout

```text
data/
├── sources/       # local MAXI Maths PDFs/scans (gitignored)
├── extracted/     # extracted text/equations (gitignored)
├── reviews/       # reviewer notes and manifests (gitignored unless synthetic)
└── seed/          # synthetic/open-licensed fixtures for tests
```

The authoritative ingestion and publication workflow is in
[docs/implementation-plan.md](../docs/implementation-plan.md), section 9.
