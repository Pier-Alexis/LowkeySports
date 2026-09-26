import type { Match } from "./api";

export function formatScheduledAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

export function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

export function pickLabel(pick: string, match: Pick<Match, "home_team" | "away_team">): string {
    if (pick === "home") return `Victoire ${match.home_team}`;
    if (pick === "away") return `Victoire ${match.away_team}`;
    return "Match nul";
}

/* -------------------------------------------------------------------------- */
/* Catégories                                                                  */
/* -------------------------------------------------------------------------- */

export type Region = "world" | "europe" | "usa" | "ncaa";

export const REGION_ORDER: Region[] = ["europe", "ncaa", "usa", "world"];

export const REGION_LABELS: Record<Region, string> = {
    world: "International",
    europe: "Europe",
    usa: "États-Unis",
    ncaa: "NCAA"
};

export interface Sport {
    id: string;
    label: string;
}

export const SPORTS: Sport[] = [
    { id: "soccer", label: "Soccer" },
    { id: "american_football", label: "Football américain" },
    { id: "basketball", label: "Basketball" },
    { id: "tennis", label: "Tennis" },
    { id: "baseball", label: "Baseball" },
    { id: "hockey", label: "Hockey" }
];

export function sportLabel(id: string): string {
    return SPORTS.find((sport) => sport.id === id)?.label ?? id;
}

/* -------------------------------------------------------------------------- */
/* Ligues                                                                      */
/* -------------------------------------------------------------------------- */

export interface League {
    /** Identifiant de filtre : c'est le libellé stocké en `matches.competition`. */
    id: string;
    label: string;
    sport: string;
    region: Region;
}

export const LEAGUES: League[] = [
    // ---------- Soccer ----------
    { sport: "soccer", id: "Premier League", label: "Premier League", region: "world" },
    { sport: "soccer", id: "La Liga", label: "La Liga", region: "world" },
    { sport: "soccer", id: "Ligue 1", label: "Ligue 1", region: "world" },
    { sport: "soccer", id: "Serie A", label: "Serie A", region: "world" },
    { sport: "soccer", id: "Bundesliga", label: "Bundesliga", region: "world" },
    { sport: "soccer", id: "Ligue des Champions", label: "Ligue des Champions", region: "world" },
    { sport: "soccer", id: "Ligue Europa", label: "Ligue Europa", region: "world" },

    // ---------- Football américain ----------
    { sport: "american_football", id: "NFL", label: "NFL", region: "usa" },
    { sport: "american_football", id: "NCAAF", label: "NCAAF", region: "ncaa" },

    // ---------- Basketball ----------
    { sport: "basketball", id: "NBA", label: "NBA", region: "usa" },
    { sport: "basketball", id: "NCAA", label: "NCAA", region: "ncaa" },
    { sport: "basketball", id: "NCAAW", label: "NCAAW", region: "ncaa" },

    // Basketball européen (source Sofascore — ESPN ne les couvre pas)
    { sport: "basketball", id: "EuroLeague", label: "EuroLeague", region: "europe" },
    { sport: "basketball", id: "EuroCup", label: "EuroCup", region: "europe" },
    { sport: "basketball", id: "Basketball Champions League", label: "Basketball Champions League", region: "europe" },
    { sport: "basketball", id: "FIBA Europe Cup", label: "FIBA Europe Cup", region: "europe" },
    { sport: "basketball", id: "ABA League", label: "ABA League", region: "europe" },
    { sport: "basketball", id: "VTB United League", label: "VTB United League", region: "europe" },
    { sport: "basketball", id: "Liga ACB", label: "Liga ACB", region: "europe" },
    { sport: "basketball", id: "LNB Pro A", label: "LNB Pro A", region: "europe" },
    { sport: "basketball", id: "Lega Basket Serie A", label: "Lega Basket Serie A", region: "europe" },
    { sport: "basketball", id: "BBL", label: "BBL", region: "europe" },
    { sport: "basketball", id: "Greek Basket League", label: "Greek Basket League", region: "europe" },
    { sport: "basketball", id: "Basketbol Süper Ligi", label: "Basketbol Süper Ligi", region: "europe" },
    { sport: "basketball", id: "Winner League", label: "Winner League", region: "europe" },
    { sport: "basketball", id: "Polish Basketball League", label: "Polish Basketball League", region: "europe" },
    { sport: "basketball", id: "British Basketball League", label: "British Basketball League", region: "europe" },
    { sport: "basketball", id: "Dutch Basketball League", label: "Dutch Basketball League", region: "europe" },
    { sport: "basketball", id: "Austrian Basketball Bundesliga", label: "Austrian Basketball Bundesliga", region: "europe" },
    { sport: "basketball", id: "Swiss Basketball League", label: "Swiss Basketball League", region: "europe" },
    { sport: "basketball", id: "Czech Basketball League", label: "Czech Basketball League", region: "europe" },
    { sport: "basketball", id: "Basketball League", label: "Basketball League", region: "europe" },
    { sport: "basketball", id: "Basketligan", label: "Basketligan", region: "europe" },
    { sport: "basketball", id: "Basketligen", label: "Basketligen", region: "europe" },
    { sport: "basketball", id: "Korisliiga", label: "Korisliiga", region: "europe" },
    { sport: "basketball", id: "Úrvalsdeild karla", label: "Úrvalsdeild karla", region: "europe" },
    { sport: "basketball", id: "Liga Portugal", label: "Liga Portugal", region: "europe" },
    { sport: "basketball", id: "Balkan League", label: "Balkan League", region: "europe" },

    // ---------- Autres ----------
    { sport: "tennis", id: "ATP", label: "ATP", region: "world" },
    { sport: "tennis", id: "WTA", label: "WTA", region: "world" },
    { sport: "baseball", id: "MLB", label: "MLB", region: "usa" },
    { sport: "hockey", id: "NHL", label: "NHL", region: "usa" }
];

export function leaguesBySport(sport: string): League[] {
    return LEAGUES.filter((league) => league.sport === sport);
}

export function leagueLabel(sport: string, id: string): string {
    return LEAGUES.find((league) => league.sport === sport && league.id === id)?.label ?? id;
}

/**
 * Ligues d'une catégorie, regroupées par région et ordonnées.
 *
 * Le regroupement est indispensable depuis l'ajout du basket européen : sans
 * lui, la catégorie Basketball affiche 30 pastilles d'un bloc, ce qui déborde
 * la carte et écrase les autres catégories de la grille.
 */
export function leaguesByRegion(sport: string): { region: Region; label: string; leagues: League[] }[] {
    const groups = new Map<Region, League[]>();

    for (const league of leaguesBySport(sport)) {
        const bucket = groups.get(league.region) ?? [];
        bucket.push(league);
        groups.set(league.region, bucket);
    }

    return REGION_ORDER.filter((region) => (groups.get(region)?.length ?? 0) > 0).map((region) => ({
        region,
        label: REGION_LABELS[region],
        leagues: groups.get(region) ?? []
    }));
}

export function sportLeagueCount(sport: string): number {
    return leaguesBySport(sport).length;
}

/* -------------------------------------------------------------------------- */
/* FlashScore                                                                  */
/* -------------------------------------------------------------------------- */

const FLASHSCORE_HUBS: Record<string, string> = {
    soccer: "https://www.flashscore.com/football/",
    american_football: "https://www.flashscore.com/american-football/",
    basketball: "https://www.flashscore.com/basketball/",
    tennis: "https://www.flashscore.com/tennis/",
    baseball: "https://www.flashscore.com/baseball/",
    hockey: "https://www.flashscore.com/hockey/"
};

/**
 * FlashScore ne publie ni API ni URL de matchAddressable : les URL par match
 * exigent des identifiants internes qu'on ne peut pas deviner. La seule cible
 * stable est la page-hub de la discipline, d'où ce repli.
 */
export function flashscoreHub(sport: string): string {
    return FLASHSCORE_HUBS[sport] ?? "https://www.flashscore.com/";
}

export function flashscoreUrlFor(match: { flashscore_url?: string | null; sport: string }): string {
    return match.flashscore_url ?? flashscoreHub(match.sport);
}

/* -------------------------------------------------------------------------- */
/* Confiance & barème                                                          */
/* -------------------------------------------------------------------------- */

export const DEFAULT_CONFIDENCE = 2;

export interface ConfidenceLevel {
    value: number;
    label: string;
    points: number;
    hint: string;
}

/**
 * Miroir JS du barème `lowkey_points()` côté base. Toute modification doit
 * être répercutée dans la migration `010_scoring_confidence.sql`.
 */
export const CONFIDENCE_LEVELS: ConfidenceLevel[] = [
    { value: 1, label: "Timide", points: 0.5, hint: "Plaisant, pas de conviction" },
    { value: 2, label: "Défensif", points: 0.5, hint: "Le standard, sans prise de risque" },
    { value: 3, label: "Raisonnable", points: 0.5, hint: "Un argument solide derrière" },
    { value: 4, label: "Assuré", points: 1, hint: "Je maintiens quoi qu'il arrive" },
    { value: 5, label: "Conviction", points: 2, hint: "Le double, ou rien" }
];

export function confidenceMeta(value: number | null | undefined): ConfidenceLevel {
    return (
        CONFIDENCE_LEVELS.find((level) => level.value === value) ??
        CONFIDENCE_LEVELS.find((level) => level.value === DEFAULT_CONFIDENCE)!
    );
}

export function pointsLabel(points: number | null | undefined): string {
    if (points === null || points === undefined) return "0";
    return Number.isInteger(points) ? String(points) : points.toFixed(1).replace(".", ",");
}
