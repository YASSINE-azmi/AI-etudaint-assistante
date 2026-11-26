# Matrice E2E Playwright — plan de test

- **Statut :** plan de la semaine 2 (`member-a.md`), révisé le 26/11/2026. La liste des 10 parcours et des 20 interruptions est une **proposition à valider** par Yassine et Mohamed (voir « Validation de l'équipe »).
- **Sources :** plan §2.6, §7.1–§7.5, §13.3, §13.4, §16, §17.1 ; `docs/contracts/sse-turn-contract.md` (sur `master`) ; ADR 0003 ; `docs/team/member-a.md`.
- Le plan fixe les **nombres** (10 parcours, 20 interruptions), le **critère de réussite** et les **thèmes**. Il n'énumère pas les cas : leur liste exacte est une décision d'équipe, pas un contrat.

## Statuts

| Statut | Sens |
| --- | --- |
| **Implémenté** | Le test existe dans `frontend/e2e/` et passe. |
| **Bloqué : backend** | Le test attend un endpoint ou un contrat qui n'existe pas encore. Il ne sera pas écrit avant. |
| **Bloqué : frontend** | L'endpoint existe ou est défini, mais l'écran ou le composant n'est pas construit. |
| **À valider** | Le cas, son résultat attendu ou sa mesure dépend d'une décision d'équipe (voir la dernière section). |

**État du backend au 26/11 :** seuls `GET /health`, `GET /ready` et `GET /api/v1/me` existent. Tous les autres endpoints du §7.1 et le flux SSE sont à venir.

## Deux niveaux (§13.4)

| Niveau | Quand | Backend | Compte pour 10/10 et 20/20 ? |
| --- | --- | --- | --- |
| **UI** | Chaque PR | Aucun. Playwright intercepte les routes et renvoie des réponses **conformes à un contrat écrit** (plan, OpenAPI, contrat SSE). | Non pour les parcours. Pour les interruptions, voir V1. |
| **Full-stack** | Job d'intégration | Postgres seedé + adaptateur fournisseur factice (§13.4) | Oui |

Règles du niveau UI :
- Une simulation reproduit **seulement** une réponse dont la forme est écrite dans un contrat. Pas de contrat, pas de test simulé : la ligne reste « Bloqué : backend ».
- Un test simulé ne prouve pas l'intégration. Il est toujours compté à part des parcours full-stack.

Le niveau full-stack n'a encore ni configuration Playwright ni job CI. `playwright.config.ts` ne lance que Vite. Voir V7.

## Tests existants (niveau UI, 58 tests)

Ils passent sous Chromium et sous Microsoft Edge (`PLAYWRIGHT_CHANNEL=msedge`).

| Suite | Contenu | Fichier |
| --- | --- | --- |
| Smoke (6) | Shell et 3 chapitres, navigation active, `/session/:id`, 404, étiquette de démo sur mobile, grille des chapitres sur tablette et bureau, bandeau hors ligne | `e2e/smoke.spec.ts` |
| Auth (9) | Session absente, valide (Bearer sur `/me`), expirée et non renouvelable, 401 API, 403, erreur réseau + Réessayer, connexion avec retour à la page demandée, identifiants invalides, déconnexion | `e2e/auth.spec.ts` |
| Composants (8) | `GateStatus`, `CitationList`, `EvidenceExcerpt` coupé à 300 caractères, **les 10 codes de refus et d'échec du flux**, KaTeX (en ligne, bloc, MathML), maths non sûres ou invalides → état d'erreur | `e2e/components.spec.ts` |
| Accessibilité (8) | Ordre de tabulation et focus visible (connexion, shell), bordures des champs à 3:1, erreur reliée aux champs, lien d'évitement, focus et titre à chaque changement de route | `e2e/accessibility.spec.ts` |
| Conversation (13) | Bearer + `Idempotency-Key` UUID + corps réduit au `prompt` ; états d'envoi, de recherche et de vérification ; aucun texte avant `data-message-final` ; réponse validée avec KaTeX et sources ; refus hors programme et preuve insuffisante ; échec réessayable (même clé) et non réessayable ; nouvelle clé par question ; maths non sûres dans une réponse ; 429, 409 et erreur réseau avant le flux ; 401 sur le flux → fin de session ; limite de 4 000 caractères | `e2e/chat.spec.ts` |
| Interruption (8 tests, 11 cas) | Voir la section des 20 cas | `e2e/interruption.spec.ts` |
| Médias (6) | Push-to-talk : enregistrement, micro libéré en moins de 500 ms, micro refusé, micro absent. Photo : aperçu et retrait, format refusé, plus de 10 Mo refusé | `e2e/media.spec.ts` |

Supabase Auth et `/api/v1/me` sont simulés par `e2e/support/auth.ts`, qui suit la forme réelle de `MeResponse`. Le flux de tour est simulé par `e2e/support/turn-stream.ts`, **strictement selon l'annexe D et le contrat SSE**. Il est remplacé dans la page (et non par `route.fulfill`) pour pouvoir envoyer les parties une à une.

## 10 parcours scénarisés (full-stack)

Critère commun (§2.6) : le parcours **se termine, est sauvegardé et se recharge**. Chaque parcours finit donc par un rechargement de la page, et la vérification que seul le contenu validé réapparaît.

| # | Parcours | Endpoints requis | Semaine | Statut |
| --- | --- | --- | --- | --- |
| J1 | Connexion e-mail → `/me` crée le profil → classe → déconnexion → reconnexion : même profil | `GET /me` avec upsert de `profiles` (§6.1) | 3 | **Bloqué : backend** (upsert non branché). La version simulée est déjà couverte par `auth.spec.ts`. |
| J2 | Créer une session → question texte → réponse validée avec citations (chapitre, section, page, extrait court) → recharger → reprendre | `POST/GET /sessions`, `GET /sessions/{id}`, `POST /sessions/{id}/turns` (SSE) | 4–6 | **Bloqué : backend** |
| J3 | Question de 1BAC/2BAC → refus `OUT_OF_SCOPE_LEVEL` : message FR du serveur, code, actions suivantes, aucune citation → recharger : le refus est conservé | Sessions + SSE | 6 | **Bloqué : backend** |
| J4 | Question sans preuve dans le corpus → refus `INSUFFICIENT_EVIDENCE` → recharger | Sessions + SSE | 6 | **Bloqué : backend** |
| J5 | Question ambiguë → `AMBIGUOUS_QUESTION` (`clarification_required`) → l'élève précise → réponse validée → recharger : les deux tours | Sessions + SSE | 6 | **Bloqué : backend** ; **À valider** (V3) |
| J6 | Photo → aperçu → `interpret` → confirmation des symboles ambigus → tour avec `mediaAssetId` + `confirmedExpression` → recharger | `POST /sessions/{id}/media`, upload Storage, `POST /media/{id}/interpret`, `POST /media/{id}/confirm`, SSE | 7 | **Bloqué : backend** |
| J7 | Push-to-talk → `/speech/transcribe` → transcription modifiée par l'élève → envoi → réponse validée → recharger : aucun audio conservé | `POST /speech/transcribe`, SSE | 7 | **Bloqué : backend** |
| J8 | Exercice : un indice → tentative → retour `correct`, `incorrect` ou `inconclusive` → recharger : la tentative persiste, `answer_schema` jamais reçu | `GET /exercises`, `GET /exercises/{id}`, `POST …/hints`, `POST …/attempts`, `GET /progress` | 9 | **Bloqué : backend** |
| J9 | Plan d'étude : disponibilités (`Africa/Casablanca`) → planning → tâche terminée ou passée → recharger | `GET/PUT /study-plan`, `PATCH /study-tasks/{id}` | 10 | **Bloqué : backend** |
| J10 | Crédits épuisés → `turn.failed` `CREDIT_EXHAUSTED` : aucun texte de réponse, écran de repli FR → recharger | SSE + budget (§7.2) | 8–11 | **Bloqué : backend** ; **À valider** (V4) |

**Rendus couverts ailleurs et non comptés dans les 10** (rendu des refus au niveau UI, §13.4) : `MATH_INCORRECT`, `MATH_UNVERIFIABLE`, `RENDERING_UNSAFE`, `SOURCE_WITHDRAWN`, `PROVIDER_UNAVAILABLE`, et les réponses HTTP `429 RATE_LIMITED` / `409 TURN_LIMIT_REACHED`. Voir V2 pour savoir si l'un d'eux doit remplacer un parcours.

## 20 cas d'interruption

Critère commun (§2.6, §13.3) : en moins de 500 ms, l'enregistrement et l'interface sont arrêtés. Ensuite le flux est annulé, `POST /sessions/{id}/interrupt` est appelé, les événements d'un `turnId` périmé sont rejetés, et aucun tour n'est dupliqué.

Côté frontend, sont construits et testés : le bouton Arrêter (interface arrêtée en moins de 500 ms, mesuré), l'annulation du flux, le tour arrêté figé, la coupure du flux quand on quitte la page, et le micro libéré en moins de 500 ms.

Ce qui manque à **tous** les cas pour respecter le critère complet :
- `POST /sessions/{id}/interrupt` n'est pas appelé : sa requête et sa réponse ne sont pas définies (V5).
- Le rejet des `turnId` périmés côté serveur n'existe pas (endpoint absent).

« Partiel (UI) » veut dire : le cas passe contre le flux simulé selon l'annexe D, sans `/interrupt`. Il n'est pas compté dans les 20/20. Les noms des parties `data-*` restent à confirmer par Mohamed avec la version installée de `ai`.

| # | Moment de l'arrêt / scénario | Niveau | Prérequis propres | Statut |
| --- | --- | --- | --- | --- |
| I1 | Avant `turn.started` (requête envoyée, aucune réponse) | UI | — | **Partiel (UI)** : < 500 ms mesuré, flux annulé |
| I2 | Après `turn.started` | UI | — | **Partiel (UI)** |
| I3 | Après `retrieval.completed` | UI | — | **Partiel (UI)** |
| I4 | Après `validation.started` | UI | — | **Partiel (UI)** ; renvoyer aussitôt une question fonctionne |
| I5 | Après `validation.completed`, avant `message.final` : aucun texte affiché | UI | — | **Partiel (UI)** |
| I6 | Entre `text-delta` et `data-message-final` : le texte reçu n'est **jamais** affiché (`validatedText()` renvoie `null`) | UI | — | **Partiel (UI)** |
| I7 | Entre `message.final` et `turn.completed` | UI | Résultat attendu à définir | **Partiel (UI)** : la réponse validée reste affichée ; **À valider** (V5) |
| I8 | Après `turn.completed` : l'arrêt n'efface pas une réponse validée | UI | Réponse de `/interrupt` sans tour actif | Bloqué : backend ; **À valider** (V5). Le bouton Arrêter n'existe plus après `turn.completed`. |
| I9 | Nouvel envoi, puis événements tardifs de l'ancien `turnId` : ignorés | UI | — | **Partiel (UI)** : le flux arrêté n'accepte plus rien, le tour reste figé |
| I10 | Double clic sur Arrêter : un seul appel `/interrupt` | UI | — | **Partiel (UI)** : une seule annulation ; `/interrupt` absent |
| I11 | Arrêt pendant un enregistrement push-to-talk : `MediaRecorder` arrêté en moins de 500 ms, rien n'est envoyé | UI | Push-to-talk dans la séance | **Partiel** : micro libéré en < 500 ms (`media.spec.ts`), mais le push-to-talk n'est pas dans la séance (transcription absente) ; **À valider** (V6) |
| I12 | Arrêt pendant l'envoi à `/speech/transcribe` : requête annulée, aucune transcription insérée | UI | `/speech/transcribe` | Bloqué : backend ; **À valider** (V8) |
| I13 | Arrêt pendant `POST /media/{id}/interpret` | UI | Endpoints média | Bloqué : backend ; **À valider** (V8) |
| I14 | `/interrupt` en échec réseau : l'interface s'arrête quand même, message FR | UI | Format d'erreur de `/interrupt` | Bloqué : backend |
| I15 | Coupure réseau pendant le flux, puis reconnexion : pas de tour dupliqué | Full-stack | Idempotence (§7.5) | Bloqué : backend |
| I16 | Nouvel essai avec la même `Idempotency-Key` après une interruption | Full-stack | §7.5 : comportement d'une clé `cancelled` | Bloqué : backend ; **À valider** (V9) |
| I17 | Changement de route pendant un tour actif : flux annulé, `/interrupt` appelé | UI | — | **Partiel (UI)** : flux annulé |
| I18 | Rechargement pendant un tour : l'historique ne montre que les tours validés | Full-stack | `GET /sessions/{id}` : place des tours `cancelled` | Bloqué : backend ; **À valider** (V9) |
| I19 | Arrêt au clavier seul : focus conservé, annonce `role="status"` | UI | — | **Partiel (UI)** : Entrée sur Arrêter, focus rendu au champ, annonce |
| I20 | Interruption d'un tour avec photo confirmée, puis renvoi : pas de nouvelle confirmation demandée | Full-stack | Endpoints média + SSE | Bloqué : backend |

**Bilan des interruptions :** 0/20 au critère complet. 12 sont « Partiel (UI) » : I1–I7, I9, I10, I11, I17, I19. Il reste 8 cas bloqués : I8, I12–I14, I15, I16, I18, I20. 7 cas attendent aussi une décision d'équipe.

## Autres suites exigées (§13.4, §17.1) — comptées à part

| Suite | Niveau | Statut |
| --- | --- | --- |
| Rendu des refus (tous les codes du contrat SSE) | UI | **Implémenté** : les 10 codes du flux (`components.spec.ts`), refus et échecs reçus par flux, 429 et 409 avant le flux (`chat.spec.ts`) |
| Passage complet au clavier seul (§2.6) | UI puis full-stack | **Partiel** : connexion, shell, envoi (Ctrl + Entrée) et arrêt au clavier. Le parcours complet attend la création de session, la photo et les exercices. |
| Isolation entre deux utilisateurs dans l'interface (sortie de la semaine 3) | Full-stack | **Bloqué : backend** : il faut les endpoints de sessions (semaine 4) et deux utilisateurs seedés. Les tests RLS backend du §22.4 restent la preuve principale. |
| Confirmation de photo (photo non confirmée ⇒ aucun tour) | Full-stack | Bloqué : backend (semaine 7) |
| Tentative d'exercice | Full-stack | Bloqué : backend (semaine 9) |
| Sauvegarde / reprise de session | Full-stack | Bloqué : backend (semaine 4) |
| Repli en cas de crédits épuisés | Full-stack | Bloqué : backend. Recoupe J10 (V4). |
| Permissions du micro (accordée, refusée, absente) | UI | **Implémenté** (`media.spec.ts`) |

## Validation de l'équipe

| # | Question | Responsable | Bloque |
| --- | --- | --- | --- |
| V1 | Les 20/20 interruptions peuvent-elles compter au **niveau UI** (flux simulé selon le contrat), comme le §13.4 le laisse entendre ? Ou chaque cas doit-il aussi passer en full-stack ? | Équipe + encadrant | I1–I20 |
| V2 | La liste J1–J10 convient-elle ? Un refus de Gate 4 (`MATH_INCORRECT` / `RENDERING_UNSAFE`) ou `PROVIDER_UNAVAILABLE` doit-il remplacer un parcours, par exemple J1 qui recoupe les tests d'auth ? | Yassine | J1–J10 |
| V3 | J5 : après `AMBIGUOUS_QUESTION`, la précision de l'élève est-elle un **nouveau tour** de la même session, sans état particulier côté serveur ? | Yassine + Mohamed | J5 |
| V4 | J10 : comment provoquer `CREDIT_EXHAUSTED` de façon fiable dans le job seedé (budget à zéro dans le seed ?) ; texte de l'écran de repli | Mohamed | J10 |
| V5 | `TODO(contract)` : réponse de `/interrupt` (statut, corps), son effet quand le tour est déjà terminé (I7, I8), et code renvoyé pour un `turnId` périmé | Mohamed | I7, I8, I14 |
| V6 | Mesure des 500 ms : du clic jusqu'à quel signal ? Événement `stop` du `MediaRecorder`, ou interface marquée « arrêtée » ? | Imran, à valider avec l'encadrant | I1–I20 |
| V7 | Infrastructure full-stack : qui fournit le seed (deux élèves synthétiques, chapitres publiés, exercices), l'adaptateur fournisseur factice et le job CI ? | Mohamed (+ Yassine pour le contenu) | Tous les J, I15, I16, I18, I20 |
| V8 | Arrêter pendant `/speech/transcribe` ou `/media/{id}/interpret` (hors tour) : faut-il seulement annuler la requête, ou aussi appeler `/interrupt` ? | Mohamed | I12, I13 |
| V9 | Tours `cancelled` : apparaissent-ils dans `GET /sessions/{id}` ? Une `Idempotency-Key` dont le tour a été annulé peut-elle être réutilisée (§7.5 ne traite que `completed`, `processing` et `failed`) ? | Mohamed | I16, I18 |
