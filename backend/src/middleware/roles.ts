import { NextFunction, Response } from "express";
import { AuthRequest, Role } from "../types/auth.js";

export function requireRole(...allowedRoles: Role[]) {
    // Le rôle "developer" hérite de tous les accès réservés à l'admin.
    const effective: Role[] = allowedRoles.includes("admin")
        ? Array.from(new Set([...allowedRoles, "developer"]))
        : allowedRoles;

    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const userRole = req.user?.role;

        if (!userRole || !effective.includes(userRole)) {
            return res.status(403).json({ error: "Accès refusé" });
        }

        next();
    };
}