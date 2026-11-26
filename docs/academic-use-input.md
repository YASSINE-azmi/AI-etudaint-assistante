# Academic-use note: input from the content owner

- **From:** Yassine, content owner and mathematics reviewer (D-45)
- **For:** the team lead, who records the academic-use note, and the supervisor, who acknowledges it (plan §9.1, D-13)
- **Date:** 2026-11-26
- **Status:** Draft. Waiting for the team lead.

This page lists the facts the academic-use note has to cover about how the textbook is used. It is not the note itself, and it is not a legal opinion.

## 1. The source

| Item | Fact |
| --- | --- |
| Book | MAXI Maths — Tronc Commun Scientifique (commercial textbook, 15 chapters) |
| Taught in `v0.1.0` | Chapters 1–3 only, pages 15–72 (D-46, `docs/curriculum/coverage-matrix.md`) |
| Text check | The reviewer checked the extracted text of chapters 1–3 against the printed book |

## 2. Where the book text lives

The book text moves through three stages:

| Stage | What is stored | Where | Who can read it |
| --- | --- | --- | --- |
| **Development** | Raw extracted text of all 15 chapters | Team members' computers, `data/sources/` (gitignored, never committed to GitHub) | The team only |
| **Publication** | Reviewed chunks of the 3 approved chapters only | Private Supabase Postgres project | The backend only. Students cannot read `chunk_text` directly (plan §9.1) |
| **Each tutor answer** | A few short excerpts from those chunks, sent as grounding | DeepSeek API (`api.deepseek.com`), outside Morocco | DeepSeek, under its API terms |

Embeddings are computed locally (D-44), so no text is sent to a provider for search.

For now the other 12 chapters stay on team computers and are not uploaded to Supabase or sent to DeepSeek. Once the 3-chapter tutor works, the team plans to add them through the expansion path (plan §2.7). Each added chapter needs reviewer sign-off and an update to this note before publication (plan §2.7, items 1–2).

## 3. What students see

- The AI's answer, with **short citations**: at most 25 words or 300 characters each, with chapter, section and page.
- Never a full page or a long passage. A quote-length check applies to both citations and the model's own text (plan §9.1).
- Students are synthetic demo profiles. There are no real students in this release.

## 4. Points the supervisor should decide or acknowledge

1. **Raw text of all 15 chapters on team computers** during development, even though only 3 are taught.
2. **Book excerpts sent to DeepSeek**, a provider outside Morocco, on every answer. This is the only place the book text leaves the team's control.
3. **Reviewer independence:** the content owner is also the reviewer (D-45).
4. **Academic use only:** the content owner confirms the project is academic, with no commercial use. Any public or commercial use would need a rights review first.
5. **Later chapters:** the remaining 12 chapters will be added after the first 3 work, each one reviewed and covered by an updated note.

## 5. Sign-off

| Role | Name | Date |
| --- | --- | --- |
| Input written by (content owner) | Yassine | 2026-11-26 |
| Recorded by (team lead) | | |
| Acknowledged by (supervisor) | | |
