import { Request } from "express";

export type Role = "user" | "expert" | "admin" | "developer" | "owner";

export const ROLES: readonly Role[] = ["user", "expert", "admin", "developer", "owner"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export const PRIVILEGED_ROLES: readonly Role[] = ["developer", "owner"];

export function isAdminRole(role: Role): boolean {
  return role === "admin" || role === "developer" || role === "owner";
}

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}