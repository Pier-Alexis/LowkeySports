import { db } from "../database/database.js";
import { ESPN_ONLY_LEAGUES, LeagueConfig } from "../config/leagues.js";
import { mapEspnEvent } from "../utils/espnMapper.js";
import { fetchJson as fetchJsonFromEspn, HttpError } from "../utils/http.js";

const BASE_URL = "https://site.api.espn.com/apis/site/v2/sports";
const DEFAULT_DAYS = 14;

export interface LeagueSyncResult {
    provider: string;
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
    return fetchJsonFromEspn<Record<string, unknown>>(`${BASE_URL}/${path}`);
}

function toYmd(date: Date): string {
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}${mm}${dd}`;
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

/**
 * URL du scoreboard d'une ligue pour une journée isolée.
 *
 * ESPN refuse la plage `dates=YYYYMMDD-YYYYMMDD` sur la plupart des sports
 * (`HTTP 400 - Failed to get events endpoint`) : seule la journée unique
 * fonctionne. D'où `fetchEspnEvents`, qui balaie les journées une à une.
 */
export function espnScoreboardDayPath(cfg: LeagueConfig, ymd: string): string {
    const base = `${cfg.espnSport}/${cfg.league}/scoreboard?dates=${ymd}`;
    return cfg.query ? `${base}&${cfg.query}` : base;
}

/** Programme du jour par défaut de la ligue, sans paramètre `dates`. */
export function espnScoreboardPath(cfg: LeagueConfig): string {
    const base = `${cfg.espnSport}/${cfg.league}/scoreboard`;
    return cfg.query ? `${base}&${cfg.query}` : base;
}

/** Les `days` journées qui commencent aujourd'hui, au format `YYYYMMDD`. */
export function espnDayList(days: number, from: Date = new Date()): string[] {
    const count = Math.max(1, Math.floor(days));
    return Array.from({ length: count }, (_, index) => toYmd(new Date(from.getTime() + index * 86400000)));
}

function toEvents(body: Record<string, unknown>): Record<string, unknown>[] {
    return Array.isArray(body.events) ? (body.events as Record<string, unknown>[]) : [];
}

function eventKey(event: Record<string, unknown>): string {
    const id = event.id;
    if (id !== undefined && id !== null) return String(id);
    const competition = (event.competitions as Record<string, unknown>[] | undefined)?.[0];
    const date = String(event.date ?? "");
    return `${date}|${String(competition?.id ?? "")}`;
}

/**
 * Ramène les événements d'une ligue sur la fenêtre demandée.
 *
 * Les journées sont balayées une par une et dédupliquées par identifiant, ESPN
 * renvoyant parfois le même match sur deux jours. Une journée en échec est
 * ignorée plutôt que fatale : le but est de ramasser les matchs, pas d'exiger
 * une réponse parfaite. Les rares endpoints qui refusent même `dates` tombent
 * sur le programme du jour.
 *
 * `from` permet de regarder vers le passé : la clôture des résultats s'intéresse
 * aux journées écoulées, l'import aux jours à venir.
 */
export async function fetchEspnEvents(
    cfg: LeagueConfig,
    days: number,
    from: Date = new Date()
): Promise<Record<string, unknown>[]> {
    const collected = new Map<string, Record<string, unknown>>();

    for (const ymd of espnDayList(days, from)) {
        let body: Record<string, unknown>;

        try {
            body = await fetchJson(espnScoreboardDayPath(cfg, ymd));
        } catch (error) {
            if (error instanceof HttpError && error.status === 400) {
                const fallback = await fetchJson(espnScoreboardPath(cfg));
                for (const event of toEvents(fallback)) {
                    collected.set(eventKey(event), event);
                }
                return [...collected.values()];
            }
            continue;
        }

        for (const event of toEvents(body)) {
            collected.set(eventKey(event), event);
        }
    }

    return [...collected.values()];
}

export async function syncLeague(cfg: LeagueConfig, days: number): Promise<LeagueSyncResult> {
    const events = await fetchEspnEvents(cfg, days);

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
                mapped.scheduled_at,
                mapped.flashscore_url
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
        provider: cfg.provider,
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
    leagues: LeagueConfig[] = ESPN_ONLY_LEAGUES,
    days = DEFAULT_DAYS
): Promise<LeagueSyncResult[]> {
    const results: LeagueSyncResult[] = [];

    for (const cfg of leagues) {
        try {
            results.push(await syncLeague(cfg, days));
        } catch (error) {
            results.push({
                provider: cfg.provider,
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
