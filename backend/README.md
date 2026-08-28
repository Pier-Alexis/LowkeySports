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
- `SPORTSDB_API_KEY`: clé gratuite TheSportsDB (défaut `3`)
- `NODE_ENV`: `production` désactive le fallback du secret JWT
- `ADMIN_EMAIL` + `ADMIN_PASSWORD` : créent ou promeuvent un administrateur (voir ci-dessous)
- `ADMIN_EMAILS`: liste d'emails séparés par des virgules autorisés à devenir administrateurs. Un compte inscrit avec l'un de ces emails obtient le rôle `admin` à l'inscription, et tout compte existant est automatiquement promu `admin` à sa prochaine connexion.

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

### Users

- `GET /api/users` (admin)
- `GET /api/users/:id` (profil personnel ou admin)
- `PATCH /api/users/:id/role` (admin) — `{ role: "user" | "admin" }`

### Players

- `POST /api/players/` (auth)
- `GET /api/players/me` (auth)
- `PUT /api/players/me` (auth)
- `DELETE /api/players/me` (auth)

### Matches

- `GET /api/matches` (public) — matchs à venir par défaut ; filtres `?status=scheduled|live|finished|cancelled` et `?sport=`
- `GET /api/matches/:id` (public) — détail ; inclut `myPrediction` si connecté
- `POST /api/matches` (admin) — `{ sport, competition?, homeTeam, awayTeam, scheduledAt }`
- `PATCH /api/matches/:id` (admin) — modifier un match non commencé
- `POST /api/matches/:id/result` (admin) — `{ homeScore, awayScore }` : termine le match, calcule le vainqueur et crédite les points

### Predictions

- `POST /api/predictions` (auth) — `{ matchId, pick: "home" | "away" | "draw" }` (un seul par match, avant le début)
- `GET /api/predictions/me` (auth) — ses prédictions avec infos du match
- `PUT /api/predictions/:id` (auth, propriétaire) — modifie le pick tant que le match n'a pas commencé
- `DELETE /api/predictions/:id` (auth, propriétaire)
- `GET /api/predictions/leaderboard` (public) — classement par points cumulés

### Articles (contenu éditorial)

- `GET /api/articles` (public) — analyses publiées ; filtres `?sport=` et `?matchId=`
- `GET /api/articles/:id` (public ; brouillons visibles par l'admin)
- `POST /api/articles` (admin) — `{ matchId, title, content, pick, status: "draft" | "published" }`
- `PUT /api/articles/:id` (admin) — mise à jour
- `DELETE /api/articles/:id` (admin)

### Synchro de données sportives (TheSportsDB)

- `GET /api/sync/leagues? sport=Tennis` (admin) — recherche de ligues disponibles
- `POST /api/sync/matches` (admin) — importe les matchs à venir des ligues configurées ; body optionnel `{ leagues: [{ id, sport }] }`, sinon `src/config/leagues.ts` est utilisé

Les matchs importés sont identifiés par `provider` + `provider_event_id` (unique), la synchro est donc idempotente. Le sport `Soccer` est mappé sur `football` (4 catégories du site : basketball, baseball, football, tennis).

## Scoring

Chaque prédiction correcte rapporte **1 point** (0 sinon). Les points sont attribués quand un admin termine le match via `POST /api/matches/:id/result`. `pick` se compare au `winner` (`home`, `away` ou `draw`).

## Tokens

- `accessToken` : JWT courte durée (15 min), envoyé en en-tête `Authorization: Bearer <token>`
- `refreshToken` : jeton opaque (30 jours), stocké haché (SHA-256) en base dans `refresh_tokens`. Rotation à chaque rafraîchissement : l'ancien jeton est révoqué.

## Rate limiting

Un limiteur global (`/api` : 300 requêtes / 15 min par IP) et un limiteur dédié au login (10 tentatives / 15 min) protègent l'API contre l'abus et le brute-force.

## Roles

- `user` : accès à son propre profil et à ses ressources
- `admin` : accès à tous les profils et gestion des rôles

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

Ouvrir `http://localhost:6457`. La page **`/admin`** permet de se connecter en tant qu'administrateur, d'importer les matchs depuis TheSportsDB (bouton « Importer les matchs ») et de rédiger/publier les analyses (CRUD complet).