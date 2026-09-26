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

export type Provider = "espn" | "sofascore";

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
     * Nom(s) du tournoi côté Sofascore, comparés après normalisation.
     * Les alias existent car les noms de tournois changent d'une saison à
     * l'autre (sponsors qui se greffent, fusions de divisions).
     */
    sofascoreTournament?: string[];
    /** Code pays ISO2 du tournoi, utilisé à titre de recoupement. */
    sofascoreCountry?: string;
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
 * est donc Sofascore.
 *
 * Les noms de tournois sont comparés après normalisation (casse, accents,
 * ponctuation) et les alias couvrent les renommages saisonniers. Une
 * compétition mal orthographiée n'est pas cassante : la synchronisation
 * renvoie simplement 0 match et un rapport `unmatchedTournaments` permet de
 * corriger le nom depuis les données réelles de l'API.
 */
export const EUROPEAN_BASKETBALL_LEAGUES: LeagueConfig[] = [
    { label: "EuroLeague", sofascoreTournament: ["EuroLeague"], sofascoreCountry: "Europe" },
    { label: "EuroCup", sofascoreTournament: ["EuroCup"], sofascoreCountry: "Europe" },
    { label: "Basketball Champions League", sofascoreTournament: ["Basketball Champions League"], sofascoreCountry: "Europe" },
    { label: "FIBA Europe Cup", sofascoreTournament: ["FIBA Europe Cup"], sofascoreCountry: "Europe" },
    { label: "ABA League", sofascoreTournament: ["ABA League", "Adriatic League"], sofascoreCountry: "Europe" },
    { label: "VTB United League", sofascoreTournament: ["VTB United League", "VTB League"], sofascoreCountry: "Europe" },
    { label: "Liga ACB", sofascoreTournament: ["Liga ACB", "ACB"], sofascoreCountry: "Spain" },
    { label: "LNB Pro A", sofascoreTournament: ["LNB Pro A", "Pro A"], sofascoreCountry: "France" },
    { label: "Lega Basket Serie A", sofascoreTournament: ["Lega Basket Serie A", "Lega A Basket", "Lega A"], sofascoreCountry: "Italy" },
    { label: "BBL", sofascoreTournament: ["BBL", "Basketball Bundesliga", "EasyCredit BBL"], sofascoreCountry: "Germany" },
    { label: "Greek Basket League", sofascoreTournament: ["Greek Basket League", "Basket League", "GGL"], sofascoreCountry: "Greece" },
    { label: "Basketbol Süper Ligi", sofascoreTournament: ["Basketbol Süper Ligi", "Turkish Basketbol Super Ligi", "Super Lig"], sofascoreCountry: "Turkey" },
    { label: "Winner League", sofascoreTournament: ["Winner League", "Israeli Winner League"], sofascoreCountry: "Israel" },
    { label: "Polish Basketball League", sofascoreTournament: ["Polish Basketball League", "PLK"], sofascoreCountry: "Poland" },
    { label: "British Basketball League", sofascoreTournament: ["British Basketball League", "BBL"], sofascoreCountry: "United Kingdom" },
    { label: "Dutch Basketball League", sofascoreTournament: ["Dutch Basketball League", "DBL"], sofascoreCountry: "Netherlands" },
    { label: "Austrian Basketball Bundesliga", sofascoreTournament: ["Austrian Basketball Bundesliga", "BUNDESliga"], sofascoreCountry: "Austria" },
    { label: "Swiss Basketball League", sofascoreTournament: ["Swiss Basketball League", "SBBL"], sofascoreCountry: "Switzerland" },
    { label: "Czech Basketball League", sofascoreTournament: ["Czech Basketball League", "CZEB"], sofascoreCountry: "Czechia" },
    { label: "Basketball League", sofascoreTournament: ["Basketball League", "Danish Basketligaen"], sofascoreCountry: "Denmark" },
    { label: "Basketligan", sofascoreTournament: ["Basketligan"], sofascoreCountry: "Sweden" },
    { label: "Basketligen", sofascoreTournament: ["Basketligen"], sofascoreCountry: "Norway" },
    { label: "Korisliiga", sofascoreTournament: ["Korisliiga"], sofascoreCountry: "Finland" },
    { label: "Úrvalsdeild karla", sofascoreTournament: ["Úrvalsdeild karla", "Icelandic Basketball League"], sofascoreCountry: "Iceland" },
    { label: "Liga Portugal", sofascoreTournament: ["Liga Portugal", "LPA"], sofascoreCountry: "Portugal" },
    { label: "Balkan League", sofascoreTournament: ["Balkan League", "Adriatic Basketball Association"], sofascoreCountry: "Europe" }
].map((entry) => ({
    sport: "basketball",
    provider: "sofascore" as const,
    league: entry.sofascoreTournament![0].toLowerCase().replace(/[^a-z0-9]+/g, "-"),
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

/** Compétitions servies par ESPN (le reste vient de Sofascore). */
export const ESPN_ONLY_LEAGUES: LeagueConfig[] = LEAGUES.filter((l) => l.provider === "espn");

/** Compétitions servies par Sofascore. */
export const SOFASCORE_LEAGUES: LeagueConfig[] = LEAGUES.filter((l) => l.provider === "sofascore");

export function leaguesForProvider(provider: Provider): LeagueConfig[] {
    return LEAGUES.filter((league) => league.provider === provider);
}

export function leaguesForSport(sport: string): LeagueConfig[] {
    return LEAGUES.filter((league) => league.sport === sport);
}

/** Back-compat : les anciens appels utilisaient le nom `EspnLeagueConfig`. */
export type EspnLeagueConfig = LeagueConfig;
