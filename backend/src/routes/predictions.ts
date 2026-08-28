import { Router } from "express";
import { db } from "../database/database.js";
import { auth } from "../middleware/auth.js";
import { AuthRequest } from "../types/auth.js";
import { validatePick, validatePredictionInput } from "../utils/validation.js";
import { ApiError, badRequest } from "../utils/errors.js";
import { parsePositiveId } from "./matches.js";

const router = Router();

router.post("/", auth, async (req: AuthRequest, res) => {
    const user = req.user!;
    const { matchId, pick } = validatePredictionInput(req.body);

    const match = await db.query(
        `SELECT id, status, scheduled_at FROM matches WHERE id = $1`,
        [matchId]
    );

    if (match.rows.length === 0) {
        throw new ApiError(404, "Match introuvable");
    }

    const row = match.rows[0];
    if (row.status !== "scheduled" || new Date(row.scheduled_at).getTime() <= Date.now()) {
        throw new ApiError(409, "Les prédictions sont fermées pour ce match");
    }

    const existing = await db.query(
        `SELECT id FROM predictions WHERE user_id = $1 AND match_id = $2`,
        [user.id, matchId]
    );

    if (existing.rows.length > 0) {
        throw new ApiError(409, "Vous avez déjà prédit pour ce match");
    }

    const result = await db.query(
        `INSERT INTO predictions (user_id, match_id, pick)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [user.id, matchId, pick]
    );

    res.status(201).json(result.rows[0]);
});

router.get("/me", auth, async (req: AuthRequest, res) => {
    const result = await db.query(
        `SELECT p.id, p.match_id, p.pick, p.points, p.created_at, p.updated_at,
                m.sport, m.competition, m.home_team, m.away_team, m.scheduled_at,
                m.status, m.winner, m.home_score, m.away_score
         FROM predictions p
         JOIN matches m ON m.id = p.match_id
         WHERE p.user_id = $1
         ORDER BY m.scheduled_at DESC`,
        [req.user!.id]
    );

    res.json(result.rows);
});

router.put("/:id", auth, async (req: AuthRequest, res) => {
    const id = parsePositiveId(req.params.id);
    const { pick } = validatePick(req.body);

    const result = await db.query(
        `UPDATE predictions
         SET pick = $2, updated_at = NOW()
         WHERE id = $1
           AND user_id = $3
           AND match_id IN (
               SELECT id FROM matches
               WHERE status = 'scheduled' AND scheduled_at > NOW()
           )
         RETURNING *`,
        [id, pick, req.user!.id]
    );

    if (result.rows.length === 0) {
        throw new ApiError(404, "Prédiction introuvable ou plus modifiable");
    }

    res.json({ message: "Prédiction mise à jour", prediction: result.rows[0] });
});

router.delete("/:id", auth, async (req: AuthRequest, res) => {
    const id = parsePositiveId(req.params.id);

    const result = await db.query(
        `DELETE FROM predictions
         WHERE id = $1
           AND user_id = $2
           AND match_id IN (
               SELECT id FROM matches
               WHERE status = 'scheduled' AND scheduled_at > NOW()
           )
         RETURNING *`,
        [id, req.user!.id]
    );

    if (result.rows.length === 0) {
        throw new ApiError(404, "Prédiction introuvable ou plus supprimable");
    }

    res.json({ message: "Prédiction supprimée", prediction: result.rows[0] });
});

router.get("/leaderboard", async (req, res) => {
    const result = await db.query(
        `SELECT u.id, u.username,
                COALESCE(SUM(p.points), 0) AS points,
                COUNT(p.id)::int AS predictions_count
         FROM predictions p
         JOIN users u ON u.id = p.user_id
         GROUP BY u.id, u.username
         ORDER BY points DESC, u.username ASC`
    );

    res.json(result.rows);
});

export default router;