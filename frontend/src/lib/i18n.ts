export type LanguageCode = "fr" | "en" | "es" | "de" | "it" | "pt";

export interface Language {
    code: LanguageCode;
    native: string;
    label: string;
}

export const LANGUAGES: Language[] = [
    { code: "fr", native: "Français", label: "Français" },
    { code: "en", native: "English", label: "Anglais" },
    { code: "es", native: "Español", label: "Espagnol" },
    { code: "de", native: "Deutsch", label: "Allemand" },
    { code: "it", native: "Italiano", label: "Italien" },
    { code: "pt", native: "Português", label: "Portugais" }
];

export function isLanguageCode(value: unknown): value is LanguageCode {
    return typeof value === "string" && LANGUAGES.some((l) => l.code === value);
}

export function languageLabel(code: string): string {
    return LANGUAGES.find((l) => l.code === code)?.label ?? code;
}

export type MessageKey =
    | "nav.home"
    | "nav.analyses"
    | "nav.about"
    | "nav.login"
    | "nav.account"
    | "nav.settings"
    | "translate"
    | "translating"
    | "original"
    | "backToOriginal";

const messages: Record<LanguageCode, Record<MessageKey, string>> = {
    fr: {
        "nav.home": "Accueil",
        "nav.analyses": "Analyses",
        "nav.about": "À propos",
        "nav.login": "Connexion",
        "nav.account": "Compte",
        "nav.settings": "Réglages",
        translate: "Traduire",
        translating: "Traduction…",
        original: "Texte original",
        backToOriginal: "Revenir au texte original"
    },
    en: {
        "nav.home": "Home",
        "nav.analyses": "Analyses",
        "nav.about": "About",
        "nav.login": "Login",
        "nav.account": "Account",
        "nav.settings": "Settings",
        translate: "Translate",
        translating: "Translating…",
        original: "Original text",
        backToOriginal: "Back to original text"
    },
    es: {
        "nav.home": "Inicio",
        "nav.analyses": "Análisis",
        "nav.about": "Acerca de",
        "nav.login": "Iniciar sesión",
        "nav.account": "Cuenta",
        "nav.settings": "Ajustes",
        translate: "Traducir",
        translating: "Traduciendo…",
        original: "Texto original",
        backToOriginal: "Volver al texto original"
    },
    de: {
        "nav.home": "Start",
        "nav.analyses": "Analysen",
        "nav.about": "Über uns",
        "nav.login": "Anmelden",
        "nav.account": "Konto",
        "nav.settings": "Einstellungen",
        translate: "Übersetzen",
        translating: "Übersetzen…",
        original: "Originaltext",
        backToOriginal: "Zurück zum Originaltext"
    },
    it: {
        "nav.home": "Home",
        "nav.analyses": "Analisi",
        "nav.about": "Chi siamo",
        "nav.login": "Accedi",
        "nav.account": "Account",
        "nav.settings": "Impostazioni",
        translate: "Traduci",
        translating: "Traduzione…",
        original: "Testo originale",
        backToOriginal: "Torna al testo originale"
    },
    pt: {
        "nav.home": "Início",
        "nav.analyses": "Análises",
        "nav.about": "Sobre",
        "nav.login": "Entrar",
        "nav.account": "Conta",
        "nav.settings": "Configurações",
        translate: "Traduzir",
        translating: "A traduzir…",
        original: "Texto original",
        backToOriginal: "Voltar ao texto original"
    }
};

export function translate(language: string, key: MessageKey): string {
    const code = isLanguageCode(language) ? language : "fr";
    return messages[code][key];
}
