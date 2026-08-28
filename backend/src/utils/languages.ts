export interface Language {
    code: string;
    native: string;
    label: string;
}

// Langues proposées pour le site (i18n) et la traduction des analyses.
export const LANGUAGES: Language[] = [
    { code: "fr", native: "Français", label: "Français" },
    { code: "en", native: "English", label: "Anglais" },
    { code: "es", native: "Español", label: "Espagnol" },
    { code: "de", native: "Deutsch", label: "Allemand" },
    { code: "it", native: "Italiano", label: "Italien" },
    { code: "pt", native: "Português", label: "Portugais" }
];

const CODES = new Set(LANGUAGES.map((language) => language.code));

export function isLanguageCode(value: unknown): value is string {
    return typeof value === "string" && CODES.has(value.toLowerCase());
}

export function normalizeLanguageCode(value: unknown): string {
    return typeof value === "string" && isLanguageCode(value) ? value.toLowerCase() : "fr";
}

export function languageLabel(code: string): string {
    return LANGUAGES.find((language) => language.code === code)?.label ?? code;
}
