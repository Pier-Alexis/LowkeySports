import { apiFetch } from "./auth";
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
}

export function createArticle(input: ArticleInput): Promise<Article> {
    return apiFetch<Article>("/articles", {
        method: "POST",
        body: JSON.stringify({
            matchId: input.matchId,
            title: input.title,
            content: input.content,
            pick: input.pick,
            status: input.status
        })
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

export function changeUsername(
    id: number,
    username: string
): Promise<{ message: string; user: AdminUser }> {
    return apiFetch<{ message: string; user: AdminUser }>(`/users/${id}/username`, {
        method: "PATCH",
        body: JSON.stringify({ username })
    });
}