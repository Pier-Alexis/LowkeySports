/**
 * Taxonomie des compétitions, multi-fournisseur de données.
 *
 * Chaque entrée décrit une compétition à afficher sur le site :
 *  - `sport`     : la catégorie du site (identique à `matches.sport`)
 *  - `label`     : le libellé, stocké dans `matches.competition` et utilisé
 *                  comme identifiant de filtre côté front
 *  - `provider`  : d'où viennent les données
 *  - `region`    : regroupement géographique pour l'affichage
 *  - `flashscore`: page-hub FlashScore de la discipline, seule URL stable
 *                  et vérifiable (les URLs par match exigent des IDs internes)
 */

export type Provider = "espn" | "365scores";

export type Region = "world" | "europe" | "usa" | "ncaa";

export const REGION_LABELS: Record<Region, string> = {
    world: "International",
    europe: "Europe",
    usa: "États-Unis",
    ncaa: "NCAA"
};

export interface LeagueConfig {
    sport: string;
    provider: Provider;
    league: string;
    label: string;
    region: Region;
    /** Slug sport ESPN. Requis pour `provider: "espn"`. */
    espnSport?: string;
    /**
     * Paramètres additionnels du scoreboard ESPN. Indispensable pour les
     * sports NCAA : sans `groups`, ESPN ne renvoie qu'une vingtaine de
     * matchs « en vedette » au lieu de la journée complète.
     */
    query?: string;
    /**
     * Identifiant de compétition côté 365scores. Requis pour
     * `provider: "365scores"`.
     */
    competitionId?: number;
    /** Page-hub FlashScore de la discipline. */
    flashscore: string;
}

const FLASHSCORE_HUBS: Record<string, string> = {
    soccer: "https://www.flashscore.com/football/",
    american_football: "https://www.flashscore.com/american-football/",
    basketball: "https://www.flashscore.com/basketball/",
    tennis: "https://www.flashscore.com/tennis/",
    baseball: "https://www.flashscore.com/baseball/",
    hockey: "https://www.flashscore.com/hockey/"
};

export function flashscoreHub(sport: string): string {
    return FLASHSCORE_HUBS[sport] ?? "https://www.flashscore.com/";
}

/**
 * Basketball européen — ESPN ne couvre aucune de ces compétitions, la source
 * est donc 365scores.
 *
 * ⚠ Sofascore a été la source historique mais son API renvoie désormais
 * `HTTP 403` à tout client non-navigateur (blocage WAF au niveau Varnish, pas
 * un problème d'en-têtes : un `User-Agent` complet et `X-Requested-With` ne
 * suffisent pas, et un proxy ordinaire reçoit le même `challenge`). Les 25
 * compétitions'Europe de l'ancienne config ne sont donc plus atteignables et
 * ont été retirées plutôt que laissées en base : une pastille sans aucun match
 * est pire qu'une pastille absente, l'utilisateur ne peut pas distinguer les
 * deux.
 *
 * La liste ci-dessous ne contient que des `competitionId` vérifiés comme
 * servis par l'API. 365scores expose un flux global de matchs en cours et à
 * venir (~24 h glissantes), sans paramètre de date : la fenêtre de prévision
 * est donc courte, ce qui convient à une ré-exécution quotidienne.
 */
export const EUROPEAN_BASKETBALL_LEAGUES: LeagueConfig[] = [
    { label: "ABA League", competitionId: 548 },
    { label: "VTB United League", competitionId: 90 },
    { label: "Lega Basket Serie A", competitionId: 19 },
    { label: "BBL", competitionId: 27 },
    { label: "Basketbol Süper Ligi", competitionId: 79 },
    { label: "Winner League", competitionId: 609 },
    { label: "Polish Basketball League", competitionId: 392 }
].map((entry) => ({
    sport: "basketball",
    provider: "365scores" as const,
    league: entry.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    region: "europe" as const,
    flashscore: flashscoreHub("basketball"),
    ...entry
}));

export const LEAGUES: LeagueConfig[] = [
    // ---------- Soccer ----------
    { sport: "soccer", provider: "espn", espnSport: "soccer", league: "eng.1", label: "Premier League", region: "world", flashscore: flashscoreHub("soccer") },
    { sport: "soccer", provider: "espn", espnSport: "soccer", league: "esp.1", label: "La Liga", region: "world", flashscore: flashscoreHub("soccer") },
    { sport: "soccer", provider: "espn", espnSport: "soccer", league: "fra.1", label: "Ligue 1", region: "world", flashscore: flashscoreHub("soccer") },
    { sport: "soccer", provider: "espn", espnSport: "soccer", league: "ita.1", label: "Serie A", region: "world", flashscore: flashscoreHub("soccer") },
    { sport: "soccer", provider: "espn", espnSport: "soccer", league: "ger.1", label: "Bundesliga", region: "world", flashscore: flashscoreHub("soccer") },
    { sport: "soccer", provider: "espn", espnSport: "soccer", league: "uefa.champions", label: "Ligue des Champions", region: "world", flashscore: flashscoreHub("soccer") },
    { sport: "soccer", provider: "espn", espnSport: "soccer", league: "uefa.europa", label: "Ligue Europa", region: "world", flashscore: flashscoreHub("soccer") },

    // ---------- Football américain ----------
    { sport: "american_football", provider: "espn", espnSport: "football", league: "nfl", label: "NFL", region: "usa", flashscore: flashscoreHub("american_football") },
    // NCAAF : `groups=90` = l'ensemble de la Division I (FBS + FCS).
    // Sans ce paramètre le scoreboard ne renvoie que les matchs en vedette.
    { sport: "american_football", provider: "espn", espnSport: "football", league: "college-football", label: "NCAAF", region: "ncaa", query: "groups=90&limit=500", flashscore: flashscoreHub("american_football") },

    // ---------- Basketball ----------
    { sport: "basketball", provider: "espn", espnSport: "basketball", league: "nba", label: "NBA", region: "usa", flashscore: flashscoreHub("basketball") },
    { sport: "basketball", provider: "espn", espnSport: "basketball", league: "mens-college-basketball", label: "NCAA", region: "ncaa", query: "groups=50&limit=400", flashscore: flashscoreHub("basketball") },
    { sport: "basketball", provider: "espn", espnSport: "basketball", league: "womens-college-basketball", label: "NCAAW", region: "ncaa", query: "groups=50&limit=400", flashscore: flashscoreHub("basketball") },
    ...EUROPEAN_BASKETBALL_LEAGUES,

    // ---------- Autres ----------
    { sport: "tennis", provider: "espn", espnSport: "tennis", league: "atp", label: "ATP", region: "world", flashscore: flashscoreHub("tennis") },
    { sport: "tennis", provider: "espn", espnSport: "tennis", league: "wta", label: "WTA", region: "world", flashscore: flashscoreHub("tennis") },
    { sport: "baseball", provider: "espn", espnSport: "baseball", league: "mlb", label: "MLB", region: "usa", flashscore: flashscoreHub("baseball") },
    { sport: "hockey", provider: "espn", espnSport: "hockey", league: "nhl", label: "NHL", region: "usa", flashscore: flashscoreHub("hockey") }
];


/** Toutes les compétitions, tous fournisseurs confondus. */
export const ALL_LEAGUES: LeagueConfig[] = LEAGUES;

/** Compétitions servies par ESPN (le reste vient de 365scores). */
export const ESPN_ONLY_LEAGUES: LeagueConfig[] = LEAGUES.filter((l) => l.provider === "espn");

/** Compétitions servies par 365scores. */
export const SCORES365_LEAGUES: LeagueConfig[] = LEAGUES.filter((l) => l.provider === "365scores");

export function leaguesForProvider(provider: Provider): LeagueConfig[] {
    return LEAGUES.filter((league) => league.provider === provider);
}

export function leaguesForSport(sport: string): LeagueConfig[] {
    return LEAGUES.filter((league) => league.sport === sport);
}

/** Back-compat : les anciens appels utilisaient le nom `EspnLeagueConfig`. */
export type EspnLeagueConfig = LeagueConfig;
