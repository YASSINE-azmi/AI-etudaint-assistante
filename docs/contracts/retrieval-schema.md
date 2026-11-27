# Retrieval schema: `document_chunks`, `chunk_objectives`, search text, embeddings, indexes

- **Version:** `retrieval-schema-v0.1`
- **Owner:** Yassine (retrieval) specifies; **Mohamed** writes the Alembic migration in Week 5 (member-c §Week 5)
- **Plan:** §5.1–§5.3, §9.4, §10.1–§10.3, D-44. **Built on:** `backend/ingest/chunking.py`, `backend/app/retrieval/normalize.py`, the Week-2 spike ([retrieval-rrf-ch01.md](../spikes/retrieval-rrf-ch01.md))

This page fixes what the tables must hold so that the chunker, retrieval, citations (D-37) and Gate 2 (scope) agree. Plan §5.1 lists the columns; this page adds types, constraints, how each value is produced, and the queries the indexes serve.

## 1. `document_chunks`

One row per chunk of a source revision. A chunk is a piece of one pedagogical unit; long units span several chunks.

| Column | Type | Null | Rule | Produced by |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | no | Primary key, `gen_random_uuid()`. This is the `chunk_id` the model cites (`CitationDraft.chunk_id`) | DB |
| `revision_id` | `uuid` | no | FK → `source_revisions.id`, `on delete restrict` | Ingestion |
| `chapter_id` | `text` | no | FK → `curriculum_chapters.id` (`tcs_ch01` …); must equal the revision's chapter | Ingestion |
| `chunk_index` | `int` | no | 0-based order inside the revision; unique per revision | `Chunk.chunk_index` |
| `unit_id` | `text` | no | Pedagogical unit, e.g. `tcs_ch01-u012`; chunks of one unit have contiguous `chunk_index` and the same `section_path` and `content_type` (§5.2) | `Chunk.unit_id` |
| `content_type` | `text` | no | `check` in the list of section 4 | `Chunk.content_type` |
| `section_path` | `text[]` | no | `[chapter title, part, section…]`, e.g. `{"Chapitre 1 - Ensemble N","course","Nombres premiers"}` | `Chunk.section_path` |
| `page_start`, `page_end` | `int` | no | Printed-book pages, `page_start ≤ page_end`. Until the sources carry page markers, both are the chunk's **part** range from `docs/curriculum/coverage-matrix.json` (`parts`) | Ingestion |
| `char_start`, `char_end` | `int` | no | Offsets into the reviewed source file, `char_start < char_end` | `Chunk.char_start/end` |
| `chunk_text` | `text` | no | Display text, images replaced by `[figure]`. Never returned whole to students (§5.3) | `Chunk.text` |
| `search_text` | `text` | no | Normalized text for lexical search (section 2) | `normalize.search_text(...)` |
| `search_vector` | `tsvector` | — | `generated always as (to_tsvector('french', search_text)) stored` | DB |
| `content_hash` | `text` | no | `sha256:<hex>` of `chunk_text`; citations pin it | `Chunk.content_hash` |
| `token_count` | `int` | no | Estimate, ≤ 500 except a single oversized math block | `Chunk.token_count` |
| `embedding` | `vector(1024)` | yes | Null only while the revision is a draft; publication requires non-null (§9.6) | Section 3 |
| `embedding_model` | `text` | yes | `intfloat/multilingual-e5-large`; set together with `embedding` | Settings |
| `embedding_dimensions` | `int` | yes | `1024`; `check (embedding_dimensions = vector_dims(embedding))` | Settings |
| `status` | `text` | no | Copied from the revision (`draft` / `reviewed` / `published` / `withdrawn`); only `published` is searched (§5.2) | Publication CLI |

Constraints:

- `unique (revision_id, chunk_index)`.
- Rows are immutable once their revision is published; re-chunking creates a new revision (§9.4).
- A check keeps `embedding`, `embedding_model` and `embedding_dimensions` all null or all set.

## 2. `search_text`: one function on both sides

- `search_text` is computed **in Python** by `app.retrieval.normalize.search_text`, never by SQL, because the math-word map is reviewer-editable data (§10.2). Queries go through the same function before `websearch_to_tsquery`.
- Input: the section titles after the part (`section_path[2:]`) plus `chunk_text`. The spike's BM25 indexed exactly this; titles such as "Nombres premiers" carry much of the lexical signal.
- What it does: lowercase, strip accents and LaTeX commands, and turn math into words (`x²` → `carre`, `√` → `racine`, `≤` → `inferieur egal`, `|x|` → `valeur absolue`, `ℝ⁺` → `reels positifs`, `\mathbb{D}` → `decimaux`, …).
- Because accents are already removed in Python, the generated column needs no `unaccent` and stays immutable. The `french` configuration still stems and drops stop words.
- Changing `normalize.py` changes `search_text`: re-run the retrieval set (§10.5), then backfill `search_text` for the affected revisions.

## 3. Embeddings (D-44)

| Item | Value |
| --- | --- |
| Model | `intfloat/multilingual-e5-large`, local through fastembed (ONNX), settings `EMBEDDING_MODEL_NAME` / `EMBEDDING_DIMENSIONS` |
| Dimensions | 1024 |
| Passage input | `"passage: " + " > ".join(section_path) + "\n" + chunk_text` |
| Query input | `"query: " + <query built per §10.6>` |
| Distance | cosine (`<=>`), `vector_cosine_ops` |

The `passage: ` / `query: ` prefixes are part of the contract: without them e5 retrieval drops. Changing the model or dimensions is a new revision and a full re-embed (§10.1).

## 4. `content_type` values

The chunker emits exactly these (`ingest.chunking.CONTENT_TYPES`). A test keeps this list equal to the code.

| Value | Book part | Used for |
| --- | --- | --- |
| `intro` | Objectives, biography, contents | Excluded from teaching retrieval (no objective mapping) |
| `activity` | Activités d'introduction | Teaching |
| `course` | Le cours (untyped course text) | Teaching |
| `definition` | Définition | Teaching; reranker bonus for "c'est quoi" questions (§10.7) |
| `property` | Propriété | Teaching |
| `example` | Exemple | Teaching |
| `remark` | Remarque, Infos | Teaching |
| `method` | Pour comprendre (worked methods) | Teaching |
| `solved_exercise` | Exercices résolus | Teaching |
| `exercise` | Exercices | Retrieval only as a last resort; candidate for the practice bank (spike finding 2) |

## 5. `chunk_objectives`

| Column | Type | Rule |
| --- | --- | --- |
| `chunk_id` | `uuid` | FK → `document_chunks.id`, `on delete cascade` |
| `objective_id` | `text` | FK → `curriculum_objectives.id` (`tcs_ch01_o07` …) |

- Primary key `(chunk_id, objective_id)`; secondary index `(objective_id, chunk_id)`.
- Mapping is decided **per unit** and copied to every chunk of the unit, so a unit is never half-in-scope.
- The objective must belong to the chunk's chapter. Cross-chapter use goes only through `objective_prerequisites` (Gate 2, §8.4).
- Every chunk except `intro` maps to at least one objective before publication (§9.6, "objective mapping checked").
- The reviewer proposes the mapping during corpus review; the Week-2 retrieval set already pairs 56 queries with an `objective_id`, which is the starting evidence.

## 6. Indexes and the queries they serve

| Index | Serves |
| --- | --- |
| HNSW on `embedding vector_cosine_ops` (`m = 16`, `ef_construction = 64`; query `hnsw.ef_search = 40`) | Semantic top 20 |
| GIN on `search_vector` | Lexical top 20 with `ts_rank_cd` |
| B-tree `(chapter_id, status)` | Scope filter on every search |
| B-tree `(revision_id, unit_id, chunk_index)` | `read_neighboring_chunks`: read a unit back in order |
| B-tree `(revision_id, chunk_index)` (the unique constraint) | Ordered reads, citation lookup |
| PK and `(objective_id, chunk_id)` on `chunk_objectives` | Objective filter, Gate 2 |

Semantic channel, scoped to the session (one chapter, published only, approved objectives):

```sql
select c.id
from document_chunks c
where c.chapter_id = :chapter_id
  and c.status = 'published'
  and exists (select 1 from chunk_objectives o
              where o.chunk_id = c.id and o.objective_id = any(:objective_ids))
order by c.embedding <=> :query_embedding
limit 20;
```

Lexical channel: the same filters, then `where c.search_vector @@ websearch_to_tsquery('french', :query_search_text)` `order by ts_rank_cd(c.search_vector, query) desc, c.id limit 20`. If it returns nothing, retry with the query terms joined by `|` (the OR fallback, §10.2). Both lists go to `app.retrieval.fusion.rrf` (k = 60, ties by ID).

With a strict filter, HNSW can return fewer than 20 rows. Chapters are small (83–119 chunks), so if that happens, raise `hnsw.ef_search` for the query or use exact search; do not drop the filter.

## 7. Access

- `document_chunks` and `chunk_objectives` follow §5.3: RLS forced; students never read `chunk_text` directly. The API reads through `app_runtime` with a published-only policy; drafts are reachable only from the ingestion CLI (`AdminSettings`).
- Citations copy `page_start`, `section_path`, `revision_id`, `content_hash` and a short quote at validation time (D-37), so later withdrawals do not change history.

## 8. Sign-off

| Role | Name | Date | Version |
| --- | --- | --- | --- |
| Specified by (retrieval) | Yassine | 2026-11-27 | `retrieval-schema-v0.1` |
| Accepted for the Week-5 migration (platform) | Mohamed | | |
