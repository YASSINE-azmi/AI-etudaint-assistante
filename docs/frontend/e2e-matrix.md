# Matrice E2E Playwright — proposition

- **Statut :** proposition de semaine 1, à valider par Yassine et Mohamed. Aucun de ces tests n'est écrit, sauf la ligne « smoke ».
- **Sources :** plan §2.6, §7, §13.3, §13.4, §16 ; `docs/team/member-a.md`.
- Le plan fixe les **nombres** (10 parcours, 20 cas d'interruption) et les **thèmes**, mais n'énumère pas les cas. La liste ci-dessous est donc une proposition, pas un contrat.

## Deux niveaux (§13.4)

| Niveau | Quand | Backend | Contenu |
| --- | --- | --- | --- |
| **UI** | Chaque PR | Aucun : l'API est simulée par interception de routes Playwright | Mise en page, contrôle des variables d'environnement, rendu des refus, navigation clavier, interruption d'un flux simulé |
| **Full-stack** | Job d'intégration | Postgres seedé + adaptateur fournisseur factice | Parcours scénarisés, confirmation de photo, exercice, sauvegarde/reprise, épuisement des crédits |

## Existant

| Test | Niveau | Fichier |
| --- | --- | --- |
| Shell, chapitres, navigation active, pages `/login` et `/session/:id` provisoires, 404 | UI | `frontend/e2e/smoke.spec.ts` |

## 10 parcours scénarisés (proposition)

Critère commun (§2.6) : le parcours se termine, est sauvegardé et se recharge.

| # | Parcours | Niveau | Dépend de | Semaine |
| --- | --- | --- | --- | --- |
| J1 | Connexion e-mail → `/me` → classe | Full-stack | Contrat login | 3 |
| J2 | Créer une session → question texte → réponse validée avec citations → recharger → reprendre | Full-stack | Sessions + SSE | 4–6 |
| J3 | Question hors programme → refus `OUT_OF_SCOPE_LEVEL` avec message FR et actions suivantes | Full-stack | SSE | 6 |
| J4 | Preuve insuffisante → refus `INSUFFICIENT_EVIDENCE` | Full-stack | SSE | 6 |
| J5 | Question ambiguë → demande de clarification → réponse | Full-stack | SSE | 6 |
| J6 | Photo → aperçu → interprétation → confirmation des symboles → tour | Full-stack | Contrat média | 7 |
| J7 | Push-to-talk → transcription modifiable → envoi → réponse validée | Full-stack | `/speech/transcribe` | 7 |
| J8 | Exercice : indice → tentative → retour `correct` / `incorrect` / `inconclusive` | Full-stack | Exercices | 9 |
| J9 | Plan d'étude : disponibilités → planning → tâche terminée ou passée | Full-stack | Plan d'étude | 10 |
| J10 | Crédits épuisés → `CREDIT_EXHAUSTED`, aucun texte, écran de repli | Full-stack | Budget | 8–11 |

Suites séparées du §13.4, à compter à part : rendu des refus (niveau UI), un passage complet au clavier seul (§2.6 accessibilité), sauvegarde/reprise.

## 20 cas d'interruption (proposition)

Critère commun (§2.6, §13.3) : enregistrement et interface arrêtés en < 500 ms, flux annulé, `POST /sessions/{id}/interrupt` appelé, événements d'un `turnId` périmé rejetés, aucun tour en double.

| # | Moment de l'arrêt / scénario | Niveau |
| --- | --- | --- |
| I1 | Avant `turn.started` (requête envoyée, aucune réponse) | UI |
| I2 | Après `turn.started` | UI |
| I3 | Après `retrieval.completed` | UI |
| I4 | Après `validation.started` | UI |
| I5 | Après `validation.completed`, avant `message.final` | UI |
| I6 | Pendant la réception du `text-delta` unique | UI |
| I7 | Entre `message.final` et `turn.completed` | UI |
| I8 | Après `turn.completed` : l'arrêt n'efface pas une réponse déjà validée | UI |
| I9 | Événements tardifs de l'ancien `turnId` après un nouvel envoi : ignorés | UI |
| I10 | Double clic sur Stop : un seul appel `/interrupt` | UI |
| I11 | Stop pendant un enregistrement push-to-talk : enregistrement arrêté < 500 ms, aucun envoi | UI |
| I12 | Stop pendant l'envoi de la transcription (`/speech/transcribe`) | UI |
| I13 | Stop pendant l'interprétation d'une photo | UI |
| I14 | `/interrupt` en échec réseau : interface arrêtée quand même, message FR | UI |
| I15 | Coupure réseau pendant le flux, puis reconnexion : pas de tour dupliqué | Full-stack |
| I16 | Nouvel essai avec la même `Idempotency-Key` après interruption | Full-stack |
| I17 | Changement de route pendant un tour actif | UI |
| I18 | Rechargement de la page pendant un tour : l'historique ne montre que les tours validés | Full-stack |
| I19 | Arrêt au clavier seul (focus et annonce `role="status"`) | UI |
| I20 | Interruption pendant un tour de photo confirmée : pas de nouvelle demande de confirmation | Full-stack |

## Questions à trancher avec l'équipe

- La liste des 10 parcours et des 20 cas convient-elle ? (Yassine pour refus et validation, Mohamed pour SSE, idempotence et `/interrupt`)
- TODO(contract) : comportement attendu de `/interrupt` quand le tour est déjà terminé (I8), et code renvoyé pour un `turnId` périmé. Responsable : Mohamed.
- À décider : mesure des 500 ms : du clic jusqu'à quel signal (fin du `MediaRecorder`, état de l'interface) ? Responsable : Imran, à valider avec l'encadrant.
