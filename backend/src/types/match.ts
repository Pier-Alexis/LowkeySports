export type Pick = "home" | "away" | "draw";

export const PICKS: readonly Pick[] = ["home", "away", "draw"];

export function isPick(value: unknown): value is Pick {
    return typeof value === "string" && (PICKS as readonly string[]).includes(value);
}

export type MatchStatus = "scheduled" | "live" | "finished" | "cancelled";

export const MATCH_STATUSES: readonly MatchStatus[] = ["scheduled", "live", "finished", "cancelled"];