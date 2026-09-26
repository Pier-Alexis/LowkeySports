import { Pick } from "../types/match.js";

export type Winner = Pick;

export function computeWinner(homeScore: number, awayScore: number): Winner {
    if (homeScore > awayScore) return "home";
    if (awayScore > homeScore) return "away";
    return "draw";
}

/** Valeur de confiance par défaut quand l'utilisateur n'en choisit pas. */
export const DEFAULT_CONFIDENCE = 2;

export const MIN_CONFIDENCE = 1;
export const MAX_CONFIDENCE = 5;

/**
 * Barème pondéré par la confiance.
 *
 *   confiance 1-3 (par défaut) : 0,5 pt
 *   confiance 4               : 1 pt
 *   confiance 5               : 2 pts
 *
 * Un pronostic bien placé en confiance 5 vaut donc quatre fois un coup prudent.
 * En cas d'erreur, 0 dans tous les cas.
 *
 * ⚠ Ce barème est dupliqué côté base dans la fonction `lowkey_points()`
 * (migration `010_scoring_confidence.sql`). Toute modification doit être
 * répercutée des deux côtés : `backend/src/tests/results.test.ts` vérifie la
 * concordance.
 */
export function computePoints(pick: Pick, winner: Winner, confidence?: number | null): number {
    if (pick !== winner) return 0;
    if (confidence !== null && confidence !== undefined && confidence >= 5) return 2;
    if (confidence === 4) return 1;
    return 0.5;
}

export function normalizeConfidence(value: unknown): number {
    if (typeof value !== "number" || !Number.isInteger(value)) return DEFAULT_CONFIDENCE;
    if (value < MIN_CONFIDENCE) return MIN_CONFIDENCE;
    if (value > MAX_CONFIDENCE) return MAX_CONFIDENCE;
    return value;
}
