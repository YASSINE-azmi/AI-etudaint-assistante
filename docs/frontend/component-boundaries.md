# Frontend — limites et responsabilités des composants

- **Statut :** semaine 1, état actuel + règles pour les modules à venir.
- **Responsable :** Imran.
- **Sources :** `docs/implementation-plan.md` §6.1, §7, §13, §16 ; `frontend/AGENTS.md`. En cas de conflit, le plan gagne.

## Règles transverses

1. **Texte validé uniquement.** Une réponse du tuteur n'est affichée qu'après la partie `data-message-final` du flux (§7.2). `validatedText()` dans `src/lib/sse.ts` renvoie `null` avant cela ; aucun composant ne lit les parties `text` directement.
2. **Aucun secret dans le navigateur.** Seules les trois variables `VITE_` de `src/lib/env.ts`, le seul fichier qui lit `import.meta.env`. Jamais de clé `service_role` ni de clé de fournisseur IA ; aucun appel direct à un fournisseur ni à Storage en service role.
3. **Pas de synthèse vocale (D-43)** et **pas d'écoute continue** : la voix se limite au push-to-talk vers `POST /speech/transcribe`, avec une transcription modifiable.
4. **Interface en français**, sans contenu 1BAC/2BAC.
5. **Contrat manquant = `TODO(contract)`** avec le responsable nommé. On ne devine pas une forme de réponse.

## Couche `src/lib/` (pas de React)

| Module | Rôle | Ne fait pas | État |
| --- | --- | --- | --- |
| `env.ts` | Valide `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Aucune valeur par défaut silencieuse | ✅ |
| `supabase.ts` | Client Supabase Auth créé à la première utilisation ; `getAccessToken()` | Aucun écran, aucune requête de données | Squelette |
| `http.ts` | `fetch` + URL de base, jeton Bearer, délai d'expiration, annulation, `ApiError` typé (`isNetworkError`, `messageFr`, `requestId`) | Pas de logique produit, pas de nouvel essai automatique | Squelette |
| `api.ts` | Singleton `api.get/post/put/patch/delete` + appels produit typés | N'invente aucun endpoint : seul `getMe()` existe | Squelette |
| `sse.ts` | Types du flux de tour (§7.2–7.4, annexes C et D), transport `DefaultChatTransport`, `Idempotency-Key`, `validatedText()` | Pas d'interruption (semaine 8), pas d'affichage | Squelette |

Le jeton n'est jamais transmis par les props : `http.ts` et le transport SSE l'ajoutent eux-mêmes.

## Pages (`src/pages/`)

Une page par route (§13.1). Une page compose des composants et appelle `src/lib/api.ts` ; elle ne contient ni `fetch` brut ni logique de validation.

| Route | Page | État |
| --- | --- | --- |
| `/login` | `LoginPage` (hors `AppShell`) | Écran provisoire, sans formulaire |
| `/` | `ClassroomPage` | Présentation statique des 3 chapitres |
| `/practice`, `/study-plan`, `/history` | Pages d'attente | États vides |
| `/session/:id` | `SessionPage` | Écran provisoire, aucune donnée chargée |

## Dossiers de composants à venir

| Dossier | Responsabilité | Limites | Semaine |
| --- | --- | --- | --- |
| `components/ui/` | Primitives shadcn (`pnpm dlx shadcn@latest add …`) | Aucune logique métier | Au besoin |
| `components/chat/` | Transcription, `CitationList`, `EvidenceExcerpt`, `RefusalBanner`, `GateStatus` | Affiche uniquement `validatedText()` ; citation = chapitre, section, page, extrait court, jamais un passage entier ; refus = message FR, code, actions suivantes | 2, 4–6 |
| `components/math/` | Rendu KaTeX du texte validé | Ne rend que des expressions déjà validées par le serveur ; si le rendu échoue, état d'erreur, jamais un repli en texte brut présenté comme réponse | 4 |
| `components/media/` | Enregistreur push-to-talk, arrêt de l'enregistrement < 500 ms, envoi de photo, dialogue de confirmation des symboles | Aucune écoute continue ; aucun audio brut conservé ; une photo non confirmée ne démarre jamais un tour | 7–8 |
| `components/practice/` | Exercices QCM, numérique, expression ; indices ; retour | Ne reçoit jamais `answer_schema` ; indices un par un | 9 |
| `components/planning/` | Disponibilités, planning, tâches | Fuseau `Africa/Casablanca` | 10 |
| `components/layout/` | `AppShell`, navigation, lien d'évitement | Aucun appel API | ✅ |

`components/math/` n'est pas listé au §13.2 : il est séparé de `chat/` parce que le rendu sûr des maths est une limite de sécurité distincte (Gate 4, `RENDERING_UNSAFE`). Il peut être fusionné dans `chat/` si l'équipe préfère.

## Points ouverts (`TODO(contract)`)

| Sujet | Responsable | Où dans le code |
| --- | --- | --- |
| Format d'erreur §7.6 `{ code, messageFr, requestId }` : le backend renvoie encore `{ detail }` | Mohamed | `src/lib/http.ts` |
| Casse des corps REST (`academic_track` en snake_case contre le camelCase du §7.3) ; champs de `PATCH /me` | Mohamed | `src/lib/api.ts` |
| OpenAPI des sessions, curriculum, exercices, progression, plan, médias | Mohamed | `src/lib/api.ts` |
| Forme de `gates` dans `validation.completed` | Yassine | `src/lib/sse.ts` |
| Emplacement de `refusalCode` / `nextActions` (corps du tour §7.3 ou partie `data-message-final`) | Yassine | `src/lib/sse.ts` |
| Champs obligatoires du tour (`chapterId` ?) et forme de `options` | Mohamed | `src/lib/sse.ts` |
| Noms des parties `data-*` à vérifier avec la version installée de `ai` (§21) | Mohamed + Imran | `src/lib/sse.ts` |
| Connexion e-mail : mot de passe ou lien magique | Mohamed | `src/pages/LoginPage.tsx` |
| Réponse de `GET /sessions/{id}` | Mohamed | `src/pages/SessionPage.tsx` |

Le brouillon de contrat SSE de Yassine (`docs/contracts/sse-turn-contract.md` sur `origin/pin-deepseek-models`) n'est pas encore fusionné : les types suivent le plan, et le brouillon sert seulement à signaler les questions.
