import { db } from "../database/database.js";
import { ESPN_LEAGUES, EspnLeagueConfig } from "../config/leagues.js";
import { mapEspnEvent } from "../utils/espnMapper.js";

const BASE_URL = "https://site.api.espn.com/apis/site/v2/sports";
const DEFAULT_DAYS = 14;

export interface LeagueSyncResult {
    league: string;
    label: string;
    sport: string;
    events: number;
    imported: number;
    updated: number;
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
    const start = new Date();
    const end = new Date(Date.now() + days * 86400000);
    return `${toYmd(start)}-${toYmd(end)}`;
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

export async function syncLeague(cfg: EspnLeagueConfig, days: number): Promise<LeagueSyncResult> {
    const body = await fetchJson(
        `${cfg.espnSport}/${cfg.league}/scoreboard?dates=${dateRange(days)}`
    );
    const events = Array.isArray(body.events) ? (body.events as Record<string, unknown>[]) : [];

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const event of events) {
        const mappedList = mapEspnEvent(event, cfg);

        if (mappedList.length === 0) {
            skipped += 1;
            continue;
        }

        for (const mapped of mappedList) {
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
    }

    return {
        league: cfg.league,
        label: cfg.label,
        sport: cfg.sport,
        events: events.length,
        imported,
        updated,
        skipped
    };
}

export async function syncLeagues(
    leagues: EspnLeagueConfig[] = ESPN_LEAGUES,
    days = DEFAULT_DAYS
): Promise<LeagueSyncResult[]> {
    const results: LeagueSyncResult[] = [];

    for (const cfg of leagues) {
        try {
            results.push(await syncLeague(cfg, days));
        } catch (error) {
            results.push({
                league: cfg.league,
                label: cfg.label,
                sport: cfg.sport,
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
