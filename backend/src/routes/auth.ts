import { Router } from "express";
import bcrypt from "bcrypt";
import { rateLimit } from "express-rate-limit";
import { db } from "../database/database.js";
import { createAccessToken, verifyAccessToken } from "../services/jwt.js";
import {
    createRefreshTokenForUser,
    rotateRefreshToken,
    revokeRefreshToken,
    revokeAllTokensForUser
} from "../services/refreshTokens.js";
import { validateLoginInput, validatePasswordChangeInput, validateRegistrationInput } from "../utils/validation.js";
import { badRequest, unauthorized } from "../utils/errors.js";
import { AuthRequest, AuthUser, isRole } from "../types/auth.js";
import { isAdminEmail } from "../services/adminEmails.js";
import { auth } from "../middleware/auth.js";

const router = Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Trop de tentatives de connexion. Réessayez plus tard." }
});

router.post("/register", async (req, res) => {
    const { username, email, password } = validateRegistrationInput(req.body);

    const existingUser = await db.query(
        `SELECT id FROM users WHERE email = $1 OR username = $2`,
        [email, username]
    );

    if (existingUser.rows.length > 0) {
        throw badRequest("Un compte avec cet email ou ce nom d'utilisateur existe déjà");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const desiredRole = isAdminEmail(email) ? "admin" : "user";

    const result = await db.query(
        `INSERT INTO users (username, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, role`,
        [username, email, passwordHash, desiredRole]
    );

    const user: AuthUser = result.rows[0];
    const accessToken = createAccessToken(user);
    const refreshToken = await createRefreshTokenForUser(user.id);

    res.status(201).json({
        message: "Compte créé",
        user,
        accessToken,
        refreshToken
    });
});

router.post("/login", loginLimiter, async (req, res) => {
    const { email, password } = validateLoginInput(req.body);

    const result = await db.query(
        `SELECT * FROM users WHERE email = $1`,
        [email]
    );

    const user = result.rows[0];

    const passwordValid =
        typeof user?.password_hash === "string" &&
        (await bcrypt.compare(password, user.password_hash).catch(() => false));

    if (!user || !passwordValid) {
        throw unauthorized("Email ou mot de passe incorrect");
    }

    if (isAdminEmail(email) && user.role !== "admin") {
        const promoted = await db.query(
            `UPDATE users SET role = 'admin' WHERE id = $1 RETURNING role`,
            [user.id]
        );
        if (promoted.rows.length > 0) {
            user.role = promoted.rows[0].role;
        }
    }

    const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        role: isRole(user.role) ? user.role : "user"
    };

    const accessToken = createAccessToken(authUser);
    const refreshToken = await createRefreshTokenForUser(authUser.id);

    res.json({
        message: "Connexion réussie",
        user: authUser,
        accessToken,
        refreshToken
    });
});

router.post("/refresh", async (req, res) => {
    const refreshToken = extractRefreshToken(req.body);
    const { accessUserId, newToken } = await rotateRefreshToken(refreshToken);

    const result = await db.query(
        `SELECT id, username, email, role FROM users WHERE id = $1`,
        [accessUserId]
    );

    if (result.rows.length === 0) {
        throw unauthorized("Utilisateur introuvable");
    }

    const user: AuthUser = result.rows[0];
    const accessToken = createAccessToken(user);

    res.json({
        accessToken,
        refreshToken: newToken,
        user
    });
});

router.post("/logout", async (req, res) => {
    const refreshToken = extractRefreshToken(req.body);
    await revokeRefreshToken(refreshToken);
    res.status(204).end();
});

router.post("/logout-all", async (req, res) => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        throw unauthorized("Token manquant ou invalide");
    }

    const user = verifyAccessToken(header.split(" ")[1]);
    await revokeAllTokensForUser(user.id);
    res.status(204).end();
});

router.patch("/password", auth, async (req: AuthRequest, res) => {
    const { currentPassword, newPassword } = validatePasswordChangeInput(req.body);

    const result = await db.query(
        `SELECT id, password_hash FROM users WHERE id = $1`,
        [req.user!.id]
    );

    const row = result.rows[0];
    if (!row) {
        throw unauthorized("Utilisateur introuvable");
    }

    const currentValid =
        typeof row.password_hash === "string" &&
        (await bcrypt.compare(currentPassword, row.password_hash).catch(() => false));

    if (!currentValid) {
        throw unauthorized("Mot de passe actuel incorrect");
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const updated = await db.query(
        `UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id`,
        [newHash, req.user!.id]
    );

    await revokeAllTokensForUser(req.user!.id);

    res.json({ message: "Mot de passe modifié. Reconnecte-toi avec ton nouveau mot de passe." });
});

function extractRefreshToken(body: unknown): string {
    const token = (body as Record<string, unknown> | null)?.refreshToken;
    if (typeof token !== "string" || !token) {
        throw badRequest("Refresh token manquant");
    }
    return token;
}

export default router;