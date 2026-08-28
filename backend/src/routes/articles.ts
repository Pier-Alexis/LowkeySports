import { Router } from "express";
import { db } from "../database/database.js";
import { auth, optionalAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { AuthRequest } from "../types/auth.js";
import { validateArticleInput } from "../utils/validation.js";
import { ApiError, badRequest } from "../utils/errors.js";
import { parsePositiveId } from "./matches.js";

const router = Router();

const SELECT_ARTICLE = `
    SELECT a.id, a.title, a.content, a.pick, a.status, a.published_at,
           a.created_at, a.updated_at,
           m.id AS match_id, m.sport, m.competition,
           m.home_team, m.away_team, m.home_team_logo, m.away_team_logo,
           m.scheduled_at, m.status AS match_status,
           m.home_score, m.away_score, m.winner,
           u.username AS author
    FROM articles a
    JOIN matches m ON m.id = a.match_id
    JOIN users u ON u.id = a.author_id
`;

async function getArticleById(id: number) {
    const result = await db.query(`${SELECT_ARTICLE} WHERE a.id = $1`, [id]);
    return result.rows[0] ?? null;
}

async function assertMatchExists(matchId: number) {
    const result = await db.query(`SELECT id FROM matches WHERE id = $1`, [matchId]);
    if (result.rows.length === 0) {
        throw new ApiError(404, "Match introuvable");
    }
}

router.post("/", auth, requireRole("admin"), async (req: AuthRequest, res) => {
    const { matchId, title, content, pick, status } = validateArticleInput(req.body);
    await assertMatchExists(matchId);

    const publishedAt = status === "published" ? new Date() : null;

    const result = await db.query(
        `INSERT INTO articles (author_id, match_id, title, content, pick, status, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [req.user!.id, matchId, title, content, pick, status, publishedAt]
    );

    const article = await getArticleById(result.rows[0].id);
    res.status(201).json(article);
});

router.get("/", optionalAuth, async (req: AuthRequest, res) => {
    const sport = req.query.sport;
    const matchIdRaw = req.query.matchId;
    const isAdmin = req.user?.role === "admin";
    const conditions: string[] = isAdmin ? [] : ["a.status = 'published'"];
    const params: unknown[] = [];

    if (typeof sport === "string" && sport.trim()) {
        params.push(sport.trim());
        conditions.push(`m.sport = $${params.length}`);
    }

    if (matchIdRaw !== undefined) {
        const matchId = Number(matchIdRaw);
        if (!Number.isInteger(matchId) || matchId <= 0) {
            throw badRequest("ID de match invalide");
        }
        params.push(matchId);
        conditions.push(`a.match_id = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await db.query(
        `${SELECT_ARTICLE} ${where} ORDER BY a.published_at DESC`,
        params
    );

    res.json(result.rows);
});

router.get("/:id", optionalAuth, async (req: AuthRequest, res) => {
    const id = parsePositiveId(req.params.id);
    const article = await getArticleById(id);

    if (!article || (article.status !== "published" && req.user?.role !== "admin")) {
        throw new ApiError(404, "Article introuvable");
    }

    res.json(article);
});

router.put("/:id", auth, requireRole("admin"), async (req, res) => {
    const id = parsePositiveId(req.params.id);
    const { matchId, title, content, pick, status } = validateArticleInput(req.body);

    const existing = await db.query(`SELECT id FROM articles WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
        throw new ApiError(404, "Article introuvable");
    }
    await assertMatchExists(matchId);

    await db.query(
        `UPDATE articles
         SET match_id = $2,
             title = $3,
             content = $4,
             pick = $5,
             status = $6,
             published_at = CASE
                 WHEN $6::text = 'published' AND published_at IS NULL THEN NOW()
                 WHEN $6::text = 'draft' THEN NULL
                 ELSE published_at
             END,
             updated_at = NOW()
         WHERE id = $1`,
        [id, matchId, title, content, pick, status]
    );

    res.json({ message: "Article mis à jour", article: await getArticleById(id) });
});

router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
    const id = parsePositiveId(req.params.id);

    const result = await db.query(
        `DELETE FROM articles WHERE id = $1 RETURNING id`,
        [id]
    );

    if (result.rows.length === 0) {
        throw new ApiError(404, "Article introuvable");
    }

    res.json({ message: "Article supprimé" });
});

export default router;