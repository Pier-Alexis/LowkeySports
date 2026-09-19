export type Theme = "dark" | "light";

const STORAGE_KEY = "ls_theme";
const listeners = new Set<(theme: Theme) => void>();

let current: Theme = "light";

export function getTheme(): Theme {
    return current;
}

export function setTheme(theme: Theme): void {
    current = theme;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
    listeners.forEach((listener) => listener(theme));
}

export function toggleTheme(): Theme {
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
    return next;
}

export function subscribeTheme(listener: (theme: Theme) => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function initTheme(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    const theme: Theme =
        stored === "dark" || stored === "light"
            ? stored
            : window.matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light";
    current = theme;
    document.documentElement.setAttribute("data-theme", theme);
}