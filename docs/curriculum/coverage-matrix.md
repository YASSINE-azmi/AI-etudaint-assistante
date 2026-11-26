# Coverage matrix: three approved chapters

- **Version:** `coverage-v0.1`
- **Status:** **Approved** on 2026-11-26 (section 5). Reviewer answers are in section 4.
- **Independence note (D-45):** the reviewer, Yassine, also drafted the matrix. The supervisor checks a sample.
- **Data:** [coverage-matrix.json](coverage-matrix.json) is the source of truth; this page is the review sheet
- **Plan:** §2.2 (approved chapters, D-46), §5.1 (`curriculum_chapters`, `curriculum_objectives`, `objective_prerequisites`), §8.4 (Gate 2 scope)

The matrix lists what the tutor may teach. Gate 2 rejects any claim whose `objective_id` is not here, and any chunk not mapped to that objective or one of its prerequisites. Objectives follow each chapter's "Objectifs de la leçon" and course sections. The file holds IDs, titles and tags only, with no textbook text.

`backend/tests/curriculum/test_coverage_matrix.py` checks that IDs are unique, tags are kebab-case, every prerequisite exists, none points to a later chapter, and the graph has no cycle.

## 1. Chapters

| ID | # | Title | Pages | Objectives |
| --- | --- | --- | --- | --- |
| `tcs_ch01` | 1 | L'ensemble ℕ et notions d'arithmétique | 15–28 | 8 |
| `tcs_ch02` | 2 | Les ensembles des nombres | 29–50 | 8 |
| `tcs_ch03` | 3 | L'ordre dans ℝ | 51–72 | 6 |

Page ranges come from the printed book (reviewer, 2026-11-26). The chapter text in `data/sources/` was checked against the book by the reviewer.

| Part | Ch 1 | Ch 2 | Ch 3 |
| --- | --- | --- | --- |
| Intro: objectives, biography or history, contents | 15 | 29 | 51 |
| Activités d'introduction | 16–17 | 30–33 | 52–53 |
| Le cours (including "Pour comprendre") | 18–23 | 34–41 | 54–65 |
| Exercices résolus | 24–25 | 42–43 | 66–67 |
| Exercices | 26–28 | 44–50 | 68–72 |

Citations can show at least the part's page range now. Exact per-page numbers need page markers in the source files, which is an ingestion task.

## 2. Objectives

### Chapter 1: L'ensemble ℕ et notions d'arithmétique

| ID | Objective | Concept tags | Prerequisites |
| --- | --- | --- | --- |
| `tcs_ch01_o01` | Connaître ℕ et ℕ* | entier-naturel, ensemble-n, ensemble-n-etoile | — |
| `tcs_ch01_o02` | Diviseurs et multiples d'un entier naturel | diviseur, multiple, divisibilite | o01 |
| `tcs_ch01_o03` | Nombres pairs et impairs | parite, nombre-pair, nombre-impair | o02 |
| `tcs_ch01_o04` | Critères de divisibilité par 2, 3, 4, 5, 9 | critere-divisibilite, somme-des-chiffres | o02 |
| `tcs_ch01_o05` | Nombre premier | nombre-premier | o02 |
| `tcs_ch01_o06` | Décomposition en produit de facteurs premiers | decomposition-facteurs-premiers, facteur-premier | o04, o05 |
| `tcs_ch01_o07` | PGCD et PPCM par la décomposition | pgcd, ppcm, premiers-entre-eux | o06 |
| `tcs_ch01_o08` | PGCD par l'algorithme d'Euclide | pgcd, algorithme-euclide, division-euclidienne | o02 |

### Chapter 2: Les ensembles des nombres

| ID | Objective | Concept tags | Prerequisites |
| --- | --- | --- | --- |
| `tcs_ch02_o01` | Ensembles ℕ, ℤ, 𝔻, ℚ, ℝ; symboles ∈, ∉, ⊂, ⊄ | ensemble-z, ensemble-d, ensemble-q, ensemble-r, appartenance, inclusion | ch01_o01 |
| `tcs_ch02_o02` | Différencier les nombres; droite numérique | nombre-decimal, nombre-rationnel, nombre-irrationnel, droite-numerique | o01 |
| `tcs_ch02_o03` | Opérations dans ℝ (rappels) | operations-reels, fraction, distributivite, inverse, oppose | o01 |
| `tcs_ch02_o04` | Racines carrées | racine-carree, simplification-racine | o03 |
| `tcs_ch02_o05` | Puissances et puissances de 10 | puissance, puissance-de-10, regles-puissances | o03 |
| `tcs_ch02_o06` | Écriture scientifique | ecriture-scientifique | o05 |
| `tcs_ch02_o07` | Identités remarquables: développer, factoriser | identite-remarquable, developpement, factorisation | o03 |
| `tcs_ch02_o08` | Identités a³ − b³ et a³ + b³ | identite-cube, factorisation | o07 |

### Chapter 3: L'ordre dans ℝ

| ID | Objective | Concept tags | Prerequisites |
| --- | --- | --- | --- |
| `tcs_ch03_o01` | Comparer deux réels; ordre et opérations | ordre, comparaison, ordre-addition, ordre-multiplication, ordre-inverse, ordre-carre-racine | ch02_o03, ch02_o04 |
| `tcs_ch03_o02` | Intervalles bornés et non bornés; intersection, réunion | intervalle, intervalle-borne, intervalle-non-borne, intersection, reunion | o01, ch02_o02 |
| `tcs_ch03_o03` | Encadrement; amplitude | encadrement, amplitude, majoration, minoration | o01 |
| `tcs_ch03_o04` | Valeur absolue et propriétés | valeur-absolue | o01 |
| `tcs_ch03_o05` | Valeur absolue et distance; centre et rayon d'un intervalle | distance, centre-intervalle, rayon-intervalle | o02, o04 |
| `tcs_ch03_o06` | Approximations; calculatrice | approximation, approximation-decimale, par-defaut, par-exces, partie-entiere, calculatrice | o03, o04 |

## 3. Prerequisite graph

Cross-chapter edges: ch02_o01 → ch01_o01; ch03_o01 → ch02_o03, ch02_o04; ch03_o02 → ch02_o02. Gate 2 allows a cross-chapter citation only along these edges.

## 4. Reviewer questions

| # | Question | Decision |
| --- | --- | --- |
| 1 | Are these the three approved chapters (D-46 replaces vecteurs and fonctions)? | **Yes**: the reviewer supplied these three chapters and checked their text against the book |
| 2 | Is the objective split right (8 / 8 / 6), or should any be merged or split? | **Approved as drafted** |
| 3 | Euclid (o08) needs only o02, not the decomposition. Agree? | **Agreed** (as drafted) |
| 4 | Chapter 1, solved exercise 3 (√2 is irrational) uses PGCD and parity. Map it to `tcs_ch01_o07`, or also to `tcs_ch02_o02`? | **`tcs_ch01_o07` only** (as drafted) |
| 5 | Page ranges for each chapter | **Answered** 2026-11-26: 15–28, 29–50, 51–72, with part ranges (section 1). Chapter 3's end page was given as "28"; recorded as 72 from the part list. |
| 6 | Chapter 1, solved exercise 1 refers to "Pour comprendre page 9", but the course starts on page 18. Is that a typo in the book, or a reference to another edition? | _open_ |

## 5. Sign-off

| Role | Name | Date | Version |
| --- | --- | --- | --- |
| Drafted by | Yassine | 2026-11-26 | `coverage-v0.1-draft` |
| Reviewed and approved by (mathematics reviewer) | Yassine | 2026-11-26 | `coverage-v0.1` |
