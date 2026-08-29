import type { EspnLeagueConfig } from "../config/leagues.js";

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

interface EspnCompetitor {
    homeAway: string;
    athlete?: { displayName?: string; headshot?: string };
    team?: { displayName?: string; logo?: string };
}

function competitorName(competitor: EspnCompetitor | undefined): string {
    return normalize(competitor?.athlete?.displayName ?? competitor?.team?.displayName);
}

function competitorLogo(competitor: EspnCompetitor | undefined): string | null {
    return normalize(competitor?.team?.logo ?? competitor?.athlete?.headshot) || null;
}

function findCompetitor(competitors: EspnCompetitor[], homeAway: string): EspnCompetitor | undefined {
    return Array.isArray(competitors)
        ? competitors.find((c) => c.homeAway === homeAway)
        : undefined;
}

function statusState(status: unknown): string | undefined {
    const statusObj = (status as Record<string, unknown> | undefined) ?? {};
    return (statusObj.type as Record<string, unknown> | undefined)?.state as string | undefined;
}

function toMappedEvent(
    providerEventId: unknown,
    date: unknown,
    competitors: EspnCompetitor[],
    cfg: EspnLeagueConfig
): MappedEvent | null {
    const home = findCompetitor(competitors, "home");
    const away = findCompetitor(competitors, "away");
    const homeTeam = competitorName(home);
    const awayTeam = competitorName(away);

    const rawDate = typeof date === "string" ? date : "";
    const scheduledAt = rawDate ? new Date(rawDate) : null;
    const isValidDate = scheduledAt instanceof Date && !Number.isNaN(scheduledAt.getTime());

    if (!providerEventId || !homeTeam || !awayTeam || !isValidDate) {
        return null;
    }

    return {
        provider: "espn",
        provider_event_id: String(providerEventId),
        sport: cfg.sport,
        competition: cfg.label,
        home_team: homeTeam,
        away_team: awayTeam,
        home_team_logo: competitorLogo(home),
        away_team_logo: competitorLogo(away),
        scheduled_at: scheduledAt
    };
}

function mapGroupedEvent(
    event: Record<string, unknown>,
    cfg: EspnLeagueConfig
): MappedEvent[] {
    const groupings = Array.isArray(event.groupings)
        ? (event.groupings as Record<string, unknown>[])
        : [];

    const mapped: MappedEvent[] = [];

    for (const group of groupings) {
        const competitions = Array.isArray(group.competitions)
            ? (group.competitions as Record<string, unknown>[])
            : [];

        for (const competition of competitions) {
            if (statusState(competition.status) !== "pre") continue;
            const competitors = (competition.competitors as EspnCompetitor[] | undefined) ?? [];
            const match = toMappedEvent(competition.id, competition.date, competitors, cfg);
            if (match) mapped.push(match);
        }
    }

    return mapped;
}

export function mapEspnEvent(
    event: Record<string, unknown>,
    cfg: EspnLeagueConfig
): MappedEvent[] {
    if (Array.isArray(event.groupings) && event.groupings.length > 0) {
        return mapGroupedEvent(event, cfg);
    }

    const competitions = Array.isArray(event.competitions) ? (event.competitions as Record<string, unknown>[]) : [];
    const competition = competitions[0] ?? {};

    if (statusState(event.status) !== "pre" && statusState(competition.status) !== "pre") {
        return [];
    }

    const competitors = (competition.competitors as EspnCompetitor[] | undefined) ?? [];
    const match = toMappedEvent(event.id, event.date, competitors, cfg);
    return match ? [match] : [];
}
