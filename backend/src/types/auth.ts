import { Request } from "express";

export type Role = "user" | "expert" | "admin";

export const ROLES: readonly Role[] = ["user", "expert", "admin"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}