import { Router } from "express";
import { db } from "../database/database.js";
import { optionalAuth, auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { finishMatch } from "../services/matches.js";
import { validateMatchInput, validateMatchResultInput } from "../utils/validation.js";
import { ApiError, badRequest } from "../utils/errors.js";
import { MATCH_STATUSES } from "../types/match.js";
import { AuthRequest } from "../types/auth.js";

const router = Router();

const SELECT_CSV = `
    id, sport, competition, home_team, away_team, scheduled_at, status,
    home_score, away_score, winner, created_at
`;

export function parsePositiveId(raw: unknown): number {
    const id = typeof raw === "string" ? Number(raw) : Number.NaN;
    if (!Number.isInteger(id) || id <= 0) {
        throw badRequest("ID invalide");
    }
    return id;
}

router.get("/", optionalAuth, async (req: AuthRequest, res) => {
    const { status, sport, competition } = req.query;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status !== undefined) {
        if (typeof status !== "string" || !(MATCH_STATUSES as readonly string[]).includes(status)) {
            throw badRequest("Statut de match invalide");
        }
        params.push(status);
        conditions.push(`status = $${params.length}`);
    } else if (req.user?.role !== "admin") {
        conditions.push("status = 'scheduled'");
        conditions.push("scheduled_at > NOW()");
    }

    if (typeof sport === "string" && sport.trim()) {
        params.push(sport.trim());
        conditions.push(`sport = $${params.length}`);
    }

    if (typeof competition === "string" && competition.trim()) {
        params.push(competition.trim());
        conditions.push(`competition = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await db.query(
        `SELECT ${SELECT_CSV}
         FROM matches
         ${where}
         ORDER BY scheduled_at ASC`,
        params
    );

    res.json(result.rows);
});

router.get("/:id", optionalAuth, async (req: AuthRequest, res) => {
    const id = parsePositiveId(req.params.id);

    const matchResult = await db.query(
        `SELECT ${SELECT_CSV} FROM matches WHERE id = $1`,
        [id]
    );

    if (matchResult.rows.length === 0) {
        throw new ApiError(404, "Match introuvable");
    }

    const match = matchResult.rows[0];

    if (req.user) {
        const prediction = await db.query(
            `SELECT pick FROM predictions WHERE user_id = $1 AND match_id = $2`,
            [req.user.id, id]
        );

        if (prediction.rows.length > 0) {
            match.myPrediction = prediction.rows[0].pick;
        }
    }

    res.json(match);
});

router.post("/", auth, requireRole("admin"), async (req, res) => {
    const { sport, competition, homeTeam, awayTeam, scheduledAt } = validateMatchInput(req.body);

    const result = await db.query(
        `INSERT INTO matches (sport, competition, home_team, away_team, scheduled_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${SELECT_CSV}`,
        [sport, competition || null, homeTeam, awayTeam, scheduledAt]
    );

    res.status(201).json(result.rows[0]);
});

router.patch("/:id", auth, requireRole("admin"), async (req, res) => {
    const id = parsePositiveId(req.params.id);
    const { sport, competition, homeTeam, awayTeam, scheduledAt } = validateMatchInput(req.body);

    const result = await db.query(
        `UPDATE matches
         SET sport = $2,
             competition = $3,
             home_team = $4,
             away_team = $5,
             scheduled_at = $6
         WHERE id = $1 AND status = 'scheduled'
         RETURNING ${SELECT_CSV}`,
        [id, sport, competition || null, homeTeam, awayTeam, scheduledAt]
    );

    if (result.rows.length === 0) {
        const exists = await db.query(`SELECT status FROM matches WHERE id = $1`, [id]);
        if (exists.rows.length === 0) {
            throw new ApiError(404, "Match introuvable");
        }
        throw new ApiError(409, "Un match commencé ou terminé ne peut plus être modifié");
    }

    res.json({ message: "Match mis à jour", match: result.rows[0] });
});

router.post("/:id/result", auth, requireRole("admin"), async (req, res) => {
    const id = parsePositiveId(req.params.id);
    const { homeScore, awayScore } = validateMatchResultInput(req.body);

    const match = await finishMatch(id, homeScore, awayScore);

    res.json({
        message: "Match terminé",
        match
    });
});

export default router;