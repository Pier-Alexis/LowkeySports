import { db } from "../database/database.js";
import { DEFAULT_LEAGUES, LeagueConfig } from "../config/leagues.js";
import { mapSportsDbEvent, parseEventTimestamp } from "../utils/sportsDbMapper.js";

const SPORTSDB_API_KEY = process.env.SPORTSDB_API_KEY || "3";
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}`;

export interface LeagueSyncResult {
    leagueId: string;
    sport: string;
    events: number;
    imported: number;
    updated: number;
    skipped: number;
    error?: string;
}

async function fetchJson(path: string): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${BASE_URL}/${path}`, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`TheSportsDB a répondu ${response.status}`);
        }
        return (await response.json()) as Record<string, unknown>;
    } finally {
        clearTimeout(timeout);
    }
}

const UPSERT_MATCH_SQL = `
    INSERT INTO matches (
        provider, provider_event_id, sport, competition,
        home_team, away_team, home_team_logo, away_team_logo,
        scheduled_at, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled')
    ON CONFLICT (provider, provider_event_id)
    DO UPDATE SET
        home_team = EXCLUDED.home_team,
        away_team = EXCLUDED.away_team,
        home_team_logo = EXCLUDED.home_team_logo,
        away_team_logo = EXCLUDED.away_team_logo,
        competition = EXCLUDED.competition,
        sport = EXCLUDED.sport,
        scheduled_at = EXCLUDED.scheduled_at
    WHERE matches.status = 'scheduled'
    RETURNING (xmax = 0) AS inserted
`;

export async function syncLeague(cfg: LeagueConfig): Promise<LeagueSyncResult> {
    const body = await fetchJson(`eventsnextleague.php?id=${encodeURIComponent(cfg.id)}`);
    const events = Array.isArray(body.events) ? (body.events as Record<string, unknown>[]) : [];

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const event of events) {
        const mapped = mapSportsDbEvent(event, cfg.sport);

        if (!mapped || !parseEventTimestamp(event)) {
            skipped += 1;
            continue;
        }

        const result = await db.query(UPSERT_MATCH_SQL, [
            mapped.provider,
            mapped.provider_event_id,
            mapped.sport,
            mapped.competition,
            mapped.home_team,
            mapped.away_team,
            mapped.home_team_logo,
            mapped.away_team_logo,
            mapped.scheduled_at
        ]);

        if (result.rows.length === 0) {
            skipped += 1;
        } else if (result.rows[0].inserted === true) {
            imported += 1;
        } else {
            updated += 1;
        }
    }

    return {
        leagueId: cfg.id,
        sport: cfg.sport,
        events: events.length,
        imported,
        updated,
        skipped
    };
}

export async function syncLeagues(leagues: LeagueConfig[] = DEFAULT_LEAGUES): Promise<LeagueSyncResult[]> {
    const results: LeagueSyncResult[] = [];

    for (const league of leagues) {
        try {
            results.push(await syncLeague(league));
        } catch (error) {
            results.push({
                leagueId: league.id,
                sport: league.sport,
                events: 0,
                imported: 0,
                updated: 0,
                skipped: 0,
                error: error instanceof Error ? error.message : "Erreur inconnue"
            });
        }
    }

    return results;
}

export interface SearchLeagueResult {
    id: string;
    name: string;
    sport: string;
}

export async function searchLeagues(sport: string): Promise<SearchLeagueResult[]> {
    const body = await fetchJson(`search_all_leagues.php?s=${encodeURIComponent(sport)}`);
    const leagues = Array.isArray(body.leagues)
        ? (body.leagues as Record<string, unknown>[])
        : Array.isArray(body.countries)
          ? (body.countries as Record<string, unknown>[])
          : [];

    return leagues.map((league) => ({
        id: String(league.idLeague),
        name: typeof league.strLeague === "string" ? league.strLeague : "",
        sport: typeof league.strSport === "string" ? league.strSport : ""
    }));
}