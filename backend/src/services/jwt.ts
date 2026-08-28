import jwt from "jsonwebtoken";
import { AuthUser, isRole } from "../types/auth.js";

export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("JWT_SECRET est requis en production");
        }
        console.warn("JWT_SECRET manquant — utilisation du secret de développement");
        return "dev_secret";
    }

    return secret;
}

export function createAccessToken(user: AuthUser): string {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role
        },
        getJwtSecret(),
        {
            expiresIn: "15m"
        }
    );
}

export function verifyAccessToken(token: string): AuthUser {
    const decoded = jwt.verify(token, getJwtSecret());

    if (typeof decoded === "string" || !Number.isInteger(decoded.id) || !isRole(decoded.role)) {
        throw new jwt.JsonWebTokenError("Token invalide");
    }

    return {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
    };
}