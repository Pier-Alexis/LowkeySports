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

export const API_BASE: string = import.meta.env.VITE_API_BASE ?? "/api";

async function request<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`);
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