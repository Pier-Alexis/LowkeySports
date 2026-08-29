import { db } from "../database/database.js";
import { ESPN_LEAGUES, EspnLeagueConfig } from "../config/leagues.js";
import { computeWinner } from "../utils/results.js";

const BASE_URL = "https://site.api.espn.com/apis/site/v2/sports";
const DEFAULT_LOOKBACK_DAYS = 3;

export interface ResultsSyncSummary {
    league: string;
    label: string;
    sport: string;
    checked: number;
    finished: number;
    skipped: number;
    error?: string;
}

async function fetchJson(path: string): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
        const response = await fetch(`${BASE_URL}/${path}`, {
            signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0" }
        });
        if (!response.ok) {
            throw new Error(`ESPN a répondu ${response.status}`);
        }
        return (await response.json()) as Record<string, unknown>;
    } finally {
        clearTimeout(timeout);
    }
}

function toYmd(date: Date): string {
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}${mm}${dd}`;
}

function dateRange(days: number): string {
    const start = new Date(Date.now() - days * 86400000);
    const end = new Date();
    return `${toYmd(start)}-${toYmd(end)}`;
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

function findCompetitor(
    competitors: unknown,
    homeAway: string
): Record<string, unknown> | undefined {
    if (!Array.isArray(competitors)) return undefined;
    return (competitors as Record<string, unknown>[]).find((c) => c.homeAway === homeAway);
}

async function finishSyncedMatch(
    providerEventId: string,
    homeScore: number,
    awayScore: number
): Promise<boolean> {
    const winner = computeWinner(homeScore, awayScore);
    const client = await db.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
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

        if (result.rows.length === 0) {
            await client.query("COMMIT");
            return false;
        }

        const matchId = result.rows[0].id;

        await client.query(
            `UPDATE predictions
             SET points = CASE WHEN pick = $2 THEN 1 ELSE 0 END
             WHERE match_id = $1`,
            [matchId, winner]
        );

        await client.query("COMMIT");
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
    home_score: number;
    away_score: number;
    winner: "home" | "away" | "draw";
}

export function mapFinishedResult(
    event: Record<string, unknown>
): FinishedResult | null {
    const competition = Array.isArray(event.competitions)
        ? (event.competitions as Record<string, unknown>[])[0] ?? {}
        : {};

    if (statusState(competition.status) !== "post") return null;

    const providerEventId = competition.id ?? event.id;
    if (typeof providerEventId !== "string" && typeof providerEventId !== "number") return null;

    const home = findCompetitor(competition.competitors, "home");
    const away = findCompetitor(competition.competitors, "away");
    if (!home || !away) return null;

    const homeScore = teamScore(home);
    const awayScore = teamScore(away);
    const winner = computeWinner(homeScore, awayScore);

    return {
        provider_event_id: String(providerEventId),
        home_score: homeScore,
        away_score: awayScore,
        winner
    };
}

export async function syncLeagueResults(
    cfg: EspnLeagueConfig,
    lookbackDays = DEFAULT_LOOKBACK_DAYS
): Promise<ResultsSyncSummary> {
    const body = await fetchJson(
        `${cfg.espnSport}/${cfg.league}/scoreboard?dates=${dateRange(lookbackDays)}`
    );
    const events = Array.isArray(body.events) ? (body.events as Record<string, unknown>[]) : [];

    let checked = 0;
    let finished = 0;
    let skipped = 0;

    for (const event of events) {
        const result = mapFinishedResult(event);
        if (!result) continue;

        checked += 1;
        const applied = await finishSyncedMatch(
            result.provider_event_id,
            result.home_score,
            result.away_score
        );
        if (applied) {
            finished += 1;
        } else {
            skipped += 1;
        }
    }

    return {
        league: cfg.league,
        label: cfg.label,
        sport: cfg.sport,
        checked,
        finished,
        skipped
    };
}

export async function syncAllResults(
    leagues: EspnLeagueConfig[] = ESPN_LEAGUES,
    lookbackDays = DEFAULT_LOOKBACK_DAYS
): Promise<ResultsSyncSummary[]> {
    const summaries: ResultsSyncSummary[] = [];

    for (const cfg of leagues) {
        try {
            summaries.push(await syncLeagueResults(cfg, lookbackDays));
        } catch (error) {
            summaries.push({
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

    return summaries;
}

export function startResultsScheduler(intervalMs: number): NodeJS.Timeout {
    const run = async () => {
        try {
            const summaries = await syncAllResults();
            const totalFinished = summaries.reduce((acc, s) => acc + s.finished, 0);
            if (totalFinished > 0) {
                console.log(
                    `Synchronisation des résultats ESPN : ${totalFinished} match(s) terminé(s).`,
                    summaries
                        .filter((s) => s.finished > 0)
                        .map((s) => `${s.label}: +${s.finished}`)
                        .join(", ")
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
