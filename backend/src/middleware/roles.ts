import { NextFunction, Response } from "express";
import { AuthRequest, Role } from "../types/auth.js";

export function requireRole(...allowedRoles: Role[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const userRole = req.user?.role;

        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({ error: "Accès refusé" });
        }

        next();
    };
}