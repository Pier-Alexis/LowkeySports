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
}

export interface Article {
    id: number;
    title: string;
    content: string;
    pick: string;
    status: string;
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
}

const API_BASE: string = import.meta.env.VITE_API_BASE ?? "/api";

async function request<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`);
    const body = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(body?.error ?? `Erreur ${response.status}`);
    }

    return body as T;
}

export function getMatches(params: Record<string, string> = {}): Promise<Match[]> {
    const query = new URLSearchParams(params).toString();
    return request<Match[]>(`/matches${query ? `?${query}` : ""}`);
}

export function getMatch(id: number | string): Promise<Match> {
    return request<Match>(`/matches/${id}`);
}

export function getArticles(sport?: string): Promise<Article[]> {
    return request<Article[]>(`/articles${sport ? `?sport=${encodeURIComponent(sport)}` : ""}`);
}

export function getArticlesByMatch(matchId: number | string): Promise<Article[]> {
    return request<Article[]>(`/articles?matchId=${matchId}`);
}

export function getArticle(id: number | string): Promise<Article> {
    return request<Article>(`/articles/${id}`);
}