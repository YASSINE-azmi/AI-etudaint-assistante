**Model : `deepseek-flash`** (DeepSeek-V4.1-Flash-1017)
**Provider : DeepSeek** (`https://api.deepseek.com`, OpenAI-compatible)
**Prompt version : teach-v0.1**
**Failure modes : no wrong answers in the correctness set; see notes below**

## Decision (ADR 0008 — one model per role)

| Role | Setting | Model |
| --- | --- | --- |
| Teaching (all difficulties) | `LLM_MODEL_NAME` | `deepseek-flash` |
| Photo / OCR | `VISION_MODEL_NAME` | `deepseek-flash` |

- `deepseek-flash` is the only model benchmarked, and it accepts images.
- `deepseek-v4-pro` is not used: it was not benchmarked, it does not accept images, and it costs about 3–4× more. Routing hard questions to it would be per-request routing, which ADR 0008 rules out.
- To switch later: benchmark `deepseek-v4-pro` on these same prompts, rerun the 20+20 evaluation, and record the result here.

## Failure-mode notes

API re-run on 26 November 2026, 17:58 UTC (off-peak), all 15 prompts, raw API output, default thinking mode:

- **Correctness: 15/15.** Every final answer is right; every JSON answer parses with no markdown fences.
- **Fractions are clean.** The raw API returns `\frac{25}{11}`; the `2511` in the responses below came from copying out of the chat UI, not from the model.
- **LaTeX delimiters are `\( … \)` and `\[ … \]`**, not `$ … $`. The KaTeX renderer (Gate 4b) must accept these delimiters, or the prompt must ask for another form.
- **Format drift:** prompt 12 returns `u_n = 2 × 3^(n-1)` (Unicode `×`, not LaTeX) inside a JSON string. Harmless here, but structured math must come from the typed `MathClaim` contract, not free text.
- **Thinking mode dominates tokens:** 2,478 of 3,420 output tokens (72%) are reasoning. Worst latency is 5.9 s, well under `TURN_TIMEOUT_SECONDS = 20`.
- **Not covered yet:** vision (no exercise photos tested) and the 5 prompts missing to reach 20.

1. Correctness (Multi-Step Reasoning & Nuance)
1 . Prompt: « Un train part de Paris à 14h25 et roule à une vitesse moyenne de 120 km/h pendant 2 heures et 45 minutes. Il s'arrête ensuite 18 minutes, puis parcourt encore 95 km à 114 km/h. À quelle heure exacte arrive-t-il à destination ? Donne uniquement l'heure au format HH:MM. »
Responce : «18:18»

2 . Prompt: « Résous dans $\mathbb{R}$ le système suivant : $3x - 2y = 11$ et $5x + 4y = 3$. Donne la valeur exacte du produit $x \times y$ sous forme de fraction irréductible. »
Responce : «{3x−2y=115x+4y=3​

En multipliant la première équation par 22, on obtient :
6x−4y=22
6x−4y=22

Puis en additionnant avec 5x+4y=35x+4y=3 :
11x=25⇒x=2511
11x=25⇒x=1125​

On remplace dans 3x−2y=113x−2y=11 :
3⋅2511−2y=11
3⋅1125​−2y=11
7511−2y=12111
1175​−2y=11121​
−2y=4611
−2y=1146​
y=−2311
y=−1123​

Donc :
(x,y)=(2511,−2311)
(x,y)=(1125​,−1123​)

Le produit demandé est :
xy=2511×(−2311)=−575121
xy=1125​×(−1123​)=−121575​

La fraction est irréductible.
xy=−575121
xy=−121575​​

Et la solution du système est :
(2511,−2311)
(1125​,−1123​)​
»

3 . Prompt: « Une entreprise augmente ses prix de 20 % en janvier, puis applique une réduction de 20 % en février sur les nouveaux prix. Quel est le pourcentage global de variation par rapport au prix initial ? »
Responce : «Le prix final est :

1,20×0,80=0,961,20×0,80=0,96

Soit 96 % du prix initial, donc une baisse globale de 4 % par rapport au prix initial.

Réponse : −4 % (baisse de 4 %).»

4 . Prompt: « Combien y a-t-il de nombres entiers compris strictement entre 100 et 500 qui sont divisibles à la fois par 6 et par 9 ? »
Responce : «Un nombre divisible à la fois par 6 et par 9 est divisible par leur PPCM :
ppcm(6,9)=18
ppcm(6,9)=18

Il faut donc compter les multiples de 18 strictement compris entre 100 et 500.

    Plus petit multiple > 100 : 18×6=10818×6=108

    Plus grand multiple < 500 : 18×27=48618×27=486

Il y a donc :
27−6+1=22
27−6+1=22

Réponse : 22 nombres entiers.»
5 . Prompt: « Dans une urne contenant 5 boules rouges, 4 boules bleues et 3 boules vertes, on tire 2 boules simultanément sans remise. Quelle est la probabilité d'obtenir deux boules de couleurs différentes ? Donne le résultat sous forme de fraction irréductible. »
Responce : «La probabilité d’obtenir deux boules de couleurs différentes est :
1−(52)+(42)+(32)(122)=1−10+6+366=1−1966=4766
1−(212​)(25​)+(24​)+(23​)​=1−6610+6+3​=1−6619​=6647​
4766
6647​​

La fraction est bien irréductible.»

2. Latency (Time-to-First-Token & Concise Inference)
6 . PPrompt: « Calcule $17 \times 24 - 19$. Réponds uniquement par le nombre, sans texte ni ponctuation. »
Responce : «389»
7 . Prompt: « Quel est le reste de la division euclidienne de 1047 par 13 ? Un seul nombre attendu. »
Responce : «7»
8 . Prompt: « Convertis 3,75 heures en minutes. Donne seulement le résultat numérique. »
Responce : «225»
9 . Prompt: « Quelle est la dérivée de $f(x) = 4x^3 - 7x + 2$ en $x = 2$ ? Réponse brute uniquement. »
Responce : «41»
10 . Prompt: « Trouve le plus grand diviseur commun (PGCD) de 84 et 126. Ne donne que le chiffre. »
Responce : «42»

3. JSON Reliability (Schema Adherence, Escaping & Type Safety)

11 . Prompt: « Résous l'équation quadratique $2x^2 - 5x - 3 = 0$. Renvoie uniquement un objet JSON valide (sans balises markdown) avec les clés suivantes : "discriminant" (entier), "racines" (tableau de nombres flottants triés par ordre croissant), et "est_factorisable" (booléen).  »
Responce : «{"discriminant":49,"racines":[-0.5,3.0],"est_factorisable":true}
»
12 . Prompt: « Analyse la suite numérique : 2, 6, 18, 54. Retourne strictement un JSON respectant ce schéma : {"type_suite": "arithmétique" | "géométrique", "raison": number, "terme_suivant": number, "formule_generale": string}. Aucun texte avant ou après. »
Responce : «{"type_suite":"géométrique","raison":3,"terme_suivant":162,"formule_generale":"u_n = 2 * 3^(n-1)"}»
13 . Prompt: « Extrais les données mathématiques du texte suivant en JSON valide : "L'aire d'un cercle de rayon 5 cm vaut environ 78,54 cm², tandis que son périmètre est de 31,42 cm." Clés requises : "forme" (chaîne), "rayon_cm" (nombre), "aire_cm2" (nombre avec point décimal), "perimetre_cm" (nombre avec point décimal), "volume_cm3" (null). »
Responce : «{
"forme": "cercle",
"rayon_cm": 5,
"aire_cm2": 78.54,
"perimetre_cm": 31.42,
"volume_cm3": null
}»
1 . Prompt: « Génère un tableau JSON de 3 objets représentant les triplets pythagoriciens primitifs ayant une hypoténuse inférieure à 20. Chaque objet doit contenir "a", "b", "c" (entiers avec $a < b < c$) et "description" (une phrase en français contenant obligatoirement l'apostrophe du mot "l'hypoténuse").  »
Responce : «[
{
"a": 3,
"b": 4,
"c": 5,
"description": "Le triplet (3, 4, 5) est primitif car l'hypoténuse mesure 5 et les côtés sont premiers entre eux."
},
{
"a": 5,
"b": 12,
"c": 13,
"description": "Le triplet (5, 12, 13) est primitif et l'hypoténuse vaut 13, inférieure à 20."
},
{
"a": 8,
"b": 15,
"c": 17,
"description": "Le triplet (8, 15, 17) est primitif puisque l'hypoténuse mesure 17, inférieure à 20."
}
]»
1 . Prompt: « Calcule la moyenne, la médiane et l'écart-type populationnel de la série [12, 15, 15, 20, 28]. Réponds exclusivement en JSON minifié (sur une seule ligne, sans espaces inutiles) avec les clés "moyenne", "mediane" et "ecart_type" arrondis à deux décimales.»
Responce : «{"moyenne":18.00,"mediane":15.00,"ecart_type":5.62}»

4. Cost (Token Efficiency & Reasoning Budget Control)

Measured with streaming against `https://api.deepseek.com`, `deepseek-flash`, default thinking mode. TTFT counts the first reasoning or answer token. Cost uses peak prices ($0.30 / 1M input cache-miss, $1.20 / 1M output); the run was off-peak, so the real bill is half.

| # | TTFT (s) | Total (s) | Input tok | Output tok | Of which reasoning | Cost (USD, peak) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1.45 | 2.13 | 108 | 136 | 132 | 0.000196 |
| 2 | 1.04 | 2.98 | 88 | 503 | 231 | 0.000630 |
| 3 | 1.03 | 1.83 | 75 | 150 | 38 | 0.000202 |
| 4 | 0.90 | 2.29 | 64 | 292 | 177 | 0.000370 |
| 5 | 1.18 | 2.05 | 99 | 189 | 99 | 0.000257 |
| 6 | 1.02 | 1.30 | 57 | 34 | 32 | 0.000058 |
| 7 | 1.05 | 1.39 | 56 | 52 | 50 | 0.000079 |
| 8 | 0.90 | 1.30 | 47 | 47 | 45 | 0.000070 |
| 9 | 1.08 | 1.47 | 70 | 41 | 39 | 0.000070 |
| 10 | 0.93 | 1.46 | 58 | 61 | 59 | 0.000091 |
| 11 | 1.16 | 4.18 | 121 | 229 | 203 | 0.000311 |
| 12 | 1.33 | 4.20 | 109 | 572 | 523 | 0.000719 |
| 13 | 0.89 | 1.89 | 138 | 174 | 133 | 0.000250 |
| 14 | 0.98 | 5.85 | 119 | 681 | 483 | 0.000853 |
| 15 | 0.51 | 1.89 | 114 | 259 | 234 | 0.000345 |

**Summary:** median TTFT 1.03 s (max 1.45 s); median total 1.89 s (max 5.85 s); 1,323 input + 3,420 output tokens; **$0.0045 for all 15 prompts at peak price** (about $0.0003 per prompt).

These prompts are short. A real teaching turn sends up to `MAX_TURN_INPUT_TOKENS = 8000` (retrieved chunks + instructions) and up to 1,500 output tokens, which is at most about $0.0042 per turn at peak, or roughly 1,200 turns for the $5 trial budget.
