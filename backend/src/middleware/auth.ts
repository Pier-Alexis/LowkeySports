import { NextFunction, Response } from "express";
import { verifyAccessToken } from "../services/jwt.js";
import { AuthRequest } from "../types/auth.js";

export function auth(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Token manquant ou invalide"
        });
    }

    const token = header.split(" ")[1];

    try {
        req.user = verifyAccessToken(token);
        next();
    } catch {
        return res.status(401).json({
            error: "Token manquant ou invalide"
        });
    }
}

export function optionalAuth(
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return next();
    }

    const token = header.split(" ")[1];

    try {
        req.user = verifyAccessToken(token);
    } catch {
        // token invalide ignoré : le visiteur reste anonyme
    }

    next();
}