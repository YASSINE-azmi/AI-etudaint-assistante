# Retrieval / RRF spike: chapter 1 (Week 1)

- **Owner:** Yassine · **Task:** [member-b.md](../team/member-b.md) Week 1 "Extract one chapter sample and run the retrieval/RRF spike"
- **Status:** chunking and lexical channel run; **semantic channel and RRF are pending an embedding API key** (see "To finish").
- **Plan:** §9.4 (chunking), §10.2 (hybrid search), §10.3 (RRF), §10.5 (retrieval evaluation)

No textbook text is in this file or in git. The chapter source stays in `data/sources/` (gitignored); chunk text and embedding caches go to `data/extracted/` (gitignored).

## What was built

| Piece | Where | Production or spike |
| --- | --- | --- |
| Chunker by pedagogical unit | `backend/ingest/chunking.py` | Production candidate |
| Search normalization (accents, LaTeX, spoken math) | `backend/app/retrieval/normalize.py` | Production candidate |
| RRF fusion (k = 60, 1-based, tie-break by ID) | `backend/app/retrieval/fusion.py` | Production candidate |
| BM25 + in-memory cosine, metrics | `backend/scripts/retrieval_spike.py` | Spike only (Postgres FTS + pgvector replace it) |
| 20 labeled queries | `backend/scripts/retrieval_spike_queries.json` | Provisional labels |

Run it from `backend/`:

```powershell
uv run python -m scripts.retrieval_spike ../data/sources/01_Chapitre_1_L_ensemble_N.md --lexical-only
uv run python -m scripts.retrieval_spike ../data/sources/01_Chapitre_1_L_ensemble_N.md
```

## Chunking result (chapter 1, "Ensemble N - notions d'arithmétique")

- **83 chunks**, one per unit: intro 3 · activity 6 · course 5 · definition 6 · property 2 · example 9 · remark 3 · method 3 · solved exercise 4 · exercise 42.
- Sizes: 13 to 483 estimated tokens (cap 500). Only solved exercise 3 is split, in 2 pieces that share one `unit_id`.
- Offsets cover the source with no gaps; no chunk cuts a `$$…$$` block (both are tested).
- A bare heading joins the unit after it, so every chunk carries its section title.
- An "Exemple" inside an exercise stays with that exercise.
- Images become `[figure]`; the figure contents (division tables for the successive-division method) are lost, which matters for the PGCD method (see findings).

## Retrieval result (20 queries, lexical channel only)

| Channel | Recall@5 | MRR |
| --- | --- | --- |
| Lexical (BM25 over normalized text) | **0.90** | **0.79** |
| Semantic (`text-embedding-3-small`) | pending | pending |
| RRF (lexical + semantic) | pending | pending |

Plan target (§10.5): per chapter Recall@5 ≥ 0.80, overall ≥ 0.90, MRR ≥ 0.70. The lexical channel alone already meets the chapter target.

Misses and near-misses:

| Query | Rank of first relevant chunk | Why |
| --- | --- | --- |
| "algorithme d'Euclide pour trouver le pgcd" | 11 | The chapter never says "Euclide" in the course text, only in the objectives. A vocabulary gap: the semantic channel should fix it; otherwise add "algorithme d'Euclide → divisions successives" to the synonym map. |
| "décomposer un nombre en produit de facteurs premiers" | 11 | Exercises 21–29 repeat the exact phrase and outrank the property. The §10.7 reranker should boost `definition`/`property` over `exercise` for "what is / how to" questions. |
| "comment savoir si un nombre est divisible par 3" | 3 | A worked method ranks above the property; acceptable. |
| "utiliser le ppcm pour additionner deux fractions" | 3 | The objectives chunk ranks first; consider excluding `intro` chunks from teaching retrieval. |

## Findings for the plan

1. **Normalization pays off.** "PGCD", "P G C D", `\operatorname{PGCD}` and "plus grand commun diviseur" all meet as `pgcd`; "x au carré", "x²" and `x^{2}` all meet as `x carre`. Keep this map as reviewer-editable data (§10.2).
2. **Exercises crowd out the course.** 42 of 83 chunks are exercises. The reranker needs a content-type prior, or exercises go into the practice bank instead of teaching retrieval. Decide in Week 2.
3. **Images hide method content.** The successive-division steps are images. The reviewer should transcribe them, or the PGCD method will not be citable.
4. **Source typos affect search.** "DÉFINTION", "EXERGICE RESOLO", "leçan", "Gapacitiés" are caught by tolerant markers, but student queries won't match misspelled words. Fix them in the reviewed source.
5. **Token count is estimated** (characters ÷ 4). Use the embedding model's tokenizer when ingestion is built properly.
6. **No overlap yet.** The plan asks for ~50 tokens of prose overlap; only one unit is long enough to split, so this was deferred.

## To finish this task

1. Put a valid OpenAI key in `backend/.env` (`AI_PROVIDER_BASE_URL`, `AI_PROVIDER_API_KEY`) along with the other required settings from `.env.example`.
2. Run the full command above (without `--lexical-only`) and fill in the semantic and RRF rows.
3. If RRF beats both channels, keep `text-embedding-3-small` (§10.1: the model is a one-way door after Week 1).
4. Have the mathematics reviewer confirm or correct the 20 labels; they are provisional.
