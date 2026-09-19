import { AuthUser, isAdminRole } from "../types/auth.js";

export function canAccessUserProfile(actor: AuthUser, targetUserId: number) {
    if (isAdminRole(actor.role)) return true;
    return actor.id === targetUserId;
}

export function canManageUserRole(actor: AuthUser) {
    return isAdminRole(actor.role);
}