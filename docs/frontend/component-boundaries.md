# Frontend — limites et responsabilités des composants

- **Statut :** mis à jour le 26/11/2026 : auth, conversation en flux (annexe D), KaTeX, interruption côté client, médias (capture et contrôles seulement), états hors ligne et découpage par route. Les modules dont le contrat backend manque sont signalés.
- **Responsable :** Imran.
- **Sources :** `docs/implementation-plan.md` §6.1, §7, §13, §16 ; `docs/contracts/sse-turn-contract.md` ; `frontend/AGENTS.md`. En cas de conflit, le plan gagne.

## Règles transverses

1. **Texte validé uniquement.** Une réponse du tuteur n'est affichée qu'après la partie `data-message-final` du flux (§7.2). `validatedText()` dans `src/lib/sse.ts` renvoie `null` avant cela ; aucun composant ne lit les parties `text` directement.
2. **Aucun secret dans le navigateur.** Seules les trois variables `VITE_` de `src/lib/env.ts`, le seul fichier qui lit `import.meta.env`. Jamais de clé `service_role` ni de clé de fournisseur IA ; aucun appel direct à un fournisseur ni à Storage en service role.
3. **Pas de synthèse vocale (D-43)** et **pas d'écoute continue** : la voix se limite au push-to-talk vers `POST /speech/transcribe`, avec une transcription modifiable.
4. **Interface en français**, sans contenu 1BAC/2BAC. **Connexion e-mail uniquement**, ni Google ni SSO.
5. **Contrat manquant = `TODO(contract)`** avec le responsable nommé. On ne devine pas une forme de réponse.

## Couche `src/lib/` (pas de React)

| Module | Rôle | Ne fait pas | État |
| --- | --- | --- | --- |
| `env.ts` | Valide les 3 variables `VITE_` ; `isDev` | Aucune valeur par défaut silencieuse | ✅ |
| `api-types.ts` | Tous les types du contrat ; chaque champ cite sa source (backend, §, contrat SSE) | Aucun champ sans source ; colonnes serveur (`answer_schema`, `student_id`) exclues | ✅ (ressources REST en `TODO(contract)`) |
| `supabase.ts` | Client Supabase Auth créé au premier usage ; `getAccessToken()` | Aucune requête de données | ✅ |
| `auth.ts` | Connexion e-mail + mot de passe, déconnexion, fin de session rejetée, messages FR | Aucun état React | ✅ |
| `http.ts` | `fetch` + URL de base, jeton Bearer, délai, annulation, `ApiError` typé ; signale chaque 401 à l'auth | Pas de logique produit, pas de nouvel essai automatique | ✅ |
| `api.ts` | Singleton `api.get/post/put/patch/delete` + `getMe()` | N'invente aucun endpoint | ✅ (`/me` seulement) |
| `sse.ts` | Parties `data-*` du flux, transport `DefaultChatTransport` (mêmes erreurs que `http.ts`, 401 → fin de session), `Idempotency-Key`, `validatedText()`, `readTurn()` (phase, contrôles, texte validé, citations, refus, échec) | Pas d'appel à `/interrupt` (contrat absent), pas d'affichage | ✅ selon l'annexe D ; endpoint backend absent |

Le jeton n'est jamais transmis par les props : `http.ts` et le transport SSE l'ajoutent eux-mêmes.

## Authentification (`src/components/auth/`)

| Élément | Responsabilité |
| --- | --- |
| `AuthProvider` | Suit la session Supabase, puis charge `/me`. L'application attend `/me`, car son premier appel crée le profil dont dépendent les autres endpoints (§6.1). |
| `RequireAuth` | Garde de route : chargement → profil ; pas de session → `/login` (la page demandée est conservée) ; erreur `/me` → `AuthErrorScreen`. |
| `AuthErrorScreen` | 403 : « Accès refusé. », sans bouton Réessayer. Réseau : « Connexion au serveur impossible. » avec Réessayer. Autre erreur : message du serveur ou repli FR. |
| `LoginPage` | Formulaire natif e-mail + mot de passe ; erreurs FR ; avis « Votre session a expiré » quand la session a disparu sans déconnexion volontaire. |

Une session expirée a deux sources, qui donnent le même avis : Supabase refuse le renouvellement du jeton, ou l'API répond 401.

## Note de transmission auth — pour Mohamed (semaine 3)

Transmission prévue au `member-a.md` §3 (« Auth/session integration notes and 401/403 behavior »). Elle décrit ce que le frontend fait **aujourd'hui** et ce qu'il attend de l'API. Tout ce qui n'est pas écrit dans le plan ou dans le code backend est rangé dans « À confirmer » : rien n'est deviné.

### 1. Envoi du jeton Bearer

- La session est gérée par `@supabase/supabase-js` (§6.1). Le client garde la session dans le navigateur et renouvelle le jeton d'accès tout seul.
- Avant **chaque** requête, `http.ts` (`authHeaders()`) lit le jeton courant avec `supabase.auth.getSession()` et ajoute `Authorization: Bearer <access_token>`. Le jeton est relu à chaque appel et n'est jamais mis en cache par l'application.
- Sans session, l'en-tête n'est pas envoyé. Les routes protégées redirigent alors vers `/login` avant tout appel API.
- Le transport du flux de tour (`sse.ts`, utilisé par la page de séance) ajoute le même en-tête, plus `Idempotency-Key` (§7.5).
- En-têtes envoyés : `Accept: application/json`, `Content-Type: application/json` quand il y a un corps, et `Authorization`. Pas de cookie : l'API n'a pas besoin de `credentials`.
- Délai côté client : 15 s par requête REST, puis erreur `TIMEOUT`. Aucun nouvel essai automatique.

Côté backend, ce qui est vérifié aujourd'hui (`app/auth/dependencies.py`) : signature JWKS ES256/RS256, `aud=authenticated`, `iss`, et les claims `exp`, `sub`, `aud`, `iss` obligatoires. Le rôle vient de `app_metadata.role`, avec `student` par défaut.

### 2. Comportement en cas de 401 et 403

| Réponse | Où | Ce que fait le frontend |
| --- | --- | --- |
| `401` | N'importe quel appel REST | `http.ts` prévient l'auth. Le frontend ferme la session **localement** (`signOut({ scope: 'local' })`), revient à `/login` et affiche « Votre session a expiré. Reconnectez-vous. ». Pas de nouvel essai, pas de renouvellement forcé. |
| `403` | `GET /api/v1/me` | Écran « Accès refusé. » avec le message de l'erreur et un bouton « Se déconnecter ». **Pas de bouton Réessayer** : la session reste ouverte. |
| `403` | Autre endpoint | L'appelant reçoit une `ApiError` (`status: 403`). La session reste ouverte. Message de repli : « Vous n'avez pas accès à cette ressource. » |
| Réseau / délai | `GET /api/v1/me` | « Connexion au serveur impossible. » avec Réessayer. |

Le frontend traite tous les 401 de la même façon : jeton absent, invalide ou expiré (les trois `detail` actuels). Le backend n'a donc pas besoin de les distinguer pour l'interface. Côté backend, le 401 veut dire « session terminée » et le 403 « session valide, accès refusé » (§7.6). Un 401 qui ne veut pas dire « session terminée » déconnecterait l'élève.

Un 401 reçu sur le **flux de tour**, avant l'ouverture du flux, ferme la session de la même façon : le transport de `sse.ts` utilise la même gestion d'erreurs que `http.ts`.

Couverture Playwright (`e2e/auth.spec.ts`, API simulée) : session valide avec Bearer, absente, expirée et non renouvelable, 401, 403, erreur réseau suivie d'un nouvel essai, connexion, identifiants erronés, déconnexion. Le 401 sur le flux est couvert dans `e2e/chat.spec.ts`.

### 3. Pourquoi le frontend attend `/api/v1/me`

- Le plan (§6.1) dit que le premier `GET /api/v1/me` authentifié fait l'**upsert** de la ligne `profiles` (`id = sub`, e-mail, `is_synthetic = true`). Il n'y a pas de trigger sur le schéma `auth`, et les autres endpoints peuvent supposer que la ligne existe après `/me`.
- `AuthProvider` appelle donc `/me` une fois par utilisateur connecté, à la connexion ou au chargement avec une session existante. `RequireAuth` n'affiche **aucune** page protégée avant la réponse. Aucun autre appel API ne peut partir avant que le profil existe.
- Un renouvellement du jeton ou un retour sur l'onglet ne relance pas `/me` (même `sub`).
- `/me` fournit aussi l'e-mail et le rôle affichés dans l'en-tête de `AppShell`. Le rôle affiché vient de la réponse. Le frontend ne prend aucune décision d'autorisation à partir de ce rôle.

Forme lue aujourd'hui (`MeResponse` du backend, type `Me` dans `api-types.ts`) :

```json
{ "id": "…", "email": "…" | null, "role": "student" | "reviewer" | "admin", "academic_track": "TCS" }
```

### 4. Formats d'erreur gérés aujourd'hui

`http.ts` transforme toute réponse non-2xx en `ApiError { status, code, messageFr, requestId }` :

| Champ | Source, dans l'ordre |
| --- | --- |
| `code` | `code` du corps JSON (§7.6), sinon `HTTP_<status>` |
| `messageFr` | `messageFr` du corps JSON (§7.6), sinon le message de repli français selon le statut |
| `requestId` | `requestId` du corps JSON, sinon l'en-tête `X-Request-ID`, sinon `null` |

- **Corps §7.6 `{ code, messageFr, requestId }`** : lu tel quel. Le `messageFr` du serveur est affiché à l'élève.
- **Corps FastAPI actuel `{ detail }`** : accepté sans erreur, mais `detail` n'est **jamais affiché** (il est en anglais et peut révéler des détails internes). Le frontend affiche alors le message de repli.
- **Corps non JSON ou vide** : message de repli.
- Messages de repli : `401` session expirée, `403` accès refusé, `404` introuvable, `429` trop de demandes, tout autre statut « Une erreur est survenue… ».
- Échecs qui n'ont pas atteint l'API : `status: 0` avec le code `NETWORK_ERROR` ou `TIMEOUT` (codes propres au client, pas au §7.6). Une annulation voulue par l'élève (bouton Arrêter) n'est pas une erreur.
- Erreurs de connexion Supabase (`auth.ts`) : identifiants erronés, trop de tentatives, réseau, ou inconnu, toujours en français. Elles ne passent pas par l'API.

### 5. À confirmer par Mohamed

| # | Question | Pourquoi c'est bloquant ou utile |
| --- | --- | --- |
| 1 | Quand le corps d'erreur §7.6 remplacera-t-il `{ detail }`, y compris pour les 401 de `get_current_user` et les 422 de validation FastAPI ? | Sans lui, l'élève ne voit que les messages de repli génériques. |
| 2 | Ajouter `expose_headers=["X-Request-ID"]` à `CORSMiddleware` (`app/main.py`). | Le SPA (`:5173`) et l'API sont sur des origines différentes. Sans cet en-tête exposé, le navigateur cache `X-Request-ID` et la « Référence » affichée reste vide tant que le corps §7.6 n'existe pas. |
| 3 | `GET /me` renvoie aujourd'hui les claims du JWT sans écrire en base. Quand l'upsert de `profiles` (§6.1) sera-t-il branché, et la réponse changera-t-elle ? | Le frontend part du principe que les autres endpoints dépendent de cet appel. |
| 4 | Quels endpoints renverront `403`, et dans quels cas ? `/me` peut-il en renvoyer un ? | L'écran « Accès refusé » sans nouvel essai est conçu pour un refus définitif. |
| 5 | Casse des corps REST : `academic_track` (snake_case) contre le camelCase du §7.3. | Change le type `Me` et tous les types à venir. |
| 6 | `display_name` et les champs de `PATCH /api/v1/me` (§7.1). | Tâche semaine 3 « préférences de profil », en attente de l'endpoint. |
| 7 | Connexion par mot de passe (déduite de `supabase-setup.md`) plutôt que par lien magique ? Les élèves peuvent-ils s'inscrire eux-mêmes ? | Le formulaire actuel ne fait que la connexion. |

## Pages (`src/pages/`)

Une page par route (§13.1). Une page compose des composants et appelle `src/lib/api.ts` ; elle ne contient ni `fetch` brut ni logique de validation.

| Route | Page | État |
| --- | --- | --- |
| `/login` | `LoginPage` (hors `AppShell`) | ✅ Connexion e-mail |
| `/` | `ClassroomPage` | Protégée ; présentation statique des 3 chapitres |
| `/practice`, `/study-plan`, `/history` | Pages d'attente | Protégées ; états vides |
| `/session/:id` | `SessionPage` | Protégée ; envoie les tours à `POST /sessions/{id}/turns` et affiche le flux. L'historique n'est pas rechargé (`GET /sessions/{id}` sans contrat), la page le dit |
| `/dev/composants` | `ComponentFixturesPage` | Développement seulement (`env.isDev`) : route absente du build, code dans un fichier jamais chargé |

Toutes les pages sauf `/login` sont chargées à la demande (`React.lazy`) : KaTeX et le SDK IA ne sont téléchargés qu'avec la page de séance.

## Composants de chat (`src/components/chat/`)

| Composant | Entrée (contrat) | Limites |
| --- | --- | --- |
| `GateStatus` | `GateResult[]` (`validation.completed`) ou `null` pendant la validation | Validé / non validé / en cours / non évalué, en texte et pas seulement en couleur ; aucun détail interne |
| `CitationList` | `Citation[]` (§7.3) + titre du chapitre de la session | Rien si la liste est vide (refus) |
| `EvidenceExcerpt` | `quote`, `section`, `page` | Coupe à 300 caractères (§22.6) même si le serveur se trompe : jamais un passage entier |
| `RefusalBanner` | Statut éducatif ≠ `accepted`, code, `messageFr` du serveur, `nextActions` | Le texte vient toujours du serveur ; seul le titre court est côté client |
| `TurnProgress` | Phase du tour (`readTurn`) | « Envoi… », « Recherche dans le manuel… », « Vérification… » en `role="status"` |
| `TutorTurn` | Un message assistant du flux | Réponse validée (KaTeX + sources), refus, échec (Réessayer si `retryable`), interruption. Statut et code incohérents → rien du contenu n'est affiché |
| `Transcript` | Messages de `useChat` | `role="log"` ; la question de l'élève est affichée telle quelle, sans rendu maths |
| `Composer` | — | 4 000 caractères au maximum (§6.5), Ctrl + Entrée, Arrêter pendant un tour (le focus revient au champ) |
| `useTurnChat` | Identifiant de session | Une `Idempotency-Key` par question, la même pour Réessayer (§7.5) ; Arrêter arrête l'interface tout de suite, coupe le flux et fige le tour arrêté (rien de ce qu'il porte ensuite n'est affiché) ; quitter la page coupe le flux |

Les fixtures synthétiques (`src/fixtures/turns.ts`) reprennent `backend/app/assistant/turn_fixtures.py` et les modèles de `refusal.py` (les 10 codes transmis dans le flux).

## Maths (`src/components/math/`)

| Composant | Responsabilité | Limites |
| --- | --- | --- |
| `MathText` | Texte validé avec `$…$` et `$$…$$` (convention du §9.4) rendu par KaTeX, avec MathML accessible | Aucune commande « de confiance » (`\href`, `\htmlClass`…), toute erreur d'analyse ou délimiteur non fermé → état d'erreur pour tout le message ; jamais de LaTeX brut affiché comme réponse |

## Médias (`src/components/media/`) — non branchés dans la séance

| Composant | Responsabilité | Bloqué par |
| --- | --- | --- |
| `useRecorder` / `PushToTalk` | Appui pour démarrer, appui pour arrêter ; micro libéré de façon synchrone (< 500 ms, mesuré) ; refus et absence de micro en français ; l'audio n'est jamais conservé | Format de `POST /speech/transcribe` (requête et réponse) : pas de transcription modifiable |
| `PhotoPicker` | JPEG/PNG/WebP, 10 Mo au maximum (`supabase-setup.md`), aperçu, retrait | Réponses de `POST /sessions/{id}/media`, `/media/{id}/interpret` et `/confirm` : pas d'envoi ni de confirmation des symboles |

Ils ne sont visibles que sur `/dev/composants`, pour ne pas montrer à l'élève une fonction qui ne peut pas aboutir.

## Shell

- `OfflineBanner` : bandeau « Hors ligne » tant que le navigateur est hors ligne.
- Étiquette « Démo v0.1.0 · données synthétiques » visible à toutes les largeurs.
- `PageLoading` : état de chargement d'une page à la demande.

## Dossiers de composants à venir

| Dossier | Responsabilité | Limites | Semaine |
| --- | --- | --- | --- |
| `components/ui/` | Primitives shadcn | Aucune logique métier ; shadcn pas encore initialisé (voir points ouverts) | Au besoin |
| `components/practice/` | Exercices QCM, numérique, expression ; indices ; retour | Ne reçoit jamais `answer_schema` ; indices un par un | 9 |
| `components/planning/` | Disponibilités, planning, tâches | Fuseau `Africa/Casablanca` | 10 |

`components/math/` n'est pas listé au §13.2 : il est séparé de `chat/` parce que le rendu sûr des maths est une limite de sécurité distincte (Gate 4, `RENDERING_UNSAFE`). Il peut être fusionné dans `chat/` si l'équipe préfère.

## Points ouverts

### `TODO(contract)`

| Sujet | Responsable | Où dans le code |
| --- | --- | --- |
| Format d'erreur §7.6 `{ code, messageFr, requestId }` : le backend renvoie encore `{ detail }` | Mohamed | `src/lib/http.ts`, `api-types.ts` |
| `X-Request-ID` absent de `expose_headers` dans le CORS : illisible depuis le navigateur | Mohamed | `src/lib/http.ts` |
| Upsert de `profiles` au premier `/me` (§6.1) pas encore branché ; endpoints qui renverront `403` | Mohamed | `AuthProvider.tsx`, `AuthErrorScreen.tsx` |
| Casse des corps REST (`academic_track` en snake_case contre le camelCase du §7.3) ; `display_name` et champs de `PATCH /me` | Mohamed | `api-types.ts` (`Me`) |
| Corps de réponse des chapitres, objectifs, sessions, exercices, tentatives et plans d'étude : colonnes exposées, casse, types | Mohamed | `api-types.ts` |
| Enveloppe des listes paginées (noms des champs éléments et curseur) | Mohamed | `api-types.ts` (`PageQuery`) |
| Champs obligatoires du tour (`chapterId` ?) et forme de `options` | Mohamed | `api-types.ts` (`TurnFields`) |
| Noms des parties `data-*` à confirmer avec la version installée de `ai` (transport non construit) | Mohamed + Imran | `src/lib/sse.ts` |
| Délimiteurs maths de `message.final.text` (`$…$` / `$$…$$` supposés, comme le corpus §9.4) | Yassine | `src/components/math/MathText.tsx` |
| Requête et réponse de `POST /sessions/{id}/interrupt` | Mohamed | `src/components/chat/useTurnChat.ts` |
| Format de `POST /speech/transcribe` ; réponses des endpoints média | Mohamed | `src/components/media/` |
| Connexion par mot de passe (déduite de `supabase-setup.md`) plutôt que lien magique ; auto-inscription des élèves ? | Mohamed | `src/lib/auth.ts` |
| `nextActions` : libellés FR à afficher, ou identifiants à transformer en boutons ? | Yassine | `RefusalBanner.tsx` |
| Réponse de `GET /sessions/{id}` | Mohamed | `src/pages/SessionPage.tsx` |

Réglés par le contrat SSE fusionné sur `master` : forme de `gates` (`[{ gate, passed }]`), et `refusalCode` / `nextActions` transportés dans `data-message-final`.

### Décisions d'équipe

- **shadcn/ui** n'est pas initialisé : `shadcn init` ajoute des dépendances (`clsx`, `tailwind-merge`…) et réécrit les jetons de thème de `index.css`. Les écrans actuels utilisent donc Tailwind directement. À décider avant d'ajouter d'autres formulaires.
- **Taille du bundle :** pages découpées par route. Bundle initial 496 kB (145 kB compressé), surtout supabase-js ; la page de séance ajoute 191 kB (SDK IA) et KaTeX 264 kB, chargés seulement à son ouverture.
