import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { syncLeagues, searchLeagues } from "../services/sportsDb.js";
import { DEFAULT_LEAGUES } from "../config/leagues.js";
import { badRequest } from "../utils/errors.js";

const router = Router();

router.get("/leagues", auth, requireRole("admin"), async (req, res) => {
    const sport = req.query.sport;

    if (typeof sport !== "string" || !sport.trim()) {
        throw badRequest("Paramètre sport requis (ex: Tennis, Basketball, Baseball, Soccer)");
    }

    res.json(await searchLeagues(sport.trim()));
});

router.post("/matches", auth, requireRole("admin"), async (req, res) => {
    const raw = req.body?.leagues;
    let leagues = DEFAULT_LEAGUES;

    if (Array.isArray(raw) && raw.length > 0) {
        leagues = raw.map((entry: Record<string, unknown>) => ({
            id: String(entry.id),
            sport: typeof entry.sport === "string" ? entry.sport : ""
        }));

        for (const league of leagues) {
            if (!league.id) {
                throw badRequest("Chaque ligue doit avoir un id");
            }
        }
    }

    const summary = await syncLeagues(leagues);
    const totals = summary.reduce(
        (acc, entry) => ({
            imported: acc.imported + entry.imported,
            updated: acc.updated + entry.updated,
            skipped: acc.skipped + entry.skipped
        }),
        { imported: 0, updated: 0, skipped: 0 }
    );

    res.json({
        message: "Synchronisation terminée",
        totals,
        leagues: summary
    });
});

export default router;