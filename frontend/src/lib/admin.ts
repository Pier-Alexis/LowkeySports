import { apiFetch } from "./auth";
import type { Article, Match } from "./api";

export interface SyncSummary {
    imported: number;
    updated: number;
    skipped: number;
}

export interface SyncResponse {
    message: string;
    totals: SyncSummary;
    leagues: { id: string; sport: string; imported: number; updated: number; skipped: number }[];
}

export function adminGetMatches(): Promise<Match[]> {
    return apiFetch<Match[]>("/matches");
}

export function syncMatches(): Promise<SyncSummary> {
    return apiFetch<SyncResponse>("/sync/matches", { method: "POST" }).then((res) => res.totals);
}

export interface ResultsSyncSummary {
    imported: number;
    updated: number;
    skipped: number;
    checked: number;
    finished: number;
}

export interface ResultsSyncResponse {
    message: string;
    totals: ResultsSyncSummary;
    leagues: { id: string; sport: string; checked: number; finished: number; skipped: number }[];
}

export function syncResults(): Promise<ResultsSyncSummary> {
    return apiFetch<ResultsSyncResponse>("/sync/results", { method: "POST" }).then((res) => res.totals);
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