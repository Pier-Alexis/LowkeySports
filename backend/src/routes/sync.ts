import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { syncLeagues } from "../services/espn.js";
import { syncAllResults } from "../services/resultsSync.js";

const router = Router();

router.post("/matches", auth, requireRole("admin"), async (req, res) => {
    const rawDays = req.body?.days;
    const days =
        typeof rawDays === "number" && Number.isFinite(rawDays) && rawDays > 0 && rawDays <= 60
            ? Math.floor(rawDays)
            : undefined;

    const summary = await syncLeagues(undefined, days);
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
    const summaries = await syncAllResults();
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
