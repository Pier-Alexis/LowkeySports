import { db } from "../database/database.js";
import { ESPN_ONLY_LEAGUES, LeagueConfig } from "../config/leagues.js";
import { computeWinner } from "../utils/results.js";
import { fetchEspnEvents } from "./espn.js";
import { syncAllScores365Results, Scores365ResultsSummary } from "./scores365.js";
import { notifyMatchResultOnDiscord } from "./discordBot.js";

const DEFAULT_LOOKBACK_DAYS = 3;

export interface ResultsSyncSummary {
    provider: string;
    league: string;
    label: string;
    sport: string;
    checked: number;
    finished: number;
    skipped: number;
    error?: string;
}

function toYmd(date: Date): string {
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}${mm}${dd}`;
}

function eventDay(value: unknown): string {
    if (typeof value !== "string") return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return toYmd(date);
}

function statusState(status: unknown): string | undefined {
    const statusObj = (status as Record<string, unknown> | undefined) ?? {};
    return (statusObj.type as Record<string, unknown> | undefined)?.state as string | undefined;
}

function teamScore(competitor: Record<string, unknown>): number {
    const raw = competitor.score;
    const value = typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw);
    return Number.isFinite(value) ? value : 0;
}

function teamName(competitor: Record<string, unknown>): string {
    const team = (competitor.team as Record<string, unknown> | undefined) ?? {};
    return typeof team.displayName === "string" ? team.displayName.trim() : "";
}

function findCompetitor(
    competitors: unknown,
    homeAway: string
): Record<string, unknown> | undefined {
    if (!Array.isArray(competitors)) return undefined;
    return (competitors as Record<string, unknown>[]).find((c) => c.homeAway === homeAway);
}

const FILLER_WORDS = new Set([
    "de", "del", "di", "da", "do", "los", "las", "el", "la", "the", "of", "and", "e",
    "fc", "cf", "afc", "sc", "ac", "cc"
]);

function normalizeName(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]/g, " ")
        .split(" ")
        .filter((word) => word && !FILLER_WORDS.has(word))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
}

export function teamNamesMatch(dbName: string, espnName: string): boolean {
    const a = normalizeName(dbName);
    const b = normalizeName(espnName);
    if (!a || !b) return false;
    if (a === b) return true;
    return a.length >= 5 && b.length >= 5 && (a.includes(b) || b.includes(a));
}

async function finishSyncedMatch(input: {
    providerEventId: string;
    sport: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    eventDate?: string;
}): Promise<boolean> {
    const { providerEventId, sport, homeTeam, awayTeam, homeScore, awayScore, eventDate } = input;
    const winner = computeWinner(homeScore, awayScore);
    const client = await db.connect();

    try {
        await client.query("BEGIN");

        let result = await client.query(
            `UPDATE matches
             SET status = 'finished',
                 home_score = $2,
                 away_score = $3,
                 winner = $4
             WHERE provider = 'espn'
               AND provider_event_id = $1
               AND status <> 'finished'
             RETURNING id`,
            [providerEventId, homeScore, awayScore, winner]
        );
        if (result.rows.length === 0 && homeTeam && awayTeam && eventDate) {
            const candidates = await client.query(
                `SELECT id, home_team, away_team
                 FROM matches
                 WHERE sport = $1
                   AND status <> 'finished'
                   AND scheduled_at::date = $2::date`,
                [sport, eventDate]
            );

            const match = candidates.rows.find(
                (row) => teamNamesMatch(row.home_team, homeTeam) && teamNamesMatch(row.away_team, awayTeam)
            );

            if (match) {
                result = await client.query(
                    `UPDATE matches
                     SET status = 'finished',
                         home_score = $1,
                         away_score = $2,
                         winner = $3
                     WHERE id = $4 AND status <> 'finished'
                     RETURNING id`,
                    [homeScore, awayScore, winner, match.id]
                );
            }
        }

        if (result.rows.length === 0) {
            await client.query("COMMIT");
            return false;
        }

        const matchId = result.rows[0].id;

        await client.query(
            `UPDATE predictions
             SET points = lowkey_points(pick, $2, confidence)
             WHERE match_id = $1`,
            [matchId, winner]
        );

        await client.query("COMMIT");
        void notifyMatchResultOnDiscord(matchId);
        return true;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch {
            // transaction already closed
        }
        throw error;
    } finally {
        client.release();
    }
}

export interface FinishedResult {
    provider_event_id: string;
    sport: string;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    winner: "home" | "away" | "draw";
    event_date: string;
}

export function mapFinishedResult(
    event: Record<string, unknown>,
    sport: string
): FinishedResult | null {
    const competition = Array.isArray(event.competitions)
        ? (event.competitions as Record<string, unknown>[])[0] ?? {}
        : {};

    if (statusState(competition.status) !== "post") return null;

    const providerEventId = competition.id ?? event.id;
    if (typeof providerEventId !== "string" && typeof providerEventId !== "number") return null;

    const eventDate = eventDay(competition.date ?? event.date ?? "");
    if (!eventDate) return null;

    const home = findCompetitor(competition.competitors, "home");
    const away = findCompetitor(competition.competitors, "away");
    if (!home || !away) return null;

    const homeScore = teamScore(home);
    const awayScore = teamScore(away);
    const winner = computeWinner(homeScore, awayScore);

    return {
        provider_event_id: String(providerEventId),
        sport,
        home_team: teamName(home),
        away_team: teamName(away),
        home_score: homeScore,
        away_score: awayScore,
        winner,
        event_date: eventDate
    };
}

export async function syncLeagueResults(
    cfg: LeagueConfig,
    lookbackDays = DEFAULT_LOOKBACK_DAYS
): Promise<ResultsSyncSummary> {
    // La fenêtre remonte depuis aujourd'hui : un résultat ne peut être clos
    // qu'une fois la journée écoulée.
    const from = new Date(Date.now() - Math.max(0, lookbackDays - 1) * 86400000);
    const events = await fetchEspnEvents(cfg, lookbackDays, from);

    let checked = 0;
    let finished = 0;
    let skipped = 0;

    for (const event of events) {
        const result = mapFinishedResult(event, cfg.sport);
        if (!result) continue;

        checked += 1;
        const applied = await finishSyncedMatch({
            providerEventId: result.provider_event_id,
            sport: result.sport,
            homeTeam: result.home_team,
            awayTeam: result.away_team,
            homeScore: result.home_score,
            awayScore: result.away_score,
            eventDate: result.event_date
        });
        if (applied) {
            finished += 1;
        } else {
            skipped += 1;
        }
    }

    return {
        provider: cfg.provider,
        league: cfg.league,
        label: cfg.label,
        sport: cfg.sport,
        checked,
        finished,
        skipped
    };
}

export type AllResultsSummary = ResultsSyncSummary | Scores365ResultsSummary;

export async function syncAllResults(
    leagues: LeagueConfig[] = ESPN_ONLY_LEAGUES,
    lookbackDays = DEFAULT_LOOKBACK_DAYS,
    sources: Set<string> = new Set(["espn", "365scores"])
): Promise<AllResultsSummary[]> {
    const summaries: AllResultsSummary[] = [];

    if (sources.has("espn")) {
        for (const cfg of leagues) {
            try {
                summaries.push(await syncLeagueResults(cfg, lookbackDays));
            } catch (error) {
                summaries.push({
                    provider: cfg.provider,
                    league: cfg.league,
                    label: cfg.label,
                    sport: cfg.sport,
                    checked: 0,
                    finished: 0,
                    skipped: 0,
                    error: error instanceof Error ? error.message : "Erreur inconnue"
                });
            }
        }
    }

    // Une source en erreur ne doit pas priver l'autre de ses résultats.
    if (sources.has("365scores")) {
        summaries.push(...(await syncAllScores365Results()));
    }

    return summaries;
}

export function startResultsScheduler(intervalMs: number): NodeJS.Timeout {
    const run = async () => {
        try {
            const summaries = await syncAllResults();
            const totalFinished = summaries.reduce((acc, s) => acc + s.finished, 0);
            if (totalFinished > 0) {
                console.log(
                    `Synchronisation des résultats : ${totalFinished} match(s) terminé(s).`,
                    summaries
                        .filter((s) => s.finished > 0)
                        .map((s) => `${s.label}: +${s.finished}`)
                        .join(", ")
                );
            }
            const failed = summaries.filter((s) => s.error);
            if (failed.length > 0) {
                console.warn(
                    `Sources en erreur : ${failed
                        .map((s) => `${s.provider} (${s.error})`)
                        .join(", ")}`
                );
            }
        } catch (error) {
            console.error("Erreur lors de la synchronisation automatique des résultats :", error);
        }
    };

    const handle = setInterval(run, intervalMs);
    handle.unref?.();
    setTimeout(run, 10_000).unref?.();

    return handle;
}
