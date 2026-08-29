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