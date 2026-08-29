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
    team?: {
        displayName?: string;
        logo?: string;
    };
}

function findCompetitor(competitors: EspnCompetitor[], homeAway: string): EspnCompetitor | undefined {
    return Array.isArray(competitors)
        ? competitors.find((c) => c.homeAway === homeAway)
        : undefined;
}

export function mapEspnEvent(
    event: Record<string, unknown>,
    cfg: EspnLeagueConfig
): MappedEvent | null {
    const providerEventId = event.id;
    const competitions = Array.isArray(event.competitions) ? (event.competitions as Record<string, unknown>[]) : [];
    const competition = competitions[0] ?? {};
    const competitors = (competition.competitors as EspnCompetitor[] | undefined) ?? [];
    const home = findCompetitor(competitors, "home");
    const away = findCompetitor(competitors, "away");
    const homeTeam = normalize(home?.team?.displayName);
    const awayTeam = normalize(away?.team?.displayName);

    const eventStatus = (event.status as Record<string, unknown> | undefined) ?? {};
    const statusType = (eventStatus.type as Record<string, unknown> | undefined) ?? {};
    const competitionStatus = (competition.status as Record<string, unknown> | undefined) ?? {};
    const competitionStatusType = (competitionStatus.type as Record<string, unknown> | undefined) ?? {};
    const state = (statusType.state ?? competitionStatusType.state) as string | undefined;

    if (state !== "pre") {
        return null;
    }

    const rawDate = typeof event.date === "string" ? event.date : "";
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
        home_team_logo: normalize(home?.team?.logo) || null,
        away_team_logo: normalize(away?.team?.logo) || null,
        scheduled_at: scheduledAt
    };
}
