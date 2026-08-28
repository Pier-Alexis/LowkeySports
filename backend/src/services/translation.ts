import { ApiError } from "../utils/errors.js";
import { isLanguageCode } from "../utils/languages.js";

const LIBRETRANSLATE_URL = (process.env.LIBRETRANSLATE_URL || "https://libretranslate.com").replace(/\/$/, "");
const LIBRETRANSLATE_API_KEY = process.env.LIBRETRANSLATE_API_KEY || "";

export interface TranslateResult {
    translatedText: string;
    source: string;
}

/**
 * Traduit le texte fourni via LibreTranslate (instance configurable).
 * Langues cibles restreintes à la liste supportée par le site.
 */
export async function translateText(
    text: string,
    target: string,
    source: string = "auto"
): Promise<TranslateResult> {
    if (!text.trim()) {
        throw new ApiError(400, "Aucun texte à traduire");
    }

    if (!isLanguageCode(target)) {
        throw new ApiError(400, "Langue cible non prise en charge");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
        const payload: Record<string, unknown> = {
            q: text,
            source,
            target,
            format: "text"
        };
        if (LIBRETRANSLATE_API_KEY) {
            payload.api_key = LIBRETRANSLATE_API_KEY;
        }

        const response = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        if (!response.ok) {
            const detail = await response.text().catch(() => "");
            throw new Error(`LibreTranslate a répondu ${response.status}${detail ? `: ${detail}` : ""}`);
        }

        const body = (await response.json()) as { translatedText?: unknown; detectedLanguage?: unknown };
        if (typeof body.translatedText !== "string") {
            throw new Error("Réponse de traduction invalide");
        }

        return {
            translatedText: body.translatedText,
            source: typeof body.detectedLanguage === "string" ? body.detectedLanguage : source
        };
    } catch (error) {
        if (error instanceof ApiError) throw error;
        const message = error instanceof Error ? error.message : "Échec de la traduction";
        throw new ApiError(502, `Traduction indisponible (${message})`);
    } finally {
        clearTimeout(timeout);
    }
}
