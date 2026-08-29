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

export const LEAGUES: { sport: string; id: string; label: string }[] = [
    { sport: "soccer", id: "Premier League", label: "Premier League" },
    { sport: "soccer", id: "La Liga", label: "La Liga" },
    { sport: "soccer", id: "Ligue 1", label: "Ligue 1" },
    { sport: "soccer", id: "Serie A", label: "Serie A" },
    { sport: "soccer", id: "Bundesliga", label: "Bundesliga" },
    { sport: "soccer", id: "Ligue des Champions", label: "Ligue des Champions" },
    { sport: "american_football", id: "NFL", label: "NFL" },
    { sport: "basketball", id: "NBA", label: "NBA" },
    { sport: "tennis", id: "ATP", label: "ATP" },
    { sport: "tennis", id: "WTA", label: "WTA" },
    { sport: "baseball", id: "MLB", label: "MLB" },
    { sport: "hockey", id: "NHL", label: "NHL" }
];

export function leaguesBySport(sport: string): { id: string; label: string }[] {
    return LEAGUES.filter((league) => league.sport === sport);
}

export function leagueLabel(sport: string, id: string): string {
    return LEAGUES.find((league) => league.sport === sport && league.id === id)?.label ?? id;
}