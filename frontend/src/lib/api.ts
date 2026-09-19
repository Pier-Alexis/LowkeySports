import { apiFetch } from "./auth";

export interface Match {
    id: number;
    sport: string;
    competition: string | null;
    home_team: string;
    away_team: string;
    home_team_logo: string | null;
    away_team_logo: string | null;
    scheduled_at: string;
    status: string;
    home_score: number | null;
    away_score: number | null;
    winner: string | null;
    myPrediction?: string;
    home_form?: FormEntry[];
    away_form?: FormEntry[];
    head_to_head?: HeadToHeadEntry[];
}

export interface FormEntry {
    opponent: string;
    at_home: boolean;
    result: "W" | "D" | "L";
    home_score: number;
    away_score: number;
    date: string;
}

export interface HeadToHeadEntry {
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    winner: string;
    date: string;
}

export interface LeaderboardEntry {
    user_id: number;
    username: string;
    role: string;
    wins: number;
    losses: number;
    total: number;
    points: number;
    avg_confidence: number | null;
    win_rate: number;
}

export interface PredictionLeaderboardEntry {
    user_id: number;
    username: string;
    predictions_count: number;
    wins: number;
    losses: number;
    points: number;
    win_rate: number;
}

export interface Article {
    id: number;
    title: string;
    content: string;
    pick: string;
    status: string;
    confidence: number | null;
    published_at: string | null;
    created_at: string;
    updated_at: string;
    match_id: number;
    sport: string;
    competition: string | null;
    home_team: string;
    away_team: string;
    home_team_logo: string | null;
    away_team_logo: string | null;
    scheduled_at: string;
    match_status: string;
    home_score: number | null;
    away_score: number | null;
    winner: string | null;
    author: string;
    author_role: string;
    like_count: number;
    dislike_count: number;
    comment_count: number;
    viewer_reaction: "like" | "dislike" | null;
}

export interface ArticleComment {
    id: number;
    content: string;
    created_at: string;
    user_id: number;
    author: string;
    author_role: string;
}

export const API_BASE: string = import.meta.env.VITE_API_BASE ?? "/api";

function authHeaders(): HeadersInit {
    const token = localStorage.getItem("ls_access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(body?.error ?? `Erreur ${response.status}`);
    }

    return body as T;
}

export function getMatches(params: Record<string, string | undefined> = {}): Promise<Match[]> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") query.set(key, value);
    }
    const qs = query.toString();
    return request<Match[]>(`/matches${qs ? `?${qs}` : ""}`);
}

export function getMatch(id: number | string): Promise<Match> {
    return request<Match>(`/matches/${id}`);
}

export function getArticles(params: { sport?: string; competition?: string } = {}): Promise<Article[]> {
    const query = new URLSearchParams();
    if (params.sport) query.set("sport", params.sport);
    if (params.competition) query.set("competition", params.competition);
    const qs = query.toString();
    return request<Article[]>(`/articles${qs ? `?${qs}` : ""}`);
}

export function getArticlesByMatch(matchId: number | string): Promise<Article[]> {
    return request<Article[]>(`/articles?matchId=${matchId}`);
}

export function getArticle(id: number | string): Promise<Article> {
    return request<Article>(`/articles/${id}`);
}

export interface ReactionResult {
    like_count: number;
    dislike_count: number;
    viewer_reaction: "like" | "dislike" | null;
}

export function reactToArticle(id: number | string, type: "like" | "dislike"): Promise<ReactionResult> {
    return apiFetch<ReactionResult>(`/articles/${id}/reactions`, {
        method: "POST",
        body: JSON.stringify({ type })
    });
}

export function getComments(id: number | string): Promise<ArticleComment[]> {
    return request<ArticleComment[]>(`/articles/${id}/comments`);
}

export function addComment(id: number | string, content: string): Promise<ArticleComment> {
    return apiFetch<ArticleComment>(`/articles/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content })
    });
}

export function deleteComment(id: number | string, commentId: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/articles/${id}/comments/${commentId}`, {
        method: "DELETE"
    });
}

export function getLeaderboard(): Promise<LeaderboardEntry[]> {
    return request<LeaderboardEntry[]>("/articles/leaderboard");
}

export function getPredictionsLeaderboard(): Promise<PredictionLeaderboardEntry[]> {
    return request<PredictionLeaderboardEntry[]>("/predictions/leaderboard");
}

export interface PredictionEntry {
    id: number;
    match_id: number;
    pick: "home" | "away" | "draw";
    points: number;
    created_at: string;
    updated_at: string;
    sport: string;
    competition: string | null;
    home_team: string;
    away_team: string;
    scheduled_at: string;
    status: string;
    winner: string | null;
    home_score: number | null;
    away_score: number | null;
}

export function getMyPredictions(): Promise<PredictionEntry[]> {
    return apiFetch<PredictionEntry[]>("/predictions/me");
}

export function createPrediction(matchId: number, pick: string): Promise<PredictionEntry> {
    return apiFetch<PredictionEntry>("/predictions", {
        method: "POST",
        body: JSON.stringify({ matchId, pick })
    });
}

export function updatePrediction(id: number, pick: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/predictions/${id}`, {
        method: "PUT",
        body: JSON.stringify({ pick })
    });
}

export function deletePrediction(id: number): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/predictions/${id}`, { method: "DELETE" });
}