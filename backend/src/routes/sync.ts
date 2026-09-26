import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { syncLeagues } from "../services/espn.js";
import { syncSofascoreLeagues } from "../services/sofascore.js";
import { syncAllResults } from "../services/resultsSync.js";
import { ALL_LEAGUES, REGION_LABELS } from "../config/leagues.js";

const router = Router();

/** `?source=espn|sofascore|all` — pour rejouer une seule source à la fois. */
function requestedSources(raw: unknown): Set<string> {
    if (typeof raw !== "string" || !raw.trim()) return new Set(["espn", "sofascore"]);
    return new Set(
        raw
            .split(",")
            .map((value) => value.trim().toLowerCase())
            .filter((value) => value === "espn" || value === "sofascore")
    );
}

router.get("/leagues", auth, requireRole("admin"), async (req, res) => {
    res.json({
        regions: REGION_LABELS,
        leagues: ALL_LEAGUES.map((league) => ({
            sport: league.sport,
            provider: league.provider,
            league: league.league,
            label: league.label,
            region: league.region,
            flashscore: league.flashscore
        }))
    });
});

router.post("/matches", auth, requireRole("admin"), async (req, res) => {
    const rawDays = req.body?.days;
    const days =
        typeof rawDays === "number" && Number.isFinite(rawDays) && rawDays > 0 && rawDays <= 60
            ? Math.floor(rawDays)
            : undefined;

    const sources = requestedSources(req.body?.source);
    const summary = [];

    if (sources.has("espn")) {
        summary.push(...(await syncLeagues(undefined, days)));
    }
    if (sources.has("sofascore")) {
        summary.push(...(await syncSofascoreLeagues()));
    }

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

router.post("/results", auth, requireRole("admin"), async (req, res) => {
    const sources = requestedSources(req.body?.source);
    const summaries = await syncAllResults(undefined, undefined, sources);

    const totals = summaries.reduce(
        (acc, entry) => ({
            checked: acc.checked + entry.checked,
            finished: acc.finished + entry.finished,
            skipped: acc.skipped + entry.skipped
        }),
        { checked: 0, finished: 0, skipped: 0 }
    );

    res.json({
        message: "Vérification des résultats terminée",
        totals,
        leagues: summaries
    });
});

export default router;
