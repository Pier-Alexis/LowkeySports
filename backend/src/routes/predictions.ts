import { Router } from "express";
import { db } from "../database/database.js";
import { auth } from "../middleware/auth.js";
import { AuthRequest } from "../types/auth.js";
import { validatePick, validatePredictionInput } from "../utils/validation.js";
import { ApiError, badRequest } from "../utils/errors.js";
import { NOT_PLACEHOLDER_TEAMS_SQL } from "../utils/placeholder.js";
import { parsePositiveId } from "./matches.js";

const router = Router();

router.post("/", auth, async (req: AuthRequest, res) => {
    const user = req.user!;
    const { matchId, pick, confidence } = validatePredictionInput(req.body);

    // Un match dont un participant est inconnu n'est jamais pronostiquable : il
    // n'est de toute façon pas affiché par `GET /matches`.
    const match = await db.query(
        `SELECT id, status, scheduled_at FROM matches
         WHERE id = $1 AND ${NOT_PLACEHOLDER_TEAMS_SQL}`,
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
        `INSERT INTO predictions (user_id, match_id, pick, confidence)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [user.id, matchId, pick, confidence]
    );

    res.status(201).json(result.rows[0]);
});

router.get("/me", auth, async (req: AuthRequest, res) => {
    const result = await db.query(
        `SELECT p.id, p.match_id, p.pick, p.confidence, p.points, p.created_at, p.updated_at,
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
    const { pick, confidence } = validatePick(req.body);

    const result = await db.query(
        `UPDATE predictions
         SET pick = $2, confidence = $3, updated_at = NOW()
         WHERE id = $1
           AND user_id = $4
           AND match_id IN (
               SELECT id FROM matches
               WHERE status = 'scheduled' AND scheduled_at > NOW()
           )
         RETURNING *`,
        [id, pick, confidence, req.user!.id]
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
                COUNT(p.id)::int AS predictions_count,
                COUNT(p.id) FILTER (WHERE p.points > 0)::int AS wins,
                COUNT(p.id) FILTER (WHERE p.points = 0)::int AS losses,
                COALESCE(SUM(p.points), 0)::numeric AS points,
                COALESCE(AVG(p.confidence), 0)::numeric AS avg_confidence,
                COALESCE(MAX(p.points), 0)::numeric AS best_pick
         FROM predictions p
         JOIN matches m ON m.id = p.match_id
         JOIN users u ON u.id = p.user_id
         GROUP BY u.id, u.username
         ORDER BY points DESC, wins DESC, u.username ASC`
    );

    const rows = result.rows.map((row) => {
        const evaluated = Number(row.wins) + Number(row.losses);
        return {
            user_id: row.id,
            username: row.username,
            predictions_count: Number(row.predictions_count),
            wins: Number(row.wins),
            losses: Number(row.losses),
            points: Math.round(Number(row.points) * 10) / 10,
            avg_confidence: Math.round(Number(row.avg_confidence) * 10) / 10,
            best_pick: Math.round(Number(row.best_pick) * 10) / 10,
            win_rate: evaluated > 0 ? Math.round((Number(row.wins) * 1000) / evaluated) / 10 : 0
        };
    });

    res.json(rows);
});

export default router;