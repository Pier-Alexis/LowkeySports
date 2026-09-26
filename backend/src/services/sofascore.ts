import { db } from "../database/database.js";
import { SOFASCORE_LEAGUES, LeagueConfig } from "../config/leagues.js";
import {
    SofascoreEvent,
    mapFinishedSofascoreResult,
    mapSofascoreEvent,
    leagueMatchesEvent
} from "../utils/sofascoreMapper.js";
import { computeWinner } from "../utils/results.js";
import { fetchJson as fetchSofascoreJson } from "../utils/http.js";
import { notifyMatchResultOnDiscord } from "./discordBot.js";

const BASE_URL = "https://api.sofascore.com/api/v1";
const DEFAULT_DAYS = 14;
const DEFAULT_LOOKBACK_DAYS = 3;

async function fetchJson(path: string): Promise<Record<string, unknown>> {
    return fetchSofascoreJson<Record<string, unknown>>(`${BASE_URL}${path}`, {
        headers: { Accept: "application/json", Referer: "https://www.sofascore.com/" }
    });
}

function toIsoDay(date: Date): string {
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${mm}-${dd}`;
}

export function dayRange(days: number, offsetDays = 0): string[] {
    const days_: string[] = [];
    for (let i = offsetDays; i < offsetDays + days; i += 1) {
        days_.push(toIsoDay(new Date(Date.now() + i * 86400000)));
    }
    return days_;
}

/**
 * Une seule requête par jour suffit : l'endpoint « scheduled-events » renvoie
 * tous les tournois du sport. Une requête par ligue × 25 serait 25 fois plus
 * lent pour exactement le même résultat.
 */
async function fetchDayEvents(isoDay: string): Promise<SofascoreEvent[]> {
    const body = await fetchJson(`/sport/basketball/scheduled-events/${isoDay}`);
    return Array.isArray(body.events) ? (body.events as SofascoreEvent[]) : [];
}

const UPSERT_MATCH_SQL = `
    INSERT INTO matches (
        provider, provider_event_id, sport, competition,
        home_team, away_team, home_team_logo, away_team_logo,
        scheduled_at, status, flashscore_url
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled', $10)
    ON CONFLICT (provider, provider_event_id)
    DO UPDATE SET
        home_team = EXCLUDED.home_team,
        away_team = EXCLUDED.away_team,
        home_team_logo = EXCLUDED.home_team_logo,
        away_team_logo = EXCLUDED.away_team_logo,
        competition = EXCLUDED.competition,
        sport = EXCLUDED.sport,
        scheduled_at = EXCLUDED.scheduled_at,
        flashscore_url = EXCLUDED.flashscore_url
    WHERE matches.status = 'scheduled'
    RETURNING (xmax = 0) AS inserted
`;

export interface SofascoreSyncResult {
    provider: string;
    sport: string;
    days: number;
    events: number;
    imported: number;
    updated: number;
    skipped: number;
    /** Tournois vus dans l'API mais non rattachés à une ligue configurée. */
    unmatchedTournaments: string[];
    /** Libellés configurés qui n'ont rien reçu sur la période. */
    emptyCompetitions: string[];
    error?: string;
}

export async function syncSofascoreBasketball(
    days = DEFAULT_DAYS
): Promise<SofascoreSyncResult> {
    const result: SofascoreSyncResult = {
        provider: "sofascore",
        sport: "basketball",
        days,
        events: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        unmatchedTournaments: [],
        emptyCompetitions: []
    };

    const seenCompetitions = new Set<string>();
    const seenTournaments = new Map<string, string>();
    const handledEventIds = new Set<string>();

    for (const isoDay of dayRange(days, 0)) {
        const events = await fetchDayEvents(isoDay);
        result.events += events.length;

        for (const event of events) {
            const eventId = String(event.id ?? "");
            if (!eventId || handledEventIds.has(eventId)) continue;

            const league = SOFASCORE_LEAGUES.find((cfg) => leagueMatchesEvent(cfg, event));
            const rawTournament = event.tournament?.uniqueTournament?.name ?? event.tournament?.name;

            if (!league) {
                if (rawTournament) seenTournaments.set(rawTournament, event.tournament?.category?.name ?? "");
                continue;
            }

            const mapped = mapSofascoreEvent(event, league);
            if (!mapped) {
                result.skipped += 1;
                continue;
            }

            handledEventIds.add(eventId);
            seenCompetitions.add(league.label);

            const upsert = await db.query(UPSERT_MATCH_SQL, [
                mapped.provider,
                mapped.provider_event_id,
                mapped.sport,
                mapped.competition,
                mapped.home_team,
                mapped.away_team,
                mapped.home_team_logo,
                mapped.away_team_logo,
                mapped.scheduled_at,
                mapped.flashscore_url
            ]);

            if (upsert.rows.length === 0) {
                result.skipped += 1;
            } else if (upsert.rows[0].inserted === true) {
                result.imported += 1;
            } else {
                result.updated += 1;
            }
        }
    }

    result.emptyCompetitions = SOFASCORE_LEAGUES
        .map((cfg) => cfg.label)
        .filter((label) => !seenCompetitions.has(label));
    result.unmatchedTournaments = [...seenTournaments.entries()].map(
        ([tournament, country]) => (country ? `${tournament} (${country})` : tournament)
    );

    return result;
}

export async function syncSofascoreLeagues(): Promise<SofascoreSyncResult[]> {
    const results: SofascoreSyncResult[] = [];

    const runs: { name: string; run: () => Promise<SofascoreSyncResult> }[] = [
        {
            name: "basketball",
                run: () =>
                    syncSofascoreBasketball(DEFAULT_DAYS).catch((error) => ({
                        provider: "sofascore",
                        sport: "basketball",
                        days: DEFAULT_DAYS,
                        events: 0,
                        imported: 0,
                        updated: 0,
                        skipped: 0,
                        unmatchedTournaments: [],
                        emptyCompetitions: [],
                        error: error instanceof Error ? error.message : "Erreur inconnue"
                    }))
        }
    ];

    for (const entry of runs) {
        results.push(await entry.run());
    }

    return results;
}

async function finishSofascoreMatch(input: {
    providerEventId: string;
    sport: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    eventDate: string;
}): Promise<boolean> {
    const winner = computeWinner(input.homeScore, input.awayScore);
    const client = await db.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `UPDATE matches
             SET status = 'finished',
                 home_score = $2,
                 away_score = $3,
                 winner = $4
             WHERE provider = 'sofascore'
               AND provider_event_id = $1
               AND status <> 'finished'
             RETURNING id`,
            [input.providerEventId, input.homeScore, input.awayScore, winner]
        );

        if (result.rows.length === 0) {
            await client.query("COMMIT");
            return false;
        }

        await client.query(
            `UPDATE predictions
             SET points = lowkey_points(pick, $2, confidence)
             WHERE match_id = $1`,
            [result.rows[0].id, winner]
        );

        await client.query("COMMIT");
        void notifyMatchResultOnDiscord(result.rows[0].id);
        return true;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch {
            // transaction déjà fermée
        }
        throw error;
    } finally {
        client.release();
    }
}

export interface SofascoreResultsSummary {
    provider: string;
    /** Aligné sur `ResultsSyncSummary` pour que l'agrégation reste homogène. */
    league: string;
    label: string;
    sport: string;
    checked: number;
    finished: number;
    skipped: number;
    error?: string;
}

const SOFASCORE_LABEL = "Basketball Europe (Sofascore)";

export async function syncSofascoreResults(
    lookbackDays = DEFAULT_LOOKBACK_DAYS
): Promise<SofascoreResultsSummary> {
    const summary: SofascoreResultsSummary = {
        provider: "sofascore",
        league: "basketball",
        label: SOFASCORE_LABEL,
        sport: "basketball",
        checked: 0,
        finished: 0,
        skipped: 0
    };

    for (const isoDay of dayRange(lookbackDays, -lookbackDays)) {
        const events = await fetchDayEvents(isoDay);

        for (const event of events) {
            const league = SOFASCORE_LEAGUES.find((cfg) => leagueMatchesEvent(cfg, event));
            if (!league) continue;

            const result = mapFinishedSofascoreResult(event, league.sport);
            if (!result) continue;

            summary.checked += 1;
            const applied = await finishSofascoreMatch({
                providerEventId: result.provider_event_id,
                sport: result.sport,
                homeTeam: result.home_team,
                awayTeam: result.away_team,
                homeScore: result.home_score,
                awayScore: result.away_score,
                eventDate: result.event_date
            });
            if (applied) {
                summary.finished += 1;
            } else {
                summary.skipped += 1;
            }
        }
    }

    return summary;
}

export async function syncAllSofascoreResults(): Promise<SofascoreResultsSummary[]> {
    try {
        return [await syncSofascoreResults()];
    } catch (error) {
        return [
            {
                provider: "sofascore",
                league: "basketball",
                label: SOFASCORE_LABEL,
                sport: "basketball",
                checked: 0,
                finished: 0,
                skipped: 0,
                error: error instanceof Error ? error.message : "Erreur inconnue"
            }
        ];
    }
}

export function sofascoreLeagues(): LeagueConfig[] {
    return SOFASCORE_LEAGUES;
}
