import type { LeagueConfig } from "../config/leagues.js";
import { hasKnownTeams } from "./placeholder.js";

export interface SofascoreEvent {
    id: number | string;
    startTimestamp: number;
    status?: { type?: string; code?: number; description?: string };
    homeTeam?: { name?: string; id?: number };
    awayTeam?: { name?: string; id?: number };
    homeScore?: { current?: number; normaltime?: number };
    awayScore?: { current?: number; normaltime?: number };
    tournament?: {
        name?: string;
        uniqueTournament?: { id?: number; name?: string };
        category?: { name?: string; alpha2?: string };
    };
}

export interface MappedSofascoreEvent {
    provider: string;
    provider_event_id: string;
    sport: string;
    competition: string;
    home_team: string;
    away_team: string;
    home_team_logo: string | null;
    away_team_logo: string | null;
    scheduled_at: Date;
    flashscore_url: string | null;
}

/** Normalisation tolérante : casse, accents, ponctuation, espaces. */
export function normalizeTournamentName(value: unknown): string {
    if (typeof value !== "string") return "";
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function leagueMatchesEvent(league: LeagueConfig, event: SofascoreEvent): boolean {
    const aliases = league.sofascoreTournament ?? [];
    if (aliases.length === 0) return false;

    const names = [event.tournament?.name, event.tournament?.uniqueTournament?.name]
        .map(normalizeTournamentName)
        .filter((name) => name.length > 0);

    if (names.some((name) => aliases.map(normalizeTournamentName).includes(name))) {
        return true;
    }

    // Repli sur le pays quand le nom a changé (sponsor, fusion de division).
    // Le libellé reste celui de la config : c'est le site qui décide du nom
    // affiché, pas l'API.
    const country = normalizeTournamentName(event.tournament?.category?.name);
    const expected = normalizeTournamentName(league.sofascoreCountry);
    return country.length > 0 && country === expected;
}

function teamName(team: SofascoreEvent["homeTeam"]): string {
    return typeof team?.name === "string" ? team.name.trim() : "";
}

function teamLogo(team: SofascoreEvent["homeTeam"]): string | null {
    if (!team?.id) return null;
    return `https://img.sofascore.com/api/v1/team/${team.id}/image`;
}

function score(value: SofascoreEvent["homeScore"]): number | undefined {
    const current = value?.current;
    if (typeof current === "number" && Number.isFinite(current)) return current;
    return undefined;
}

/**
 * Les tournois Sofascore incluent parfois des phases de sélection annexes :
 * on ne garde que les matchs au statut attendu, passé par l'appelant.
 */
export function mapSofascoreEvent(
    event: SofascoreEvent,
    league: LeagueConfig,
    allowedStatuses: readonly string[] = ["notstarted"]
): MappedSofascoreEvent | null {
    if (!event?.id) return null;

    const statusType = event.status?.type ?? "";
    if (!allowedStatuses.includes(statusType)) return null;

    const homeTeam = teamName(event.homeTeam);
    const awayTeam = teamName(event.awayTeam);
    if (!homeTeam || !awayTeam) return null;
    if (!hasKnownTeams(homeTeam, awayTeam)) return null;

    if (typeof event.startTimestamp !== "number" || !Number.isFinite(event.startTimestamp)) {
        return null;
    }
    const scheduledAt = new Date(event.startTimestamp * 1000);
    if (Number.isNaN(scheduledAt.getTime())) return null;

    return {
        provider: "sofascore",
        provider_event_id: String(event.id),
        sport: league.sport,
        competition: league.label,
        home_team: homeTeam,
        away_team: awayTeam,
        home_team_logo: teamLogo(event.homeTeam),
        away_team_logo: teamLogo(event.awayTeam),
        scheduled_at: scheduledAt,
        flashscore_url: league.flashscore
    };
}

export interface FinishedSofascoreResult {
    provider_event_id: string;
    sport: string;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    winner: "home" | "away" | "draw";
    event_date: string;
}

function computeWinner(homeScore: number, awayScore: number): "home" | "away" | "draw" {
    if (homeScore > awayScore) return "home";
    if (awayScore > homeScore) return "away";
    return "draw";
}

export function mapFinishedSofascoreResult(
    event: SofascoreEvent,
    sport: string
): FinishedSofascoreResult | null {
    if (event?.status?.type !== "finished") return null;
    if (!event.id) return null;
    if (typeof event.startTimestamp !== "number") return null;

    const homeScore = score(event.homeScore);
    const awayScore = score(event.awayScore);
    if (homeScore === undefined || awayScore === undefined) return null;

    const homeTeam = teamName(event.homeTeam);
    const awayTeam = teamName(event.awayTeam);
    if (!homeTeam || !awayTeam) return null;

    const date = new Date(event.startTimestamp * 1000);
    if (Number.isNaN(date.getTime())) return null;

    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");

    return {
        provider_event_id: String(event.id),
        sport,
        home_team: homeTeam,
        away_team: awayTeam,
        home_score: homeScore,
        away_score: awayScore,
        winner: computeWinner(homeScore, awayScore),
        event_date: `${date.getFullYear()}${mm}${dd}`
    };
}
