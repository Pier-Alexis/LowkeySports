import { db } from "../database/database.js";
import { teamNamesMatch } from "./resultsSync.js";

export interface FormEntry {
    opponent: string;
    at_home: boolean;
    result: "W" | "D" | "L";
    home_score: number;
    away_score: number;
    date: string;
}

export interface HeadToHeadEntry {
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    winner: string;
    date: string;
}

const RECENT_MATCHES = 120;

interface FinishedRow {
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    winner: string;
    scheduled_at: string;
}

async function recentFinishedRows(sport: string): Promise<FinishedRow[]> {
    const result = await db.query(
        `SELECT home_team, away_team, home_score, away_score, winner, scheduled_at
         FROM matches
         WHERE sport = $1 AND status = 'finished'
           AND home_score IS NOT NULL AND away_score IS NOT NULL AND winner IS NOT NULL
         ORDER BY scheduled_at DESC
         LIMIT $2`,
        [sport, RECENT_MATCHES]
    );
    return result.rows as FinishedRow[];
}

function outcomeFor(row: FinishedRow, atHome: boolean): "W" | "D" | "L" {
    if (row.winner === "draw") return "D";
    const won = (atHome && row.winner === "home") || (!atHome && row.winner === "away");
    return won ? "W" : "L";
}

export async function getTeamForm(sport: string, team: string): Promise<FormEntry[]> {
    const rows = await recentFinishedRows(sport);
    const entries: FormEntry[] = [];

    for (const row of rows) {
        const atHome = teamNamesMatch(row.home_team, team);
        const atAway = teamNamesMatch(row.away_team, team);
        if (!atHome && !atAway) continue;

        entries.push({
            opponent: atHome ? row.away_team : row.home_team,
            at_home: atHome,
            result: outcomeFor(row, atHome),
            home_score: Number(row.home_score),
            away_score: Number(row.away_score),
            date: row.scheduled_at
        });

        if (entries.length === 5) break;
    }

    return entries;
}

export async function getHeadToHead(
    sport: string,
    home: string,
    away: string
): Promise<HeadToHeadEntry[]> {
    const rows = await recentFinishedRows(sport);
    const entries: HeadToHeadEntry[] = [];

    for (const row of rows) {
        const sameOrder = teamNamesMatch(row.home_team, home) && teamNamesMatch(row.away_team, away);
        const swapped = teamNamesMatch(row.home_team, away) && teamNamesMatch(row.away_team, home);
        if (!sameOrder && !swapped) continue;

        entries.push({
            home_team: row.home_team,
            away_team: row.away_team,
            home_score: Number(row.home_score),
            away_score: Number(row.away_score),
            winner: row.winner,
            date: row.scheduled_at
        });

        if (entries.length === 5) break;
    }

    return entries;
}