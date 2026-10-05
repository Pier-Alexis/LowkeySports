# LowkeySports — Cahier des charges v2

Document de référence fonctionnel et technique. Il décrit l'état livré du
produit et les points volontairement laissés ouverts.

- Version : 2
- Portée : site web (`frontend`), API (`backend`), application mobile (`mobile`)
- Langue de l'interface : français
- Positionnement : **informationnel et prédictif, sans pari d'argent**

---

## 1. Objectifs

1. Couvrir le **football américain college** (NCAAF : FBS et FCS) en plus de la NFL.
2. Couvrir le **basketball college** (NCAA et NCAAW).
3. Couvrir les **grandes ligues de basketball européennes**, absentes d'ESPN.
4. Donner à chaque utilisateur un **pronostic pondéré par sa confiance**, et non
   un pari binaire systématique.
5. Ne jamais afficher un match dont un participant n'est pas connu.
6. Donner accès à une **référence externe** (FlashScore) depuis chaque match.
7. Rendre l'interface lisible malgré l'explosion du nombre de compétitions.

## 2. Non-objectifs

- Aucune functionality de pari, de dépôt, de cote ou de gain monétaire.
- Aucun scraping de FlashScore.
- Pas de compteurs de points « en jeu » modifiables par l'utilisateur.

---

## 3. Sources de données

| Fournisseur | Usage | Authentification |
| --- | --- | --- |
| ESPN | Soccer, NFL, NCAAF, NCAA/NCAAW, ATP/WTA, MLB, NHL | Aucune (API publique) |
| 365scores | Basketball européen | Aucune, API gratuite |

### 3.1 Pourquoi 365scores pour l'Europe

ESPN ne diffuse aucune compétition de basketball européenne. Les deux sources
sont donc coexistantes, et chaque compétition de la configuration backend
(`backend/src/config/leagues.ts`) déclare son `provider`.

> **Sofascore a été remplacé.** Son API renvoie désormais `HTTP 403` à tout
> client non-navigateur (blocage WAF au niveau Varnish) : ni un `User-Agent`
> complet, ni `X-Requested-With`, ni un proxy ordinaire ne débloquent l'accès —
> un proxy reçoit le même `challenge`. Les 25 compétitions européennes qui
> lui étaient confiées ont été retirées de la configuration plutôt que
> laissées en place : une pastille sans aucun match est indiscernable d'une
> panne pour l'utilisateur.

365scores expose un flux global de matchs en cours et à venir plutôt qu'un
endpoint par compétition. Un appel suffit donc à couvrir toutes les ligues, et
le rattachement se fait sur `competitionId`, en filtrant également sur
`sportId` — le flux mêle les dix disciplines supportées et un identifiant ne
désigne pas la même compétition selon le sport.

**Limite connue** : le flux ne couvre qu'une fenêtre glissante d'environ 24 h
et n'expose aucun paramètre de date. La fenêtre de prévision est donc courte,
ce qui convient à une ré-exécution quotidienne ; au-delà, il faut un autre
fournisseur.

**Point ouvert** : la couverture européenne de 365scores est partielle. Sept
ligues sont servies (ABA League, VTB United League, Lega Basket Serie A, BBL,
Basketbol Süper Ligi, Winner League, Polish Basketball League). EuroLeague,
Liga ACB, LNB Pro A, EuroCup, Basketball Champions League et la Greek Basket
League n'existent pas dans son flux et ne sont donc pas affichées. Les couvrir
suppose un fournisseur sur clé — API-Basketball ou data.basketball, tous deux
avec un palier gratuit — à brancher en complément.

### 3.2 Football américain college

- `espnSport: football`, `league: college-football`
- `groups=90&limit=500` : sans ce paramètre, ESPN ne renvoie qu'une vingtaine de
  matchs « en vedette » au lieu de la journée complète.
- La catégorie s'affiche sous le nom **NCAAF** et couvre l'ensemble de la
  Division I, FBS comme FCS.

**Point ouvert** : la séparation visible FBS / FCS n'est pas exposée par ESPN
dans le scoreboard. La catégorie est donc unique, avec la mention « FBS & FCS »
dans l'interface. Si une distinction est souhaitée, elle devra reposer sur un
recoupement (sous-conférence) et non sur le flux ESPN seul.

### 3.3 Basketball college

- `mens-college-basketball` → **NCAA**
- `womens-college-basketball` → **NCAAW**
- `groups=50&limit=400`

### 3.4 Basketball européen

26 compétitions configurées : EuroLeague, EuroCup, Basketball Champions League,
FIBA Europe Cup, ABA League, VTB United League, Liga ACB, LNB Pro A, Lega Basket
Serie A, BBL, Greek Basket League, Basketbol Süper Ligi, Winner League, Polish
Basketball League, British Basketball League, Dutch Basketball League, Austrian
Basketball Bundesliga, Swiss Basketball League, Czech Basketball League,
Basketball League (Danemark), Basketligan, Basketligen, Korisliiga, Úrvalsdeild
karla, Liga Portugal, Balkan League.

**Point ouvert** : la liste n'est pas exhaustive et les alias n'ont pas pu être
validés en direct (voir §8).

---

## 4. Filtrage des matchs non déterminés

### 4.1 Règle

Un match est **masqué dès qu'un seul de ses deux participants est un
placeholder**. La symétrie est assumée : un « TBD vs Detroit » n'a aucun
intérêt pronostique.

### 4.2 Placeholders reconnus

`TBD`, `T.B.D.`, `TBA`, `TBC`, `To Be Announced`, `To Be Determined`,
`To Be Confirmed`, `À déterminer`, `À confirmer`, `À venir`, `Unknown`, `N/D`,
`N/A`, tirets, `Winner`, `Winner M1`, `Loser SF`, `Seed 4`, `1st Seed`, `R1`,
`Round 1`, `Premier Tour`, ainsi que les variantes avec un suffixe numérique.

### 4.3 Points d'application

- **Import** : le mapper rejette le match avant écriture
  (`backend/src/utils/espnMapper.ts`, `scores365Mapper.ts`).
- **Lecture** : toutes les requêtes de liste et de détail filtrent
  (`backend/src/routes/matches.ts`).
- **Base** : la migration `010` purge les lignes existantes en cascade sur
  `predictions` puis `articles`, puis `matches`.
- **Référence unique** : `isPlaceholderTeam` (TypeScript) et
  `lowkey_is_placeholder_team` (SQL) doivent rester équivalents. Toute
  modification de l'un sans l'autre crée une divergence silencieuse.

---

## 5. Scoring pondéré par la confiance

### 5.1 Barème

| Confiance | Libellé | Gain si correct |
| --- | --- | --- |
| 1 | Timide | 0,5 pt |
| 2 | Défensif (défaut) | 0,5 pt |
| 3 | Raisonnable | 0,5 pt |
| 4 | Assuré | 1 pt |
| 5 | Conviction | 2 pts |
| — | Pronostic incorrect | 0 pt |

Équation : `points = lowkey_points(pick, winner, confidence)`.

### 5.2 Source de vérité

La fonction SQL `lowkey_points` est la référence. Les cinq appelants qui
calculaient auparavant `CASE WHEN pick = winner THEN 1` l'utilisent désormais :

- clôture d'un match (`backend/src/services/matches.ts`)
- synchronisation des résultats (`backend/src/utils/results.ts`)
- classement des membres (`backend/src/routes/predictions.ts`)
- classement des analyses d'experts (`backend/src/routes/articles.ts`)
- bilan Discord (`backend/src/discord/bot.ts`)

Le barème est dupliqué côté interface pour l'affichage
(`CONFIDENCE_LEVELS` dans `frontend/src/lib/format.ts` et
`mobile/src/lib/format.ts`). **Modifier le barème impose de mettre à jour ces
deux fichiers en même temps que la migration.**

### 5.3 Règles

- La confiance est choisie au moment du pronostic et modifiable jusqu'au coup
  d'envoi.
- Changer de pronostic ou de confiance ne crée pas de doublon : l'entrée est
  mise à jour.
- Cliquer sur le même pronostic avec la même confiance le supprime.
- La confiance par défaut est 2 pour les nouvelles prédictions ; les lignes
  existantes sont recalculées à 2 par la migration.
- `points` est un `NUMERIC(4,1)` : les demi-points n'entrent pas dans un entier.

### 5.4 Lecture des classements

Le classement affiche la confiance moyenne en plus du taux de réussite. L'idée
est explicite dans l'interface : une confiance élevée associée à un faible taux
de réussite signale un profil trop sûr de lui.

---

## 6. FlashScore

### 6.1 Contrainte réelle

FlashScore ne fournit **ni API publique ni URL de match stable**. Ses URLs de
match sont construites à partir d'identifiants internes qu'on ne peut ni lire
depuis une source tierce ni deviner de façon fiable. Les chemins devinés et les
pages de recherche testés renvoient des 404.

### 6.2 Décision

Le site affiche un **bouton de lien externe** vers FlashScore :

- `matches.flashscore_url` est renseigné si une URL fiable est connue (import
  ou saisie admin).
- Sinon, repli sur la **page-hub de la discipline**, seule URL stable et
  vérifiable (`https://www.flashscore.com/basketball/`, etc.).
- Le bouton est présent sur la carte de match (web et mobile), sur la page
  détail et sur la page de discipline.

**À être clair** : tant qu'aucun identifiant FlashScore n'est disponible, ce
n'est pas un lien vers *ce* match mais vers le calendrier de la discipline.

### 6.3 Ce qu'il ne faut pas faire

- Ne pas inventer d'URL de match par motif.
- Ne pas charger FlashScore en iframe : le site bloque l'intégration.
- Ne pas automatiser du scraping de FlashScore.

---

## 7. Interface

### 7.1 Problème résolu : la superposition des catégories

Le basketball européen porte à lui seul près de 30 compétitions. Affichées
toutes d'un bloc dans une grille, elles étiraient la hauteur de la ligne et
rendaient les autres disciplines illisibles, en particulier sur mobile.

Corrections appliquées :

- `align-items: start` sur la grille des catégories, plus `height: fit-content`
  sur les cartes : une catégorie à 30 ligues n'étire plus sa ligne.
- Les ligues sont **regroupées par région** (Europe, NCAA, États-Unis,
  International) et **déployées à la demande** via un bouton.
- Un compteur de ligues par catégorie donne le volume avant déploiement.

### 7.2 Plateformes

| Plateforme | Rôle |
| --- | --- |
| `frontend` | Site public + espace membre + espace admin |
| `mobile` | Application Expo (SDK 54), consultation et navigation |
| `backend` | API, synchronisation, bot Discord |

### 7.3 Confidentialité des pronostics

Les pronostics sont privés. Le détail d'un match n'affiche le pronostic d'un
autre membre à aucun moment, y compris pour les administrateurs.

---

## 8. Limites connues

| Sujet | Limite | Conséquence |
| --- | --- | --- |
| Couverture européenne | 365scores ne sert que 7 ligues de basket | EuroLeague, Liga ACB, LNB Pro A, EuroCup, BCL et Greek Basket League absentes de l'interface |
| Fenêtre 365scores | Flux global ~24 h, sans paramètre de date | Seuls les matchs des prochaines 24 h sont importés à chaque exécution |
| Logos 365scores | Aucune URL d'image dans le flux | Les clubs européens s'affichent sans logo |
| NCAA / NCAAW | Hors saison de novembre à mars | 0 match affiché en octobre, sans Panne |
| NCAAF | Pas de séparation FBS / FCS par ESPN | Catégorie unique |
| FlashScore | Pas d'API ni d'URL par match | Bouton vers la page-hub, pas vers le match |
| Application mobile | Pas de saisie de pronostic | La confiance n'y est affichée que sur les analyses |

---

## 9. Plan de vérification

Avant mise en production :

1. Exécuter la migration `010` sur une base de test et vérifier :
   - le type de `predictions.points` passe bien en `NUMERIC(4,1)` ;
   - les contraintes `predictions_points_check` / `predictions_points_max_check`
     existent bien sous ces noms, sinon l'`ALTER` échoue ;
   - la purge n'emporte pas de match légitime.
2. Lancer une synchronisation et lire `emptyCompetitions` : une ligue qui y
   figure n'a rien reçu du fournisseur et son `competitionId` est probablement
   faux. Les erreurs par source remontent dans l'écran admin.
3. Contrôler qu'aucun match TBD n'apparaît sur `/matches`, `/sport/:sport` et
   dans le bot Discord.

## 10. Référence des fichiers

| Sujet | Fichier |
| --- | --- |
| Taxonomie et fournisseurs | `backend/src/config/leagues.ts` |
| Détection TBD | `backend/src/utils/placeholder.ts` |
| Migration scoring / FlashScore / purge | `backend/src/database/migrations/010_scoring_confidence.sql` |
| Synchronisation ESPN | `backend/src/services/espn.ts` |
| Synchronisation 365scores | `backend/src/services/scores365.ts` |
| Import des résultats | `backend/src/services/resultsSync.ts` |
| Barème JS | `backend/src/utils/results.ts` |
| Barème et taxonomie web | `frontend/src/lib/format.ts` |
| Barème et taxonomie mobile | `mobile/src/lib/format.ts` |
| Sélecteur de confiance | `frontend/src/components/ConfidencePicker.tsx` |
| Catégories web | `frontend/src/pages/DisciplinesPage.tsx` |
| Catégories mobile | `mobile/src/app/(tabs)/disciplines.tsx` |
