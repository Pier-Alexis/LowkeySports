import { Pick } from "../types/match.js";

export type Winner = Pick;

export function computeWinner(homeScore: number, awayScore: number): Winner {
    if (homeScore > awayScore) return "home";
    if (awayScore > homeScore) return "away";
    return "draw";
}

export function computePoints(pick: Pick, winner: Winner): number {
    return pick === winner ? 1 : 0;
}