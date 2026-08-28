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

export function updateArticle(id: number, input: ArticleInput): Promise<{ message: string; article: Article }> {
    return apiFetch<{ message: string; article: Article }>(`/articles/${id}`, {
        method: "PUT",
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