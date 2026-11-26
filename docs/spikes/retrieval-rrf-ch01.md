# Retrieval / RRF spike: chapter 1 (Week 1)

- **Owner:** Yassine · **Task:** [member-b.md](../team/member-b.md) Week 1 "Extract one chapter sample and run the retrieval/RRF spike"
- **Status:** done. **Decision (D-44): local `intfloat/multilingual-e5-large` (1024 dims) + BM25, fused with RRF.** Labels are still provisional (reviewer to confirm).
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
uv run python -m scripts.retrieval_spike ../data/sources/01_Chapitre_1_L_ensemble_N.md --model intfloat/multilingual-e5-large --models-dir $env:LOCALAPPDATA/ai-math-tutor/models
```

Embeddings run locally through `fastembed` (ONNX, no PyTorch, no API key). Keep the model cache outside OneDrive: inside the synced folder the 2.2 GB download stalled repeatedly.

## Chunking result (chapter 1, "Ensemble N - notions d'arithmétique")

- **83 chunks**, one per unit: intro 3 · activity 6 · course 5 · definition 6 · property 2 · example 9 · remark 3 · method 3 · solved exercise 4 · exercise 42.
- Sizes: 13 to 483 estimated tokens (cap 500). Only solved exercise 3 is split, in 2 pieces that share one `unit_id`.
- Offsets cover the source with no gaps; no chunk cuts a `$$…$$` block (both are tested).
- A bare heading joins the unit after it, so every chunk carries its section title.
- An "Exemple" inside an exercise stays with that exercise.
- Images become `[figure]`; the figure contents (division tables for the successive-division method) are lost, which matters for the PGCD method (see findings).

## Retrieval result (20 queries)

| Channel | Recall@5 | MRR |
| --- | --- | --- |
| Lexical (BM25 over normalized text) | **0.90** | **0.79** |
| Semantic, `paraphrase-multilingual-MiniLM-L12-v2` (384 dims, 0.22 GB) | 0.60 | 0.41 |
| RRF, BM25 + MiniLM | 0.85 | 0.61 |
| Semantic, `multilingual-e5-large` (1024 dims, 2.2 GB) | 0.85 | 0.78 |
| **RRF, BM25 + e5-large (chosen)** | **0.90** | **0.79** |

Plan target (§10.5): per chapter Recall@5 ≥ 0.80, overall ≥ 0.90, MRR ≥ 0.70. BM25 + e5-large meets all three on chapter 1.

**Why e5-large and RRF, when BM25 alone scores the same:** the two channels fail on different queries. e5-large ranks "algorithme d'Euclide" first (BM25: 11th), and RRF lifts it into the top 5. BM25 catches exact-number queries that embeddings blur. MiniLM was too weak: fused with BM25 it scored *below* BM25 alone. On a 20-query set the totals tie, but the fused ranking is safer on unseen wording.

**Speed (CPU):** model load 2.4 s once at startup; **about 45 ms per query**, well inside the 2 s retrieval budget; embedding all 83 chunks takes about 2 minutes (ingestion only).

Misses and near-misses:

| Query | Rank of first relevant chunk | Why |
| --- | --- | --- |
| "algorithme d'Euclide pour trouver le pgcd" | BM25 11 · e5 1 · RRF 5 | The course text never says "Euclide". e5 bridges it; also add "algorithme d'Euclide → divisions successives" to the synonym map. |
| "décomposer un nombre en produit de facteurs premiers" | BM25 11 · e5 7 · RRF 9 | Exercises 21–29 repeat the exact phrase and outrank the property. The §10.7 reranker should boost `definition`/`property` over `exercise` for "what is / how to" questions. |
| "comment savoir si un nombre est divisible par 3" | 3 | A worked method ranks above the property; acceptable. |
| "utiliser le ppcm pour additionner deux fractions" | BM25 3 · e5 >20 · RRF 9 | The objectives chunk ranks first; consider excluding `intro` chunks from teaching retrieval. |

## Findings for the plan

1. **Normalization pays off.** "PGCD", "P G C D", `\operatorname{PGCD}` and "plus grand commun diviseur" all meet as `pgcd`; "x au carré", "x²" and `x^{2}` all meet as `x carre`. Keep this map as reviewer-editable data (§10.2).
2. **Exercises crowd out the course.** 42 of 83 chunks are exercises. The reranker needs a content-type prior, or exercises go into the practice bank instead of teaching retrieval. Decide in Week 2.
3. **Images hide method content.** The successive-division steps are images. The reviewer should transcribe them, or the PGCD method will not be citable.
4. **Source typos affect search.** "DÉFINTION", "EXERGICE RESOLO", "leçan", "Gapacitiés" are caught by tolerant markers, but student queries won't match misspelled words. Fix them in the reviewed source.
5. **Token count is estimated** (characters ÷ 4). Use the embedding model's tokenizer when ingestion is built properly.
6. **No overlap yet.** The plan asks for ~50 tokens of prose overlap; only one unit is long enough to split, so this was deferred.

## Follow-ups (not part of this spike)

1. The mathematics reviewer confirms or corrects the 20 labels; they are provisional.
2. The §10.7 reranker adds a content-type prior so definitions and properties beat exercises.
3. Weeks 2–5: build the real ingestion (Postgres FTS + pgvector `vector(1024)`) and re-run this set against it.
