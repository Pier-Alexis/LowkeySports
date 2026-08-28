import { db } from "../database/database.js";
import { generateRefreshToken, hashRefreshToken } from "../utils/tokens.js";
import { unauthorized } from "../utils/errors.js";

export const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

interface RefreshTokenRow {
    id: number;
    user_id: number;
}

export async function createRefreshTokenForUser(userId: number): Promise<string> {
    const token = generateRefreshToken();
    const tokenHash = hashRefreshToken(token);

    await db.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + $3::interval)
         RETURNING id`,
        [userId, tokenHash, `${REFRESH_TOKEN_LIFETIME_MS} milliseconds`]
    );

    return token;
}

export async function rotateRefreshToken(oldToken: string): Promise<{ accessUserId: number; newToken: string }> {
    const stored = await findValidToken(oldToken);

    if (!stored) {
        throw unauthorized("Refresh token invalide ou expiré");
    }

    await revokeTokenById(stored.id);
    const newToken = await createRefreshTokenForUser(stored.user_id);

    return { accessUserId: stored.user_id, newToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
    await db.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE token_hash = $1 AND revoked_at IS NULL`,
        [hashRefreshToken(token)]
    );
}

export async function revokeAllTokensForUser(userId: number): Promise<void> {
    await db.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId]
    );
}

async function findValidToken(token: string): Promise<RefreshTokenRow | null> {
    const result = await db.query(
        `SELECT id, user_id
         FROM refresh_tokens
         WHERE token_hash = $1
           AND revoked_at IS NULL
           AND expires_at > NOW()`,
        [hashRefreshToken(token)]
    );

    return result.rows[0] ?? null;
}

async function revokeTokenById(id: number): Promise<void> {
    await db.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE id = $1`,
        [id]
    );
}

export async function cleanupExpiredRefreshTokens(): Promise<void> {
    await db.query(
        `DELETE FROM refresh_tokens
         WHERE expires_at <= NOW() OR revoked_at IS NOT NULL`
    );
}