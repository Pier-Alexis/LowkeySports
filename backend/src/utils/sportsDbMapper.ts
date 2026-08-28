export function mapSportName(strSport: string): string {
    const map: Record<string, string> = {
        Soccer: "football",
        Basketball: "basketball",
        Baseball: "baseball",
        Tennis: "tennis",
        "American Football": "american_football",
        "Ice Hockey": "ice_hockey"
    };

    return (map[strSport] ?? strSport).trim().toLowerCase();
}

export interface MappedEvent {
    provider: string;
    provider_event_id: string;
    sport: string;
    competition: string;
    home_team: string;
    away_team: string;
    home_team_logo: string | null;
    away_team_logo: string | null;
    scheduled_at: Date;
}

function normalize(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

export function parseEventTimestamp(event: Record<string, unknown>): Date | null {
    const timestamp = event.strTimestamp;

    if (typeof timestamp === "string" && timestamp) {
        const parsed = new Date(timestamp);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const datePart = typeof event.dateEvent === "string" ? event.dateEvent : "";
    const timePart = typeof event.strTime === "string" ? event.strTime : "";
    if (!datePart) return null;

    const iso = timePart ? `${datePart}T${timePart}` : `${datePart}T00:00:00`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function mapSportsDbEvent(
    event: Record<string, unknown>,
    sportOverride?: string
): MappedEvent | null {
    const providerEventId = event.idEvent;
    const homeTeam = normalize(event.strHomeTeam);
    const awayTeam = normalize(event.strAwayTeam);
    const scheduledAt = parseEventTimestamp(event);

    if (!providerEventId || !homeTeam || !awayTeam || !scheduledAt) {
        return null;
    }

    const sport =
        sportOverride && sportOverride.trim()
            ? sportOverride.trim().toLowerCase()
            : mapSportName(normalize(event.strSport));

    return {
        provider: "thesportsdb",
        provider_event_id: String(providerEventId),
        sport,
        competition: normalize(event.strLeague),
        home_team: homeTeam,
        away_team: awayTeam,
        home_team_logo: normalize(event.strHomeTeamBadge) || null,
        away_team_logo: normalize(event.strAwayTeamBadge) || null,
        scheduled_at: scheduledAt
    };
}