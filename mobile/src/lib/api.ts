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

const PUBLIC_API_URL = "http://207.134.79.58:6457";
const LOCAL_API_URL = "http://192.168.1.67:6457";
const API_OVERRIDE = process.env.EXPO_PUBLIC_API_URL ?? "";

export let API_URL: string = API_OVERRIDE || PUBLIC_API_URL;
export let API_BASE: string = `${API_URL.replace(/\/+$/, "")}/api`;

function fallbackUrl(): string | null {
    if (API_OVERRIDE) return null;
    return API_URL === PUBLIC_API_URL ? LOCAL_API_URL : PUBLIC_API_URL;
}

export async function fetchApi(path: string, init?: RequestInit, retried = false): Promise<Response> {
    try {
        return await fetch(`${API_BASE}${path}`, init);
    } catch {
        const fallback = fallbackUrl();
        if (fallback && !retried) {
            API_URL = fallback;
            API_BASE = `${fallback.replace(/\/+$/, "")}/api`;
            return fetchApi(path, init, true);
        }
        throw new Error("Réseau injoignable");
    }
}

async function request<T>(path: string): Promise<T> {
    const response = await fetchApi(path);
    const body = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? `Erreur ${response.status}`);
    }

    return body as T;
}

function buildQuery(params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") qs.set(key, value);
    }
    const str = qs.toString();
    return str ? `?${str}` : "";
}

export function getMatches(params: Record<string, string | undefined> = {}): Promise<Match[]> {
    return request<Match[]>(`/matches${buildQuery(params)}`);
}

export function getMatch(id: number | string): Promise<Match> {
    return request<Match>(`/matches/${id}`);
}

export function getArticles(params: { sport?: string; competition?: string } = {}): Promise<Article[]> {
    return request<Article[]>(`/articles${buildQuery(params)}`);
}

export function getArticlesByMatch(matchId: number | string): Promise<Article[]> {
    return request<Article[]>(`/articles?matchId=${matchId}`);
}

export function getArticle(id: number | string): Promise<Article> {
    return request<Article>(`/articles/${id}`);
}