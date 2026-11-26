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
| 57 labeled queries (20 / 17 / 20) | `backend/scripts/retrieval_spike_queries/<chapter>.json` | Provisional labels |

Run it from `backend/`:

```powershell
uv run python -m scripts.retrieval_spike --lexical-only
uv run python -m scripts.retrieval_spike --model intfloat/multilingual-e5-large --models-dir $env:LOCALAPPDATA/ai-math-tutor/models
```

With no chapter IDs, every chapter that has a query file runs; add a chapter ID such as `tcs_ch02` to run one. Each query file names its source in `data/sources/`. Set `$env:PYTHONIOENCODING = "utf-8"` first, or Windows fails to print "≤" in the per-query lines.

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

## Week 2: all three chapters

Same method, run per chapter, since retrieval is scoped to the session's chapter. Two chunker fixes came first:

- A marker written `**## EXERCICE RESOLU 4**` was missed. That merged two solved exercises into one 572-token chunk.
- A heading-only "ACTIVITES" part got the type `activitie`.

Units that reach the cap with no blank line are now cut at a line end, still never inside `$$`.

| Chapter | Chunks | Queries | BM25 R@5 / MRR | e5-large R@5 / MRR | RRF R@5 / MRR |
| --- | --- | --- | --- | --- | --- |
| `tcs_ch01` ℕ, arithmétique | 83 | 20 | 0.90 / 0.78 | 0.85 / 0.78 | **0.90 / 0.79** |
| `tcs_ch02` ensembles des nombres | 92 | 17 | 0.94 / 0.76 | 0.94 / 0.77 | **0.94 / 0.88** |
| `tcs_ch03` ordre dans ℝ | 119 | 20 | 0.90 / 0.48 | 0.85 / 0.55 | **0.90 / 0.60** |
| All 57 queries | 294 | 57 | | | **0.91 / 0.75** |

7. **Order symbols needed normalization.** Before the fix, chapter-3 BM25 was 0.65 and RRF (0.75) fell below semantic search alone (0.85). The book writes `c<0`, `|x|` and `\mathbb{R}^{+}`, while students write "négatif", "valeur absolue" and "R+". New rules:
   - `<` and `>` → inférieur / supérieur;
   - `< 0` and `> 0` → négatif / positif;
   - `|…|` → valeur absolue;
   - ℝ⁺ and ℝ⁻ → réels positifs / négatifs;
   - `\mathbb{D}` → décimaux;
   - `<br>` is dropped.

   Chapter 3 then reached 0.90 for both BM25 and RRF; chapters 1 and 2 barely moved (ch1 BM25 MRR 0.79 → 0.78, ch2 0.77 → 0.76, Recall@5 unchanged).
8. **Chapter-3 ranks are lower (MRR 0.60).** Its course is split into many small remark and property chunks, and 62 of 119 chunks are exercises, so the right chunk is often 2nd to 5th. The §10.7 content-type prior (finding 2) matters most here.
9. **Three misses remain** (outside the top 5 in RRF):
   - "utiliser le ppcm pour additionner deux fractions" (ch1): the intro chunk wins.
   - "racine de a fois racine de b" (ch2): e5 misses the symbolic property.
   - "comment comparer deux nombres réels" (ch3): too generic, since every chunk compares numbers.
10. **D-44 holds.** RRF with e5-large is never below BM25 on any chapter, and is best or tied on all three.

### Graded set (Week-2 retrieval-set task)

All 301 query–chunk pairs are graded 0/1/2. Claude did the grading at the reviewer's request (D-45), because the excerpts are raw LaTeX; a reviewer spot-check is still pending. The set now has 56 queries: 19 / 17 / 20, all 22 objectives, 40 tune / 16 holdout. "liste des nombres premiers inférieurs à 100" was dropped: the list exists only as an image, so no text chunk answers it (finding 3).

| Chapter | RRF R@5 / MRR, all | RRF R@5 / MRR, holdout |
| --- | --- | --- |
| `tcs_ch01` | 0.84 / 0.80 | 0.80 / 0.82 |
| `tcs_ch02` | 0.94 / 0.88 | 0.80 / 0.81 |
| `tcs_ch03` | 0.90 / 0.64 | 0.83 / 0.62 |
| All 56 | 0.89 | 0.81 (13 / 16) |

Extraction check: all 2,352 math spans in the three sources render in KaTeX without error. Reading the chunks found one OCR error that still renders: chapter 3, the absolute-value product property reads `|x y|=|x| y \mid` instead of `|x y|=|x||y|`. Fixed in `data/sources/` on 2026-11-26 at the reviewer's request; it still renders, and the query "propriétés de la valeur absolue |xy| = |x||y|" now ranks its chunk 2nd in RRF instead of 6th.

## Follow-ups (not part of this spike)

1. The mathematics reviewer confirms or corrects the 57 labels, grades them 0/1/2 and splits them 70/30 (the Week-2 retrieval-set task). Until then they are provisional.
2. The §10.7 reranker adds a content-type prior so definitions and properties beat exercises.
3. Weeks 2–5: build the real ingestion (Postgres FTS + pgvector `vector(1024)`) and re-run this set against it.
