import { Router } from "express";
import { db } from "../database/database.js";
import { auth } from "../middleware/auth.js";
import { AuthRequest } from "../types/auth.js";
import { validatePlayerInput } from "../utils/validation.js";
import { ApiError } from "../utils/errors.js";

const router = Router();

router.post("/", auth, async (req: AuthRequest, res) => {
    const user = req.user!;
    const { sport, position, age, team } = validatePlayerInput(req.body);

    const existing = await db.query(
        `SELECT id FROM players WHERE user_id = $1`,
        [user.id]
    );

    if (existing.rows.length > 0) {
        throw new ApiError(409, "Vous avez déjà un profil sportif");
    }

    const result = await db.query(
        `INSERT INTO players (user_id, sport, position, age, team)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [user.id, sport, position, age, team]
    );

    res.status(201).json({
        message: "Profil sportif créé",
        player: result.rows[0]
    });
});

router.get("/me", auth, async (req: AuthRequest, res) => {
    const result = await db.query(
        `SELECT * FROM players WHERE user_id = $1`,
        [req.user!.id]
    );

    res.json(result.rows[0] || null);
});

router.put("/me", auth, async (req: AuthRequest, res) => {
    const { sport, position, age, team } = validatePlayerInput(req.body);

    const result = await db.query(
        `UPDATE players
         SET sport = $1,
             position = $2,
             age = $3,
             team = $4
         WHERE user_id = $5
         RETURNING *`,
        [sport, position, age, team, req.user!.id]
    );

    if (result.rows.length === 0) {
        throw new ApiError(404, "Profil sportif introuvable");
    }

    res.json({
        message: "Profil sportif mis à jour",
        player: result.rows[0]
    });
});

router.delete("/me", auth, async (req: AuthRequest, res) => {
    const result = await db.query(
        `DELETE FROM players WHERE user_id = $1 RETURNING *`,
        [req.user!.id]
    );

    if (result.rows.length === 0) {
        throw new ApiError(404, "Profil sportif introuvable");
    }

    res.json({
        message: "Profil sportif supprimé",
        player: result.rows[0]
    });
});

export default router;