# LowkeySports — application mobile

Application React Native (Expo SDK 57) pour **LowkeySports**, un miroir mobile du site web
(React/Vite + API Express/PostgreSQL). Navigation via **Expo Router** (SDK 57, routes dans
`src/app`), tabs natifs via `expo-router/unstable-native-tabs`.

## Démarrage

1. Lancer l'API backend (port 3000) :

   ```bash
   cd ../backend
   npm run dev
   ```

2. Installer les dépendances et démarrer :

   ```bash
   npm install
   npx expo start
   ```

   Puis ouvrir dans l'émulateur iOS, Expo Go, ou `a` pour Android.

3. Sur un appareil physique, l'API tourne sur votre machine : pointer l'app dessus !

   ```bash
   npx expo start
   EXPO_PUBLIC_API_URL=http://<IP-de-votre-machine>:3000 npx expo start
   ```

   Par défaut, l'app utilise `http://localhost:3000/api` (fonctionne sur les simulateurs).

## Structure

- `src/app/` — routes Expo Router :
  - `(tabs)/` — Accueil, Disciplines, Analyses, À propos, Compte
  - `sport/[sport]` — page par discipline (filtre `?competition=`)
  - `match/[id]` — détail d'un match + analyses liées
  - `article/[id]` — détail d'une analyse
  - `admin/` — panneau d'administration (dashboard, analyses, utilisateurs)
- `src/components/` — `ui.tsx` (primitives), `MatchCard`, `ArticleCard`, `TeamLogo`,
  `BrandHeader`, `MatchPickerModal`, `app-tabs` (tabs natifs + variante web)
- `src/lib/` — `api.ts` (client HTTP), `auth.ts` (jetons JWT dans le SecureStore),
  `admin.ts` (API admin), `format.ts` (dates pr. fr et listes sports/ligues)
- `src/constants/theme.ts` — palette LowkeySports

## Administration

Le panneau admin se trouve sur l'onglet Compte → « Panneau d'administration »
(réservé aux utilisateurs avec le rôle `admin`). Il permet de synchroniser les matchs,
vérifier les résultats, créer/supprimer des analyses et gérer les utilisateurs.

## Typecheck & build

```bash
npx tsc --noEmit
npx expo export --platform ios   # vérifie le bundling natif
```

## Notes

- Les jetons `ls_access_token`, `ls_refresh_token` et `ls_user` sont stockés dans
  `expo-secure-store`.
- L'app force le mode sombre (`userInterfaceStyle: "dark"`).
- Docs de référence du SDK : https://docs.expo.dev/versions/v57.0.0/