import { apiFetch, StoredUser } from "./auth";
import type { Article, Match } from "./api";

export interface SyncSummary {
    imported: number;
    updated: number;
    skipped: number;
}

/**
 * Rapport par source. `error` n'est pas décoratif : une source qui répond 403
 * ou 500 est renvoyée en HTTP 200 avec son message dans ce champ, donc une
 * interface qui n'afficherait que `totals` présenterait un import « réussi »
 * alors que la source est morte.
 */
export interface SyncLeagueResult {
    provider: string;
    label?: string;
    sport?: string;
    imported: number;
    updated: number;
    skipped: number;
    error?: string;
    emptyCompetitions?: string[];
}

export interface SyncResponse {
    message: string;
    totals: SyncSummary;
    leagues: SyncLeagueResult[];
}

export function adminGetMatches(): Promise<Match[]> {
    return apiFetch<Match[]>("/matches");
}

export function syncMatches(): Promise<SyncResponse> {
    return apiFetch<SyncResponse>("/sync/matches", { method: "POST" });
}

export interface ResultsSyncSummary {
    imported: number;
    updated: number;
    skipped: number;
    checked: number;
    finished: number;
}

export interface ResultsSyncLeagueResult {
    provider: string;
    label?: string;
    sport?: string;
    checked: number;
    finished: number;
    skipped: number;
    error?: string;
}

export interface ResultsSyncResponse {
    message: string;
    totals: ResultsSyncSummary;
    leagues: ResultsSyncLeagueResult[];
}

export function syncResults(): Promise<ResultsSyncResponse> {
    return apiFetch<ResultsSyncResponse>("/sync/results", { method: "POST" });
}

export function adminGetArticles(): Promise<Article[]> {
    return apiFetch<Article[]>("/articles");
}

export interface ArticleInput {
    matchId: number;
    title: string;
    content: string;
    pick: string;
    status: string;
    confidence: number | null;
}

export interface ArticleUpdateInput {
    title?: string;
    content?: string;
    pick?: string;
    status?: string;
    confidence?: number | null;
}

export function createArticle(input: ArticleInput): Promise<Article> {
    return apiFetch<Article>("/articles", {
        method: "POST",
        body: JSON.stringify({
            matchId: input.matchId,
            title: input.title,
            content: input.content,
            pick: input.pick,
            status: input.status,
            confidence: input.confidence ?? null
        })
    });
}

export function updateArticle(id: number, input: ArticleUpdateInput): Promise<Article> {
    const body: Record<string, unknown> = {};
    if (input.title !== undefined) body.title = input.title;
    if (input.content !== undefined) body.content = input.content;
    if (input.pick !== undefined) body.pick = input.pick;
    if (input.status !== undefined) body.status = input.status;
    if (input.confidence !== undefined) body.confidence = input.confidence;

    return apiFetch<Article>(`/articles/${id}`, {
        method: "PUT",
        body: JSON.stringify(body)
    });
}

export function deleteArticle(id: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/articles/${id}`, { method: "DELETE" });
}

export interface AdminUser {
    id: number;
    username: string;
    email: string;
    role: string;
    created_at: string;
}

export function adminGetUsers(): Promise<AdminUser[]> {
    return apiFetch<AdminUser[]>("/users");
}

export function adminSetUserRole(
    id: number,
    role: "user" | "expert" | "admin"
): Promise<{ message: string; user: AdminUser }> {
    return apiFetch<{ message: string; user: AdminUser }>(`/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role })
    });
}

export function adminSetUserPassword(id: number, password: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/users/${id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password })
    });
}

export function adminDeleteUser(id: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/users/${id}`, {
        method: "DELETE"
    });
}

export interface ImpersonateResponse {
    message: string;
    user: StoredUser;
    accessToken: string;
    refreshToken: string;
}

export function impersonateUser(userId: number): Promise<ImpersonateResponse> {
    return apiFetch<ImpersonateResponse>("/auth/impersonate", {
        method: "POST",
        body: JSON.stringify({ userId })
    });
}

export function changeUsername(
    id: number,
    username: string
): Promise<{ message: string; user: AdminUser }> {
    return apiFetch<{ message: string; user: AdminUser }>(`/users/${id}/username`, {
        method: "PATCH",
        body: JSON.stringify({ username })
    });
}