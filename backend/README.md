# LowkeySports Backend

API starter pour une plateforme de prédictions sportives (sans pari) avec authentification, utilisateurs et profils sportifs.

## Setup

1. Copy `.env.example` to `.env`
2. Fill in your PostgreSQL connection values
3. Install dependencies with `npm install`
4. Run migrations with `npm run migrate`
5. Start the app with `npm run dev`

## Scripts

- `npm run dev` : démarre le serveur
- `npm run start` : alias de `dev`
- `npm run test` : lance les tests unitaires
- `npm run typecheck` : vérification de types TypeScript
- `npm run migrate` : applique les migrations en attente

## Environment variables

- `JWT_SECRET`: secret de signature JWT (obligatoire en production)
- `PORT`: port API (défaut `3000`)
- `DB_USER`
- `DB_HOST`
- `DB_NAME`
- `DB_PASSWORD`
- `DB_PORT`
- `NODE_ENV`: `production` désactive le fallback du secret JWT
- `ADMIN_EMAIL` + `ADMIN_PASSWORD` : créent ou promeuvent un administrateur (voir ci-dessous)
- `ADMIN_EMAILS`: liste d'emails séparés par des virgules autorisés à devenir administrateurs. Un compte inscrit avec l'un de ces emails obtient le rôle `admin` à l'inscription, et tout compte existant est automatiquement promu `admin` à sa prochaine connexion.
- `DEVELOPER_EMAILS`: liste d'emails séparés par des virgules autorisés à devenir **developers** (mêmes règles de promotion automatique, prioritaires sur `ADMIN_EMAILS`). Le developer hérite de tous les accès admin et bénéficie en plus du changement de mot de passe et de l'impersonation. Ce rôle ne peut pas être attribué manuellement via l'API/interface.
- `OWNER_EMAILS`: liste d'emails séparés par des virgules autorisés à devenir **owners** (prioritaires sur `DEVELOPER_EMAILS`) avec exactement les mêmes pouvoirs que le developer.
- `DISCORD_BOT_TOKEN` : (optionnel) **lance le bot Discord**. Il se connecte (gateway), enregistre ses commandes slash (`/bilan`, `/matchs`, `/aide`) et active trois automatisations :
  1. la publication d'une analyse (`status = published`) → message dans le canal du sport concerné, dans la catégorie `PRONOSTIC_CATEGORY_ID` (fichiers `src/services/discordBot.ts`) ; les canaux de baseball/basketball/american_football/tennis sont fixes, les autres (soccer, hockey) sont créés automatiquement dans la catégorie ; gère canaux classiques et forums ;
  2. un verdict de fin de match (score + gagné/perdu par analyse) posté sur le canal du sport dès qu'un match se termine ;
  3. les commandes slash répondent aux questions courantes (bilan des experts, prochains matchs).
  Si le token est absent, rien n'est démarré et toutes les publications Discord sont simplement ignorées.
- `DISCORD_COMMANDS_GUILD_ID` : (optionnel) force l'enregistrement des commandes slash sur ce serveur Discord. Par défaut, le bot utilise le serveur de `PRONOSTIC_CATEGORY_ID` ; sans catégorie ni valeur, il enregistre les commandes en global (jusqu'à 1 h de propagation).

## Lancer le bot Discord

1. Crée une application sur le [portail développeur Discord](https://discord.com/developers/applications) et un **bot** avec le token correspondant.
2. Invite le bot sur ton serveur avec les scopes `bot` et `applications.commands`, et les permissions : envoyer des messages, créer des threads, lire l'historique.
3. Copie la valeur du token dans `backend/.env` en `DISCORD_BOT_TOKEN=ton_token`.
4. (Recommandé) Vérifie que la catégorie de pronostics existe avec l'ID `1529977038449017015` sur ton serveur (`PRONOSTIC_CATEGORY_ID` dans `src/services/discordBot.ts`), ou affecte `DISCORD_COMMANDS_GUILD_ID=id_du_serveur`.
5. Démarre l'API avec `npm run dev`. Le bot se connecte automatiquement au démarrage — tu verras `Bot Discord connecté en tant que …` dans les logs, et les commandes slash seront enregistrées.

Commandes disponibles :

| Commande | Description |
| --- | --- |
| `/bilan [expert]` | Bilan des experts : victoires / défaites, % de réussite et confiance moyenne (filtre par nom si précisé) |
| `/matchs [sport]` | Les prochains matchs à venir, avec date/heure (filtre sport optionnel) |
| `/aide` | Liste des commandes |
| `/kick <membre> [raison]` | Exclure un membre (permission `KickMembers`) |
| `/ban <membre> [raison] [supprimer_messages]` | Bannir un membre, avec option de purge des messages (permission `BanMembers`) |
| `/unban <id>` | Retirer un bannissement (permission `BanMembers`) |
| `/timeout <membre> <duree> [raison]` | Timeout en minutes, max 40320 (28 j) (permission `ModerateMembers`) |
| `/clear <nombre>` | Supprimer les derniers messages du canal, 1 à 100 (permission `ManageMessages`) |
| `/role attribuer\|retirer <membre> <role>` | Attribuer ou retirer un rôle (permission `ManageRoles`) |

Les commandes de modération respectent la hiérarchie des rôles : impossible de modérer soi-même, le bot, ou une personne de rôle égal/supérieur au sien. Si une permission manque au bot, la commande l'indique au lieu d'échouer en silence.

Le bot est pensé pour être **l'unique bot de modération** du serveur : tout se pilote par commandes slash, avec réponses éphémères (visibles uniquement par celui qui les lance).

Pour ajouter une commande : crée le `SlashCommandBuilder` dans `src/discord/bot.ts`, ajoute-le à `COMMANDS`, puis implémente `handleXxx` et référence-le dans `handleCommand`. Il suffit de redémarrer le serveur pour que la commande soit ré-enregistrée.

## Créer un compte administrateur

```
# backend/.env
ADMIN_EMAIL=ton@email.com
ADMIN_PASSWORD=un_mot_de_passe_fort

npm run create:admin
```

Le script crée l'utilisateur avec le rôle `admin` s'il n'existe pas, ou promeut l'utilisateur existant.

## Migration

Les migrations sont versionnées dans `src/database/migrations/` (fichiers `.sql` numérotés). `npm run migrate` n'applique que les fichiers pas encore enregistrés dans la table `schema_migrations`, chaque migration étant exécutée dans une transaction.

## API routes

### Auth

- `POST /api/auth/register` — `{ username, email, password }` → renvoie `user`, `accessToken`, `refreshToken`
- `POST /api/auth/login` — `{ email, password }` → renvoie `user`, `accessToken`, `refreshToken`
- `POST /api/auth/refresh` — `{ refreshToken }` → rotation : renvoie une nouvelle paire `accessToken`/`refreshToken`
- `POST /api/auth/logout` — `{ refreshToken }` → révoque le refresh token (204)
- `POST /api/auth/logout-all` (auth) → révoque tous les refresh tokens du compte (204)
- `POST /api/auth/impersonate` (developer) — `{ userId }` → ouvre une session (paire de tokens) en tant que l'utilisateur cible
- `PATCH /api/auth/password` (auth) — `{ currentPassword, newPassword }` → change le mot de passe du compte connecté et révoque tous ses refresh tokens

### Users

- `GET /api/users` (admin)
- `GET /api/users/:id` (profil personnel ou admin)
- `PATCH /api/users/:id/role` (admin) — `{ role: "user" | "expert" | "admin" }` (le rôle `developer` n'est pas assignable)
- `PATCH /api/users/:id/password` (developer) — `{ password }` → change le mot de passe d'un utilisateur

### Players

- `POST /api/players/` (auth)
- `GET /api/players/me` (auth)
- `PUT /api/players/me` (auth)
- `DELETE /api/players/me` (auth)

### Matches

- `GET /api/matches` (public) — matchs à venir par défaut ; filtres `?status=scheduled|live|finished|cancelled` et `?sport=`
- `GET /api/matches/:id` (public) — détail ; inclut `myPrediction` si connecté, ainsi que `home_form`, `away_form` (5 derniers matchs de chaque équipe) et `head_to_head` (5 derniers affrontements)
- `POST /api/matches` (admin) — `{ sport, competition?, homeTeam, awayTeam, scheduledAt }`
- `PATCH /api/matches/:id` (admin) — modifier un match non commencé
- `POST /api/matches/:id/result` (admin) — `{ homeScore, awayScore }` : termine le match, calcule le vainqueur et crédite les points

### Predictions

- `POST /api/predictions` (auth) — `{ matchId, pick: "home" | "away" | "draw" }` (un seul par match, avant le début)
- `GET /api/predictions/me` (auth) — ses prédictions avec infos du match
- `PUT /api/predictions/:id` (auth, propriétaire) — modifie le pick tant que le match n'a pas commencé
- `DELETE /api/predictions/:id` (auth, propriétaire)
- `GET /api/predictions/leaderboard` (public) — classement des membres : points, victoires/défaites et % de réussite sur les pronostics évalués

### Articles (contenu éditorial)

- `GET /api/articles` (public) — analyses publiées ; filtres `?sport=` et `?matchId=`
- `GET /api/articles/leaderboard` (public) — bilan des experts : analyses terminées, gagné/perdu, % de réussite et **confiance moyenne** (`avg_confidence`, `null` si aucune analyse renseignée)
- `GET /api/articles/:id` (public ; brouillons visibles par l'admin et l'auteur)
- `POST /api/articles` (admin/expert) — `{ matchId, title, content, pick, status: "draft" | "published", confidence?: 1..5 }` ; une publication déclenche le message Discord
- `PUT /api/articles/:id` (admin ou auteur expert) — modifie le brouillon/l'analyse d'un match **à venir** : `{ title?, content?, pick?, status?, confidence? }` ; le passage brouillon → publié déclenche le message Discord
- `DELETE /api/articles/:id` (admin)

> **Confiance** : un niveau de `confidence` (entier 1 à 5, optionnel) exprime le degré de certitude de l'analyse. Affiché sur les cartes et la fiche d'analyse, il est éditable tant que le match n'est pas terminé.
>
> **Modification** : une analyse peut être modifiée par son auteur (expert) ou un admin **uniquement si le match n'a pas encore commencé**. Une fois le match terminé, seule la suppression reste possible.

### Synchro de données sportives (ESPN)

- `POST /api/sync/matches` (admin) — importe les matchs à venir des ligues configurées ; body optionnel `{ days }` (fenêtre en jours, défaut 14), sinon la liste `src/config/leagues.ts` est utilisée
- `POST /api/sync/results` (admin) — force la vérification des résultats des jours précédents et termine les matchs terminés depuis ESPN (utile pour le bouton « Vérifier les matchs terminés » du panneau admin)

Les matchs importés proviennent de l'API publique ESPN (`site.api.espn.com`) et sont identifiés par `provider` + `provider_event_id` (unique), la synchro est donc idempotente. Chaque ligue configurée référence la catégorie du site (`soccer`, `american_football`, `basketball`, `tennis`, `baseball`, `hockey`).

### Résultats automatiques (ESPN)

Un job en arrière-plan (`src/services/resultsSync.ts`) interroge périodiquement ESPN pour les matchs des jours précédents et **termine automatiquement** les matchs `scheduled` dont l'événement ESPN est passé à l'état `post` (final). Il met à jour `status`, `home_score`, `away_score`, `winner` et **crédite les points** aux prédictions (`gagné` / `perdu`). Pour chaque match terminé, un **verdict** (score + résultat par analyse publiée) est posté sur le canal Discord du sport si le bot est configuré.

La correspondance se fait d'abord par `provider_event_id` (ESPN), puis, si aucun match ne correspond, par **noms d'équipes** (`sport` + `home_team` + `away_team`) — ce qui permet de finaliser aussi les matchs créés manuellement sans identifiant ESPN valide.

- Intervalle par défaut : **15 minutes**, configurable via `RESULTS_SYNC_INTERVAL_MS`.
- Un premier passage a lieu ~10 s après le démarrage du serveur.
- Bouton manuel « Vérifier les matchs terminés » dans le panneau admin (`POST /api/sync/results`).

## Scoring

Chaque prédiction correcte rapporte **1 point** (0 sinon). Les points sont attribués quand un admin termine le match via `POST /api/matches/:id/result`. `pick` se compare au `winner` (`home`, `away` ou `draw`).

## Tokens

- `accessToken` : JWT courte durée (15 min), envoyé en en-tête `Authorization: Bearer <token>`
- `refreshToken` : jeton opaque (30 jours), stocké haché (SHA-256) en base dans `refresh_tokens`. Rotation à chaque rafraîchissement : l'ancien jeton est révoqué.

## Rate limiting

Un limiteur global (`/api` : 300 requêtes / 15 min par IP) et un limiteur dédié au login (10 tentatives / 15 min) protègent l'API contre l'abus et le brute-force.

## Roles

- `user` : accès à son propre profil et à ses ressources
- `expert` : rédige et publie des analyses (et son propre profil)
- `admin` : accès à tous les profils et gestion des rôles
- `developer` : hérite de tous les accès admin ; peut en plus **changer le mot de passe** de n'importe quel compte et **se connecter à la place** d'un utilisateur (impersonation). Attribué uniquement via `DEVELOPER_EMAILS`.
- `owner` : mêmes pouvoirs que `developer`, attribué uniquement via `OWNER_EMAILS`.

Le rôle `coach` a été retiré : il ne correspond pas au modèle métier de prédictions sportives.

## Notes

Backend fonctionnel destiné à servir de fondation à la plateforme. Il inclut la validation, l'authentification, la rotation des refresh tokens, le rate limiting, les migrations versionnées et des gardes de rôles.

## Frontend

Le frontend React (Vite) est dans `../frontend`. Deux fenêtres de terminal :

```
# backend (port 3000, modifier PORT dans .env si besoin)
cd backend && npm run dev

# frontend (port 6457, proxy /api vers le backend)
cd frontend && npm run dev
```

Ouvrir `http://localhost:6457`. La page **`/admin`** permet de se connecter en tant qu'administrateur, d'importer les matchs depuis ESPN (bouton « Importer les matchs ») et de rédiger/publier les analyses (CRUD complet).