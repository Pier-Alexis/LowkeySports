import { AuthUser } from "../types/auth.js";

export function canAccessUserProfile(actor: AuthUser, targetUserId: number) {
    if (actor.role === "admin") return true;
    return actor.id === targetUserId;
}

export function canManageUserRole(actor: AuthUser) {
    return actor.role === "admin";
}