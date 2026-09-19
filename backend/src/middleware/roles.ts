import { NextFunction, Response } from "express";
import { AuthRequest, Role } from "../types/auth.js";

export function requireRole(...allowedRoles: Role[]) {
    // L'admin est inclus dans les roles privilégiés ; le developer et l'owner
    // partagent les mêmes pouvoirs (impersonation, changement de mot de passe).
    const expanded: Role[] = [];
    for (const role of allowedRoles) {
        expanded.push(role);
        if (role === "admin") {
            expanded.push("developer", "owner");
        } else if (role === "developer") {
            expanded.push("owner");
        }
    }
    const effective = Array.from(new Set(expanded));

    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const userRole = req.user?.role;

        if (!userRole || !effective.includes(userRole)) {
            return res.status(403).json({ error: "Accès refusé" });
        }

        next();
    };
}