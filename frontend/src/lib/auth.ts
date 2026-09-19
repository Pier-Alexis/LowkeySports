import { API_BASE } from "./api";

const ACCESS_KEY = "ls_access_token";
const REFRESH_KEY = "ls_refresh_token";
const USER_KEY = "ls_user";
const BACK_SESSION_KEY = "ls_back_session";

const SESSION_EVENT = "lowkey_session_change";

export function subscribeSession(listener: () => void): () => void {
    window.addEventListener(SESSION_EVENT, listener);
    return () => window.removeEventListener(SESSION_EVENT, listener);
}

function emitSessionChange(): void {
    window.dispatchEvent(new Event(SESSION_EVENT));
}

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
    emitSessionChange();
}

export function clearSession(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    emitSessionChange();
}

export function setStoredUsername(username: string): void {
    const user = getStoredUser();
    if (!user) return;
    localStorage.setItem(USER_KEY, JSON.stringify({ ...user, username }));
    emitSessionChange();
}

export function isAdmin(): boolean {
    const role = getStoredUser()?.role;
    return role === "admin" || role === "developer" || role === "owner";
}

export function isDeveloper(): boolean {
    return getStoredUser()?.role === "developer";
}

export function isOwner(): boolean {
    return getStoredUser()?.role === "owner";
}

export function isPrivileged(): boolean {
    const role = getStoredUser()?.role;
    return role === "developer" || role === "owner";
}

export interface ImpersonationSession {
    user: StoredUser;
    accessToken: string;
    refreshToken: string;
}

export function beginImpersonation(session: ImpersonationSession): void {
    const currentUser = getStoredUser();
    const currentAccess = getAccessToken();
    const currentRefresh = getRefreshToken();
    if (currentUser && currentAccess && currentRefresh) {
        localStorage.setItem(
            BACK_SESSION_KEY,
            JSON.stringify({ user: currentUser, accessToken: currentAccess, refreshToken: currentRefresh } satisfies ImpersonationSession)
        );
    }
    setSession(session.user, session.accessToken, session.refreshToken);
}

export function isImpersonating(): boolean {
    return localStorage.getItem(BACK_SESSION_KEY) !== null;
}

export function stopImpersonation(): void {
    const raw = localStorage.getItem(BACK_SESSION_KEY);
    localStorage.removeItem(BACK_SESSION_KEY);
    if (!raw) {
        clearSession();
        return;
    }
    try {
        const back = JSON.parse(raw) as ImpersonationSession;
        setSession(back.user, back.accessToken, back.refreshToken);
    } catch {
        clearSession();
    }
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

    if (response.status === 401) {
        const refreshed = await tryRefresh();
        if (refreshed) {
            headers.set("Authorization", `Bearer ${getAccessToken()}`);
            response = await fetch(`${API_BASE}${path}`, { ...options, headers });
        } else {
            window.location.assign("/connexion?motif=session");
            throw new Error("Session expirée, reconnecte-toi.");
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

export interface RegisterInput {
    username: string;
    email: string;
    password: string;
}

export async function register(input: RegisterInput): Promise<StoredUser> {
    const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? "Création du compte impossible");
    }

    const data = body as LoginResponse;
    setSession(data.user, data.accessToken, data.refreshToken);
    return data.user;
}

export async function changePassword(
    currentPassword: string,
    newPassword: string
): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword })
    });
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