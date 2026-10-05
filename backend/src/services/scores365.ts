import { db } from "../database/database.js";
import { SCORES365_LEAGUES, LeagueConfig } from "../config/leagues.js";
import {
    Scores365Feed,
    Scores365Game,
    leagueMatchesGame,
    mapFinishedScores365Game,
    mapScores365Game
} from "../utils/scores365Mapper.js";
import { computeWinner } from "../utils/results.js";
import { fetchJson as fetchScores365Json } from "../utils/http.js";
import { notifyMatchResultOnDiscord } from "./discordBot.js";

const BASE_URL = "https://webws.365scores.com/web/games";

async function fetchGames(): Promise<Scores365Game[]> {
    const body = await fetchScores365Json<Scores365Feed>(BASE_URL, {
        headers: { Accept: "application/json", Referer: "https://www.365scores.com/" }
    });
    return Array.isArray(body.games) ? body.games : [];
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

export interface Scores365SyncResult {
    provider: string;
    /** Aligné sur `LeagueSyncResult` pour que le rapport soit homogène. */
    label: string;
    sport: string;
    events: number;
    imported: number;
    updated: number;
    skipped: number;
    /** Ligues configurées qui n'ont rien reçu sur la période. */
    emptyCompetitions: string[];
    error?: string;
}

const SCORES365_SYNC_LABEL = "Basketball Europe (365scores)";

/**
 * Importe le flux 365scores en une seule requête.
 *
 * Le flux étant global, on rattache chaque match à la première ligue configurée
 * qui le reconnaît : inutile de faire un appel par ligue pour un résultat
 * identique.
 */
export async function syncScores365Basketball(): Promise<Scores365SyncResult> {
    const result: Scores365SyncResult = {
        provider: "365scores",
        label: SCORES365_SYNC_LABEL,
        sport: "basketball",
        events: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        emptyCompetitions: []
    };

    const seenCompetitions = new Set<string>();
    const handledEventIds = new Set<string>();

    try {
        const games = await fetchGames();
        result.events = games.length;

        for (const game of games) {
            const eventId = String(game.id ?? "");
            if (!eventId || handledEventIds.has(eventId)) continue;

            const league = SCORES365_LEAGUES.find((cfg) => leagueMatchesGame(cfg, game));
            if (!league) continue;

            const mapped = mapScores365Game(league, game);
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
    } catch (error) {
        result.error = error instanceof Error ? error.message : "Erreur inconnue";
    }

    result.emptyCompetitions = SCORES365_LEAGUES.map((cfg) => cfg.label).filter(
        (label) => !seenCompetitions.has(label)
    );

    return result;
}

export async function syncScores365Leagues(): Promise<Scores365SyncResult[]> {
    return [await syncScores365Basketball()];
}

async function finishScores365Match(input: {
    providerEventId: string;
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
             WHERE provider = '365scores'
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

export interface Scores365ResultsSummary {
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

const SCORES365_LABEL = "Basketball Europe (365scores)";

export async function syncScores365Results(): Promise<Scores365ResultsSummary> {
    const summary: Scores365ResultsSummary = {
        provider: "365scores",
        league: "basketball",
        label: SCORES365_LABEL,
        sport: "basketball",
        checked: 0,
        finished: 0,
        skipped: 0
    };

    try {
        const games = await fetchGames();

        for (const game of games) {
            const league = SCORES365_LEAGUES.find((cfg) => leagueMatchesGame(cfg, game));
            if (!league) continue;

            const result = mapFinishedScores365Game(game);
            if (!result) continue;

            summary.checked += 1;
            const applied = await finishScores365Match({
                providerEventId: result.provider_event_id,
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
    } catch (error) {
        summary.error = error instanceof Error ? error.message : "Erreur inconnue";
    }

    return summary;
}

export async function syncAllScores365Results(): Promise<Scores365ResultsSummary[]> {
    return [await syncScores365Results()];
}

export function scores365Leagues(): LeagueConfig[] {
    return SCORES365_LEAGUES;
}