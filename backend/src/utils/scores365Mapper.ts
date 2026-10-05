import type { LeagueConfig } from "../config/leagues.js";
import { hasKnownTeams } from "./placeholder.js";

/**
 * Mapper 365scores.
 *
 * 365scores expose un flux global (`/web/games/`) plutôt qu'un endpoint par
 * compétition : un seul appel suffit donc à couvrir toutes les ligues, et le
 * filtrage se fait sur `competitionId`. Le flux ne couvre qu'une fenêtre
 * glissante d'environ 24 h, ce qui suffit pour une ré-exécution quotidienne.
 */

/** `sportId` de 365scores pour le basketball. */
export const BASKETBALL_SPORT_ID = 2;

/**
 * `statusGroup` :
 *  - 1 : à venir (pré-match)
 *  - 2 : programmé
 *  - 3 : en cours
 *  - 4 : annulé / reporté
 *  - 5 : terminé
 *
 * Seuls 1 et 2 sont pronostiquables. Un match annulé ou en cours ne doit pas
 * être proposé à l'utilisateur.
 */
export const UPCOMING_STATUS_GROUPS: readonly number[] = [1, 2];
export const FINISHED_STATUS_GROUP = 5;

export interface Scores365Competitor {
    id?: number | string;
    name?: string;
    /** `-1` quand le score n'est pas encore connu. */
    score?: number;
}

export interface Scores365Game {
    id?: number | string;
    sportId?: number;
    competitionId?: number;
    /** ISO 8601 avec décalage, ex. `2026-10-05T16:30:00+00:00`. */
    startTime?: string;
    statusGroup?: number;
    homeCompetitor?: Scores365Competitor;
    awayCompetitor?: Scores365Competitor;
}

export interface Scores365Feed {
    games?: Scores365Game[];
}

export interface MappedScores365Game {
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

function teamName(team: Scores365Game["homeCompetitor"]): string {
    return typeof team?.name === "string" ? team.name.trim() : "";
}

/**
 * 365scores ne renvoie pas d'URL de logo dans le flux : les hôtes d'images ne
 * sont pas servants depuis ce réseau. On laisse `null` plutôt que de fabriquer
 * une URL — l'interface affiche alors un fallback texte, ce qui est correct,
 * alors qu'une URL morte afficherait une image cassée.
 */
function teamLogo(): string | null {
    return null;
}

/**
 * `true` si le match appartient à la ligue configurée.
 *
 * Le double filtre (sport **et** `competitionId`) est indispensable : la même
 * valeur d'identifiant désigne autre chose dans un autre sport, et le flux
 * global mêle les dix disciplines supportées.
 */
export function leagueMatchesGame(league: LeagueConfig, game: Scores365Game): boolean {
    if (league.provider !== "365scores") return false;
    if (league.competitionId === undefined) return false;
    if (game.sportId !== BASKETBALL_SPORT_ID) return false;
    return game.competitionId === league.competitionId;
}

export function mapScores365Game(league: LeagueConfig, game: Scores365Game): MappedScores365Game | null {
    if (!game?.id) return null;
    if (!leagueMatchesGame(league, game)) return null;

    const statusGroup = game.statusGroup;
    if (statusGroup === undefined || !UPCOMING_STATUS_GROUPS.includes(statusGroup)) return null;

    const homeTeam = teamName(game.homeCompetitor);
    const awayTeam = teamName(game.awayCompetitor);
    if (!homeTeam || !awayTeam) return null;
    if (!hasKnownTeams(homeTeam, awayTeam)) return null;

    const scheduledAt = new Date(game.startTime ?? "");
    if (Number.isNaN(scheduledAt.getTime())) return null;

    return {
        provider: "365scores",
        provider_event_id: String(game.id),
        sport: league.sport,
        competition: league.label,
        home_team: homeTeam,
        away_team: awayTeam,
        home_team_logo: teamLogo(),
        away_team_logo: teamLogo(),
        scheduled_at: scheduledAt,
        flashscore_url: league.flashscore
    };
}

export interface FinishedScores365Game {
    provider_event_id: string;
    home_score: number;
    away_score: number;
    event_date: string;
}

function computeWinner(homeScore: number, awayScore: number): "home" | "away" | "draw" {
    if (homeScore > awayScore) return "home";
    if (awayScore > homeScore) return "away";
    return "draw";
}

/**
 * Traduit un match terminé enpatch de résultat, ou `null` si le match n'est pas
 * terminé ou n'a pas de score exploitable.
 *
 * 365scores encode l'absence de score par `-1` : un match « Scheduled » porte
 * donc `-1` des deux côtés, qu'il ne faut pas confondre avec un 0-0.
 */
export function mapFinishedScores365Game(game: Scores365Game): FinishedScores365Game | null {
    if (!game?.id) return null;
    if (game.statusGroup !== FINISHED_STATUS_GROUP) return null;

    const homeScore = game.homeCompetitor?.score;
    const awayScore = game.awayCompetitor?.score;
    if (typeof homeScore !== "number" || typeof awayScore !== "number") return null;
    if (homeScore < 0 || awayScore < 0) return null;

    const scheduledAt = new Date(game.startTime ?? "");
    if (Number.isNaN(scheduledAt.getTime())) return null;

    const mm = String(scheduledAt.getMonth() + 1).padStart(2, "0");
    const dd = String(scheduledAt.getDate()).padStart(2, "0");

    return {
        provider_event_id: String(game.id),
        home_score: homeScore,
        away_score: awayScore,
        event_date: `${scheduledAt.getFullYear()}${mm}${dd}`
    };
}

export function computeScores365Winner(homeScore: number, awayScore: number): "home" | "away" | "draw" {
    return computeWinner(homeScore, awayScore);
}