import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { AuthRequest } from "../types/auth.js";
import { translateText } from "../services/translation.js";
import { badRequest } from "../utils/errors.js";
import { normalizeLanguageCode, isLanguageCode } from "../utils/languages.js";

const router = Router();

router.post("/", auth, async (req: AuthRequest, res) => {
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const rawTarget = typeof req.body?.target === "string" ? req.body.target.trim().toLowerCase() : "";
    const rawSource = typeof req.body?.source === "string" ? req.body.source.trim().toLowerCase() : "auto";

    if (!text) {
        throw badRequest("Aucun texte à traduire");
    }
    if (!isLanguageCode(rawTarget)) {
        throw badRequest("Langue cible non prise en charge");
    }

    const source = rawSource === "auto" ? "auto" : normalizeLanguageCode(rawSource);

    const result = await translateText(text, rawTarget, source);
    res.json({ translatedText: result.translatedText, source: result.source });
});

export default router;
