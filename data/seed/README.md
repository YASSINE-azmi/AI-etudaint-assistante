# Seed corpus (synthetic, CC0)

Three short chapters for tests, CI and demo warm-up (plan §9.7). They follow the shape of the approved TCS chapters, so the real chunker and retrieval code run on them, but **every sentence and example was written for this project**. No MAXI Maths text is copied or paraphrased.

| File | Chapter | Objectives covered |
| --- | --- | --- |
| `tcs_ch01_seed.md` | Ensemble ℕ et arithmétique | `tcs_ch01_o01`–`o08` |
| `tcs_ch02_seed.md` | Ensembles de nombres | `tcs_ch02_o01`–`o08` |
| `tcs_ch03_seed.md` | Ordre dans ℝ | `tcs_ch03_o01`–`o06` |

- **License:** CC0-1.0 (public domain dedication). Anyone may reuse it.
- **Mapping:** [manifest.json](manifest.json) maps each course section and exercise to coverage-matrix objectives, as a reviewer would.
- **Checks:** `backend/tests/curriculum/test_seed_corpus.py` checks that the seed chunks cleanly, covers all 22 objectives, maps every non-intro chunk, and — on a machine that has the textbook sources — shares no 8-word run with them.
- **Rule:** never add textbook text here. Real chapters stay in the gitignored `data/sources/`.
