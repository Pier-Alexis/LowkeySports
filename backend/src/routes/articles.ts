import { Router } from "express";
import { db } from "../database/database.js";
import { auth, optionalAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { AuthRequest } from "../types/auth.js";
import { validateArticleInput } from "../utils/validation.js";
import { ApiError, badRequest } from "../utils/errors.js";
import { parsePositiveId } from "./matches.js";
import { publishArticleToDiscord } from "../services/discordBot.js";

const router = Router();

const SELECT_ARTICLE = `
    SELECT a.id, a.title, a.content, a.pick, a.status, a.published_at,
           a.created_at, a.updated_at,
           m.id AS match_id, m.sport, m.competition,
           m.home_team, m.away_team, m.home_team_logo, m.away_team_logo,
           m.scheduled_at, m.status AS match_status,
           m.home_score, m.away_score, m.winner,
           u.username AS author, u.role AS author_role,
           (SELECT COUNT(*) FROM article_reactions r WHERE r.article_id = a.id AND r.type = 'like')::int AS like_count,
           (SELECT COUNT(*) FROM article_reactions r WHERE r.article_id = a.id AND r.type = 'dislike')::int AS dislike_count,
           (SELECT COUNT(*) FROM article_comments c WHERE c.article_id = a.id)::int AS comment_count
    FROM articles a
    JOIN matches m ON m.id = a.match_id
    JOIN users u ON u.id = a.author_id
`;

async function attachViewerReactions<T extends { id: number }>(
    articles: T[],
    userId: number | undefined
): Promise<(T & { viewer_reaction: string | null })[]> {
    if (!userId || articles.length === 0) {
        return articles.map((article) => ({ ...article, viewer_reaction: null }));
    }

    const ids = articles.map((article) => article.id);
    const result = await db.query(
        `SELECT article_id, type FROM article_reactions WHERE user_id = $1 AND article_id = ANY($2::int[])`,
        [userId, ids]
    );
    const reactionByArticle = new Map(result.rows.map((row) => [row.article_id, row.type as string]));

    return articles.map((article) => ({
        ...article,
        viewer_reaction: reactionByArticle.get(article.id) ?? null
    }));
}

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

async function assertMatchUpcoming(matchId: number) {
    const result = await db.query(
        `SELECT id FROM matches
         WHERE id = $1 AND status = 'scheduled' AND scheduled_at > NOW()`,
        [matchId]
    );
    if (result.rows.length === 0) {
        throw new ApiError(400, "Une analyse ne peut être créée que sur un match à venir");
    }
}

router.post("/", auth, requireRole("admin", "expert"), async (req: AuthRequest, res) => {
    const { matchId, title, content, pick, status } = validateArticleInput(req.body);
    await assertMatchUpcoming(matchId);

    const publishedAt = status === "published" ? new Date() : null;

    const result = await db.query(
        `INSERT INTO articles (author_id, match_id, title, content, pick, status, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [req.user!.id, matchId, title, content, pick, status, publishedAt]
    );

    const article = await getArticleById(result.rows[0].id);

    if (status === "published" && article) {
        await publishArticleToDiscord({
            author: article.author,
            title: article.title,
            content: article.content,
            pick: article.pick,
            homeTeam: article.home_team,
            awayTeam: article.away_team,
            sport: article.sport,
            competition: article.competition
        });
    }

    res.status(201).json(article);
});

router.get("/", optionalAuth, async (req: AuthRequest, res) => {
    const { sport, matchId: matchIdRaw, competition } = req.query;
    const isAdmin = req.user?.role === "admin";
    const params: unknown[] = [];
    let conditions: string[];

    if (isAdmin) {
        conditions = [];
    } else if (req.user) {
        // Un auteur (expert) voit aussi ses propres brouillons.
        params.push(req.user.id);
        conditions = [`(a.status = 'published' OR a.author_id = $${params.length})`];
    } else {
        conditions = ["a.status = 'published'"];
    }

    if (typeof sport === "string" && sport.trim()) {
        params.push(sport.trim());
        conditions.push(`m.sport = $${params.length}`);
    }

    if (typeof competition === "string" && competition.trim()) {
        params.push(competition.trim());
        conditions.push(`m.competition = $${params.length}`);
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

    res.json(await attachViewerReactions(result.rows, req.user?.id));
});

router.get("/:id", optionalAuth, async (req: AuthRequest, res) => {
    const id = parsePositiveId(req.params.id);
    const article = await getArticleById(id);

    if (!article || (article.status !== "published" && req.user?.role !== "admin")) {
        throw new ApiError(404, "Article introuvable");
    }

    const [withReaction] = await attachViewerReactions([article], req.user?.id);
    res.json(withReaction);
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

async function assertArticleAccessible(id: number, req: AuthRequest): Promise<void> {
    const result = await db.query(`SELECT status FROM articles WHERE id = $1`, [id]);
    const article = result.rows[0];
    if (!article || (article.status !== "published" && req.user?.role !== "admin")) {
        throw new ApiError(404, "Article introuvable");
    }
}

router.post("/:id/reactions", auth, async (req: AuthRequest, res) => {
    const id = parsePositiveId(req.params.id);
    const type: unknown = req.body?.type;

    if (type !== "like" && type !== "dislike") {
        throw badRequest("Type de réaction invalide. Valeurs possibles : like, dislike");
    }

    await assertArticleAccessible(id, req);

    const existing = await db.query(
        `SELECT type FROM article_reactions WHERE article_id = $1 AND user_id = $2`,
        [id, req.user!.id]
    );

    if (existing.rows[0]?.type === type) {
        await db.query(
            `DELETE FROM article_reactions WHERE article_id = $1 AND user_id = $2`,
            [id, req.user!.id]
        );
    } else {
        await db.query(
            `INSERT INTO article_reactions (article_id, user_id, type)
             VALUES ($1, $2, $3)
             ON CONFLICT (article_id, user_id) DO UPDATE SET type = EXCLUDED.type`,
            [id, req.user!.id, type]
        );
    }

    const counts = await db.query(
        `SELECT
            (SELECT COUNT(*) FROM article_reactions WHERE article_id = $1 AND type = 'like')::int AS like_count,
            (SELECT COUNT(*) FROM article_reactions WHERE article_id = $1 AND type = 'dislike')::int AS dislike_count`,
        [id]
    );
    const viewer = await db.query(
        `SELECT type FROM article_reactions WHERE article_id = $1 AND user_id = $2`,
        [id, req.user!.id]
    );

    res.json({
        like_count: counts.rows[0].like_count,
        dislike_count: counts.rows[0].dislike_count,
        viewer_reaction: viewer.rows[0]?.type ?? null
    });
});

router.get("/:id/comments", optionalAuth, async (req: AuthRequest, res) => {
    const id = parsePositiveId(req.params.id);
    await assertArticleAccessible(id, req);

    const result = await db.query(
        `SELECT c.id, c.content, c.created_at, c.user_id,
                u.username AS author, u.role AS author_role
         FROM article_comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.article_id = $1
         ORDER BY c.created_at ASC`,
        [id]
    );

    res.json(result.rows);
});

router.post("/:id/comments", auth, async (req: AuthRequest, res) => {
    const id = parsePositiveId(req.params.id);
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";

    if (content.length === 0) {
        throw badRequest("Le commentaire ne peut pas être vide");
    }
    if (content.length > 2000) {
        throw badRequest("Le commentaire est trop long (2000 caractères maximum)");
    }

    await assertArticleAccessible(id, req);

    const result = await db.query(
        `INSERT INTO article_comments (article_id, user_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, content, created_at, user_id`,
        [id, req.user!.id, content]
    );

    res.status(201).json({
        ...result.rows[0],
        author: req.user!.username,
        author_role: req.user!.role
    });
});

router.delete("/:id/comments/:commentId", auth, async (req: AuthRequest, res) => {
    const id = parsePositiveId(req.params.id);
    const commentId = parsePositiveId(req.params.commentId);

    const result = await db.query(
        `SELECT user_id FROM article_comments WHERE id = $1 AND article_id = $2`,
        [commentId, id]
    );
    const comment = result.rows[0];

    if (!comment) {
        throw new ApiError(404, "Commentaire introuvable");
    }
    if (comment.user_id !== req.user!.id && req.user!.role !== "admin") {
        throw new ApiError(403, "Accès refusé");
    }

    await db.query(`DELETE FROM article_comments WHERE id = $1`, [commentId]);
    res.json({ message: "Commentaire supprimé" });
});

export default router;