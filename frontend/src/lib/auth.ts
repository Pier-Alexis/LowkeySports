import { API_BASE } from "./api";

const ACCESS_KEY = "ls_access_token";
const REFRESH_KEY = "ls_refresh_token";
const USER_KEY = "ls_user";

export interface StoredUser {
    id: number;
    username: string;
    role: string;
}

export function getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser(): StoredUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as StoredUser;
    } catch {
        return null;
    }
}

export function setSession(user: StoredUser, accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
}

export function isAdmin(): boolean {
    return getStoredUser()?.role === "admin";
}

async function tryRefresh(): Promise<boolean> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
    });
    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.accessToken) {
        clearSession();
        return false;
    }

    const user = body.user ?? getStoredUser();
    setSession(user, body.accessToken, body.refreshToken ?? refreshToken);
    return true;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    const token = getAccessToken();
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    let response = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (response.status === 401 && getRefreshToken()) {
        const refreshed = await tryRefresh();
        if (refreshed) {
            headers.set("Authorization", `Bearer ${getAccessToken()}`);
            response = await fetch(`${API_BASE}${path}`, { ...options, headers });
        }
    }

    const body = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? `Erreur ${response.status}`);
    }
    return body as T;
}

export interface LoginResponse {
    message: string;
    user: StoredUser;
    accessToken: string;
    refreshToken: string;
}

export async function login(email: string, password: string): Promise<StoredUser> {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? "Connexion impossible");
    }

    const data = body as LoginResponse;
    setSession(data.user, data.accessToken, data.refreshToken);
    return data.user;
}

export function logout(): void {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
        void fetch(`${API_BASE}/auth/logout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken })
        }).catch(() => undefined);
    }
    clearSession();
}