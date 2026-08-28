import { useSyncExternalStore } from "react";
import { getStoredUser, subscribeSession } from "./auth";
import { translate, MessageKey } from "./i18n";

export interface LanguageState {
    language: string;
    t: (key: MessageKey) => string;
}

function getLanguage(): string {
    const { language } = getStoredUser() ?? {};
    return language && language !== "undefined" ? language : "fr";
}

export function useLanguage(): LanguageState {
    const language = useSyncExternalStore(subscribeSession, getLanguage);

    return {
        language,
        t: (key: MessageKey) => translate(language, key)
    };
}
