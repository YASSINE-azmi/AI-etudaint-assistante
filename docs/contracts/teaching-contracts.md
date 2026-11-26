# Teaching contracts: draft output, citations, refusal codes, status mapping

- **Version:** `teaching-contracts-v0.1` (frozen)
- **Status:** **Frozen** on 2026-11-26. French messages approved (`refusal-fr-v0.1`); shapes accepted by Imran and Mohamed (acceptance reported by Yassine). Changes now need a decision-log entry and a new version.
- **Owner:** Yassine (teaching, validation). **Consumers:** Mohamed (gates, persistence, stream), Imran (classroom UI).
- **Plan:** §8.2 (draft output), §8.3 (Gate 1), §8.7 (refusals), D-36, D-37. **Stream:** [sse-turn-contract.md](sse-turn-contract.md).

The code is the source of truth. This page says where each contract lives and what is frozen. Once the version loses `-draft`, any change needs a decision-log entry and a new version.

## 1. Draft output (model → server)

**Code:** `backend/app/validation/draft.py` (`DRAFT_CONTRACT_VERSION = "draft-output-v0.1"`).

```text
AgentDraftOutput
├── steps: [TeachingStepDraft]          at least one
│   ├── step_id, display_text_fr
│   ├── next_actions: [str]
│   └── claims: [ClaimDraft]
│       ├── claim_id, objective_id      objective_id from the coverage matrix
│       ├── text_fr                     verbatim inside display_text_fr
│       ├── citations: [CitationDraft]  chunk_id (UUID) + verbatim quote
│       └── math: MathClaim | null      expression, variables, assumptions, expected_form, check
└── suggested_status                    diagnostic only, never used to release
```

Frozen rules:

- The output is **untrusted**. Unknown fields are rejected, which also blocks parallel `cited_chunk_ids` / `quoted_excerpts` lists.
- `chunk_id` is the **database UUID** of `document_chunks.id`. Labels such as `tcs_ch01-c011` exist only in the retrieval spike.
- Math variable domains: `real`, `integer`, `natural`, `vector2`. Check types: `simplify`, `solve`, `interval`, `vector`, `property`.
- A turn is all-or-nothing: if any step fails a gate, the whole turn is refused or clarified.

## 2. Citations

| Side | Fields | Who fills them |
| --- | --- | --- |
| Model (`CitationDraft`) | `chunk_id`, `quote` | The model |
| Server (`turn_contract.Citation`, sent in `message.final`) | `claimId`, `chunkId`, `revisionId`, `page`, `section`, `quote` | The server, copied from the chunk at validation time (D-37) |

- The quote must appear in the chunk after normalization, or Gate 1 fails. A citation is never silently replaced.
- Quote length: at most 25 words or 300 characters (plan §9.1).
- `page` is the printed-book page. Until the sources carry page markers, it is the first page of the chunk's part (`docs/curriculum/coverage-matrix.json`, `parts`).

## 3. Refusal codes and status mapping

**Code:** `backend/app/validation/refusal.py` (`REFUSAL_TEMPLATES_VERSION`). A test checks that this table matches the code.

| Code | Educational status | Delivery | Retry | Message (French, shown to the student) |
| --- | --- | --- | --- | --- |
| `OUT_OF_SCOPE_LEVEL` | outside_scope | refusal | no | Cette question dépasse le programme du Tronc Commun Scientifique. Choisis une notion d'un chapitre disponible et je t'explique pas à pas. |
| `OUT_OF_SCOPE_CHAPTER` | outside_scope | refusal | no | Ce chapitre n'est pas encore disponible dans cette version. Choisis l'un des chapitres proposés dans la liste. |
| `INSUFFICIENT_EVIDENCE` | insufficient_evidence | refusal | no | Le manuel validé ne contient pas assez d'éléments pour répondre à cette question. Reformule-la ou pose une question sur une notion du chapitre. |
| `AMBIGUOUS_QUESTION` | clarification_required | refusal | no | Je ne suis pas sûr de bien lire ta question. Peux-tu préciser l'expression ou le symbole concerné ? |
| `MATH_UNVERIFIABLE` | validation_failed | refusal | no | Je n'arrive pas à vérifier ce calcul avec certitude, donc je préfère ne pas répondre. Peux-tu préciser l'énoncé ? |
| `MATH_INCORRECT` | validation_failed | refusal | no | La réponse préparée n'a pas passé la vérification mathématique, elle n'est donc pas affichée. Reformule ta question ou essaie une autre notion. |
| `RENDERING_UNSAFE` | validation_failed | refusal | no | La réponse contient une notation mathématique qui ne peut pas être affichée correctement. Reformule ta question. |
| `SOURCE_WITHDRAWN` | source_withdrawn | refusal | no | La source de cette séance a été retirée. L'historique reste consultable ; ouvre une nouvelle séance pour continuer. |
| `PROVIDER_UNAVAILABLE` | provider_unavailable | failure | yes | Le service est momentanément indisponible. Ta séance est conservée ; réessaie dans un instant. |
| `CREDIT_EXHAUSTED` | credit_exhausted | failure | no | Les crédits de démonstration sont épuisés. Cette version de démonstration ne peut plus répondre pour le moment. |
| `RATE_LIMITED` | — | http | yes | Tu envoies trop de questions à la suite. Attends quelques secondes puis réessaie. |
| `TURN_LIMIT_REACHED` | — | http | no | Cette séance a atteint sa limite de questions. Ouvre une nouvelle séance pour continuer. |

An answered turn has educational status `accepted` and no refusal code.

## 4. What each delivery means

| Delivery | Turn row | Stream ends with | HTTP |
| --- | --- | --- | --- |
| (answer) | `completed`, `accepted` | `message.final` with text and citations | 200 |
| `refusal` | `completed`, status from the table | `message.final` with the template and `refusalCode` | 200 |
| `failure` | `failed` | `turn.failed` with `code` and the message | 200 (the stream already started) |
| `http` | none | no stream | 429 `RATE_LIMITED`, 409 `TURN_LIMIT_REACHED` |

## 5. Reviewer: French messages

| # | Question | Decision |
| --- | --- | --- |
| 1 | Are the 12 messages correct, clear for a TCS student, and in the right register (tutoiement)? | **Approved as written**, 2026-11-26 |
| 2 | `AMBIGUOUS_QUESTION` uses "Je ne suis pas sûr" (masculine). Keep it, or use a neutral form such as "Ta question n'est pas assez claire pour moi"? | **Keep as written** |

## 6. Sign-off

| Role | Name | Date | Version |
| --- | --- | --- | --- |
| Drafted by (owner) | Yassine | 2026-11-26 | `teaching-contracts-v0.1-draft` |
| French messages approved (mathematics reviewer) | Yassine | 2026-11-26 | `refusal-fr-v0.1` |
| Shapes accepted (backend) | Mohamed | 2026-11-26 | `teaching-contracts-v0.1` |
| Shapes accepted (frontend) | Imran | 2026-11-26 | `teaching-contracts-v0.1` |
