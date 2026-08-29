import { fetchApi } from "./api";

const ACCESS_KEY = "ls_access_token";
const REFRESH_KEY = "ls_refresh_token";
const USER_KEY = "ls_user";

type SessionListener = () => void;

const listeners = new Set<SessionListener>();

export function subscribeSession(listener: SessionListener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function emitSessionChange(): void {
    for (const listener of listeners) {
        listener();
    }
}

export interface StoredUser {
    id: number;
    username: string;
    role: string;
}

let cachedUser: StoredUser | null = null;

export function getStoredUser(): StoredUser | null {
    return cachedUser;
}

export function isAdmin(): boolean {
    return cachedUser?.role === "admin";
}

async function readSecure(key: string): Promise<string | null> {
    const { getItemAsync } = await import("expo-secure-store");
    return getItemAsync(key);
}

async function writeSecure(key: string, value: string): Promise<void> {
    if (typeof value !== "string" || value.length === 0) return;
    const { setItemAsync } = await import("expo-secure-store");
    await setItemAsync(key, value);
}

async function deleteSecure(key: string): Promise<void> {
    const { deleteItemAsync } = await import("expo-secure-store");
    await deleteItemAsync(key);
}

export function setSession(user: StoredUser, accessToken: string, refreshToken: string): void {
    cachedUser = user;
    void writeSecure(USER_KEY, JSON.stringify(user));
    void writeSecure(ACCESS_KEY, accessToken);
    void writeSecure(REFRESH_KEY, refreshToken);
    emitSessionChange();
}

export function clearSession(): void {
    cachedUser = null;
    void deleteSecure(USER_KEY);
    void deleteSecure(ACCESS_KEY);
    void deleteSecure(REFRESH_KEY);
    emitSessionChange();
}

export function setStoredUsername(username: string): void {
    if (!cachedUser) return;
    const updated = { ...cachedUser, username };
    cachedUser = updated;
    void writeSecure(USER_KEY, JSON.stringify(updated));
    emitSessionChange();
}

export async function bootSession(): Promise<void> {
    const [userRaw] = await Promise.all([readSecure(USER_KEY)]);
    if (userRaw) {
        try {
            cachedUser = JSON.parse(userRaw) as StoredUser;
        } catch {
            cachedUser = null;
        }
    }
    emitSessionChange();
}

export async function getAccessToken(): Promise<string | null> {
    return readSecure(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
    return readSecure(REFRESH_KEY);
}

export async function tryRefresh(): Promise<boolean> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return false;

    const response = await fetchApi("/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
    });
    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.accessToken) {
        clearSession();
        return false;
    }

    const user =
        (body.user as StoredUser | null | undefined) ?? getStoredUser() ?? ({} as StoredUser);
    if (getStoredUser()) {
        setSession(user, body.accessToken, body.refreshToken ?? refreshToken);
    } else {
        void writeSecure(ACCESS_KEY, body.accessToken);
        void writeSecure(REFRESH_KEY, body.refreshToken ?? refreshToken);
    }
    return true;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    const token = await getAccessToken();
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    let response = await fetchApi(path, { ...options, headers });

    if (response.status === 401) {
        const refreshed = await tryRefresh();
        if (refreshed) {
            const newToken = await getAccessToken();
            if (newToken) {
                headers.set("Authorization", `Bearer ${newToken}`);
            }
            response = await fetchApi(path, { ...options, headers });
        } else {
            clearSession();
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
    const response = await fetchApi("/auth/login", {
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
    const response = await fetchApi("/auth/register", {
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

export async function logout(): Promise<void> {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
        await fetchApi("/auth/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken })
        }).catch(() => undefined);
    }
    clearSession();
}