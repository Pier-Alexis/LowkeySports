export function formatScheduledAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const day = WEEKDAYS_SHORT[date.getDay()];
    const month = MONTHS_SHORT[date.getMonth()];
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day} ${date.getDate()} ${month} ${date.getFullYear()}, ${hours}:${minutes}`;
}

export function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return `${date.getDate()} ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function pickLabel(pick: string, match: { home_team: string; away_team: string }): string {
    if (pick === "home") return `Victoire ${match.home_team}`;
    if (pick === "away") return `Victoire ${match.away_team}`;
    return "Match nul";
}

export const SPORTS: { id: string; label: string }[] = [
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

export type Region = 'world' | 'europe' | 'usa' | 'ncaa';

export const REGION_ORDER: Region[] = ['europe', 'ncaa', 'usa', 'world'];

export const REGION_LABELS: Record<Region, string> = {
    world: 'International',
    europe: 'Europe',
    usa: 'États-Unis',
    ncaa: 'NCAA'
};

export interface League {
    /** Identifiant de filtre : c'est le libellé stocké en `matches.competition`. */
    id: string;
    label: string;
    sport: string;
    region: Region;
}

export const LEAGUES: League[] = [
    // ---------- Soccer ----------
    { sport: 'soccer', id: 'Premier League', label: 'Premier League', region: 'world' },
    { sport: 'soccer', id: 'La Liga', label: 'La Liga', region: 'world' },
    { sport: 'soccer', id: 'Ligue 1', label: 'Ligue 1', region: 'world' },
    { sport: 'soccer', id: 'Serie A', label: 'Serie A', region: 'world' },
    { sport: 'soccer', id: 'Bundesliga', label: 'Bundesliga', region: 'world' },
    { sport: 'soccer', id: 'Ligue des Champions', label: 'Ligue des Champions', region: 'world' },
    { sport: 'soccer', id: 'Ligue Europa', label: 'Ligue Europa', region: 'world' },

    // ---------- Football américain ----------
    { sport: 'american_football', id: 'NFL', label: 'NFL', region: 'usa' },
    { sport: 'american_football', id: 'NCAAF', label: 'NCAAF', region: 'ncaa' },

    // ---------- Basketball États-Unis ----------
    { sport: 'basketball', id: 'NBA', label: 'NBA', region: 'usa' },
    { sport: 'basketball', id: 'NCAA', label: 'NCAA', region: 'ncaa' },
    { sport: 'basketball', id: 'NCAAW', label: 'NCAAW', region: 'ncaa' },

    // ---------- Basketball européen (365scores) ----------
    { sport: 'basketball', id: 'ABA League', label: 'ABA League', region: 'europe' },
    { sport: 'basketball', id: 'VTB United League', label: 'VTB United League', region: 'europe' },
    { sport: 'basketball', id: 'Lega Basket Serie A', label: 'Lega Basket Serie A', region: 'europe' },
    { sport: 'basketball', id: 'BBL', label: 'BBL', region: 'europe' },
    { sport: 'basketball', id: 'Basketbol Süper Ligi', label: 'Basketbol Süper Ligi', region: 'europe' },
    { sport: 'basketball', id: 'Winner League', label: 'Winner League', region: 'europe' },
    { sport: 'basketball', id: 'Polish Basketball League', label: 'Polish Basketball League', region: 'europe' },

    // ---------- Autres ----------
    { sport: 'tennis', id: 'ATP', label: 'ATP', region: 'world' },
    { sport: 'tennis', id: 'WTA', label: 'WTA', region: 'world' },
    { sport: 'baseball', id: 'MLB', label: 'MLB', region: 'usa' },
    { sport: 'hockey', id: 'NHL', label: 'NHL', region: 'usa' }
];

export function leaguesBySport(sport: string): League[] {
    return LEAGUES.filter((league) => league.sport === sport);
}

export function leagueLabel(sport: string, id: string): string {
    return LEAGUES.find((league) => league.sport === sport && league.id === id)?.label ?? id;
}

export function sportLeagueCount(sport: string): number {
    return leaguesBySport(sport).length;
}

/**
 * Ligues groupées par région.
 *
 * Le basket européen expose près de 30 ligues : tout afficher d'un bloc sur
 * mobile produit une carte interminable qui écrase les autres disciplines.
 */
export function leaguesByRegion(
    sport: string
): { region: Region; label: string; leagues: League[] }[] {
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

/* ---------- FlashScore ---------- */

const FLASHSCORE_HUBS: Record<string, string> = {
    soccer: 'https://www.flashscore.com/football/',
    american_football: 'https://www.flashscore.com/american-football/',
    basketball: 'https://www.flashscore.com/basketball/',
    tennis: 'https://www.flashscore.com/tennis/',
    baseball: 'https://www.flashscore.com/baseball/',
    hockey: 'https://www.flashscore.com/hockey/'
};

/**
 * FlashScore n'expose ni API publique ni URL de match stable : les liens par
 * match exigent des identifiants internes. La page-hub de la discipline est la
 * seule cible fiable, d'où ce repli.
 */
export function flashscoreHub(sport: string): string {
    return FLASHSCORE_HUBS[sport] ?? 'https://www.flashscore.com/';
}

export function flashscoreUrlFor(match: { flashscore_url?: string | null; sport: string }): string {
    return match.flashscore_url ?? flashscoreHub(match.sport);
}

/* ---------- Confiance & barème ---------- */

export const DEFAULT_CONFIDENCE = 2;

export interface ConfidenceLevel {
    value: number;
    label: string;
    points: number;
}

/** Miroir JS de `lowkey_points()` côté base. */
export const CONFIDENCE_LEVELS: ConfidenceLevel[] = [
    { value: 1, label: 'Timide', points: 0.5 },
    { value: 2, label: 'Défensif', points: 0.5 },
    { value: 3, label: 'Raisonnable', points: 0.5 },
    { value: 4, label: 'Assuré', points: 1 },
    { value: 5, label: 'Conviction', points: 2 }
];

export function confidenceMeta(value: number | null | undefined): ConfidenceLevel {
    return (
        CONFIDENCE_LEVELS.find((level) => level.value === value) ??
        CONFIDENCE_LEVELS.find((level) => level.value === DEFAULT_CONFIDENCE)!
    );
}

export function pointsLabel(points: number | null | undefined): string {
    if (points === null || points === undefined) return '0';
    return Number.isInteger(points) ? String(points) : points.toFixed(1).replace('.', ',');
}

const WEEKDAYS_SHORT = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MONTHS_SHORT = [
    "janv.",
    "févr.",
    "mars",
    "avr.",
    "mai",
    "juin",
    "juil.",
    "août",
    "sept.",
    "oct.",
    "nov.",
    "déc."
];
const MONTHS_LONG = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre"
];