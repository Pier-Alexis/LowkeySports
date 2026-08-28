import { Router } from "express";
import { db } from "../database/database.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { canAccessUserProfile, canManageUserRole } from "../utils/permissions.js";
import { AuthRequest, ROLES, isRole } from "../types/auth.js";
import { ApiError, badRequest } from "../utils/errors.js";

const router = Router();

router.get("/", auth, requireRole("admin"), async (req, res) => {
    const result = await db.query(
        `SELECT id, username, email, role, created_at
         FROM users
         ORDER BY created_at DESC`
    );

    res.json(result.rows);
});

router.get("/:id", auth, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        throw badRequest("ID utilisateur invalide");
    }

    if (!canAccessUserProfile(req.user!, id)) {
        throw new ApiError(403, "Accès refusé");
    }

    const result = await db.query(
        `SELECT id, username, email, role, created_at
         FROM users
         WHERE id = $1`,
        [id]
    );

    if (result.rows.length === 0) {
        throw new ApiError(404, "Utilisateur introuvable");
    }

    res.json(result.rows[0]);
});

router.patch("/:id/role", auth, requireRole("admin"), async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    const requestedRole: unknown = req.body?.role;

    if (!Number.isInteger(id) || id <= 0) {
        throw badRequest("ID utilisateur invalide");
    }

    if (!isRole(requestedRole)) {
        throw badRequest(`Rôle invalide. Valeurs possibles : ${ROLES.join(", ")}`);
    }

    if (!canManageUserRole(req.user!)) {
        throw new ApiError(403, "Accès refusé");
    }

    const result = await db.query(
        `UPDATE users
         SET role = $1
         WHERE id = $2
         RETURNING id, username, email, role, created_at`,
        [requestedRole, id]
    );

    if (result.rows.length === 0) {
        throw new ApiError(404, "Utilisateur introuvable");
    }

    res.json({
        message: "Rôle mis à jour",
        user: result.rows[0]
    });
});

export default router;