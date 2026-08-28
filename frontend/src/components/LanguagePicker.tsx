import { LANGUAGES } from "../lib/i18n";
import { getStoredUser, setStoredUserLanguage, setUserLanguage } from "../lib/auth";

export function LanguagePicker() {
    const user = getStoredUser();
    const current = user?.language ?? "fr";

    async function handleChange(language: string) {
        try {
            await setUserLanguage(language);
        } catch {
            // En cas d'échec réseau, on met à jour la préférence locale quand même
            setStoredUserLanguage(language);
        }
    }

    return (
        <label className="field">
            <span className="field-label">Langue</span>
            <select
                className="select"
                value={current}
                onChange={(e) => void handleChange(e.target.value)}
            >
                {LANGUAGES.map((language) => (
                    <option key={language.code} value={language.code}>
                        {language.native}
                    </option>
                ))}
            </select>
        </label>
    );
}
