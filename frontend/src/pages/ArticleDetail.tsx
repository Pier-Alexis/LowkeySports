import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    Article,
    ArticleComment,
    addComment,
    deleteComment,
    getArticle,
    getComments,
    reactToArticle
} from "../lib/api";
import { formatDate, sportLabel } from "../lib/format";
import { getStoredUser } from "../lib/auth";
import { TeamLogo } from "../components/MatchCard";
import { PickBadge } from "../components/ArticleCard";

function AuthorName({ name, role }: { name: string; role: string }) {
    return <span className={role === "expert" ? "text-expert" : undefined}>{name}</span>;
}

function Reactions({ article, onChange }: { article: Article; onChange: (article: Article) => void }) {
    const [busy, setBusy] = useState(false);
    const currentUser = getStoredUser();

    async function handleReact(type: "like" | "dislike") {
        if (!currentUser) {
            window.location.assign("/connexion");
            return;
        }
        setBusy(true);
        try {
            const result = await reactToArticle(article.id, type);
            onChange({
                ...article,
                like_count: result.like_count,
                dislike_count: result.dislike_count,
                viewer_reaction: result.viewer_reaction
            });
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="reactions">
            <button
                type="button"
                className={`reaction-btn ${article.viewer_reaction === "like" ? "active" : ""}`}
                disabled={busy}
                onClick={() => void handleReact("like")}
            >
                👍 {article.like_count}
            </button>
            <button
                type="button"
                className={`reaction-btn ${article.viewer_reaction === "dislike" ? "active" : ""}`}
                disabled={busy}
                onClick={() => void handleReact("dislike")}
            >
                👎 {article.dislike_count}
            </button>
        </div>
    );
}

function Comments({ articleId }: { articleId: number }) {
    const currentUser = getStoredUser();
    const [comments, setComments] = useState<ArticleComment[]>([]);
    const [content, setContent] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    function reload() {
        getComments(articleId)
            .then(setComments)
            .catch(() => {});
    }

    useEffect(() => {
        reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [articleId]);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        const trimmed = content.trim();
        if (!trimmed) return;

        setBusy(true);
        setError(null);
        try {
            await addComment(articleId, trimmed);
            setContent("");
            reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Commentaire impossible à publier");
        } finally {
            setBusy(false);
        }
    }

    async function handleDelete(commentId: number) {
        if (!window.confirm("Supprimer ce commentaire ?")) return;
        try {
            await deleteComment(articleId, commentId);
            reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Suppression impossible");
        }
    }

    return (
        <section className="comments">
            <h2 className="section-title">Commentaires ({comments.length})</h2>

            {currentUser ? (
                <form className="comment-form" onSubmit={handleSubmit}>
                    <textarea
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        placeholder="Écris un commentaire…"
                        maxLength={2000}
                        rows={3}
                    />
                    {error && <p className="form-error">{error}</p>}
                    <button className="btn btn-gold" type="submit" disabled={busy || !content.trim()}>
                        {busy ? "Publication…" : "Publier"}
                    </button>
                </form>
            ) : (
                <p className="empty">
                    <Link to="/connexion">Connecte-toi</Link> pour commenter.
                </p>
            )}

            {comments.length === 0 && <p className="empty">Aucun commentaire pour le moment.</p>}
            <div className="comment-list">
                {comments.map((comment) => {
                    const canDelete = currentUser && (currentUser.id === comment.user_id || currentUser.role === "admin");
                    return (
                        <div key={comment.id} className="comment-item">
                            <div className="comment-head">
                                <strong>
                                    <AuthorName name={comment.author} role={comment.author_role} />
                                </strong>
                                <span className="comment-date">{formatDate(comment.created_at)}</span>
                            </div>
                            <p className="comment-content">{comment.content}</p>
                            {canDelete && (
                                <button className="btn-link-danger" type="button" onClick={() => void handleDelete(comment.id)}>
                                    Supprimer
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export function ArticleDetail() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState<Article | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getArticle(id)
            .then(setArticle)
            .catch(() => setError("Article introuvable."));
    }, [id]);

    function handleBack() {
        if (window.history.length > 1) navigate(-1);
        else navigate("/articles");
    }

    if (error) {
        return (
            <div className="container article-detail-page">
                <button type="button" className="back-btn" onClick={handleBack}>← Retour</button>
                <p className="empty">{error}</p>
            </div>
        );
    }

    if (!article) {
        return (
            <div className="container article-detail-page">
                <button type="button" className="back-btn" onClick={handleBack}>← Retour</button>
                <p className="empty">Chargement…</p>
            </div>
        );
    }

    return (
        <div className="container article-detail-page">
            <button type="button" className="back-btn" onClick={handleBack}>← Retour</button>
            <article className="card article-single">
                <div className="article-teams">
                    <TeamLogo name={article.home_team} logo={article.home_team_logo} size={40} />
                    <span className="article-teams-text">
                        <Link to={`/matches/${article.match_id}`}>
                            {article.home_team} – {article.away_team}
                        </Link>
                    </span>
                    <TeamLogo name={article.away_team} logo={article.away_team_logo} size={40} />
                </div>
                <div className="article-meta">
                    <span>{sportLabel(article.sport)}</span>
                    <span>{article.competition ?? "Sans compétition"}</span>
                    {article.published_at && <span>{formatDate(article.published_at)}</span>}
                    <span>
                        par <AuthorName name={article.author} role={article.author_role} />
                    </span>
                </div>
                <h1 className="article-single-title">{article.title}</h1>
                <PickBadge pick={article.pick} article={article} />
                {article.match_status === "finished" && (
                    <span className={`result-badge ${article.pick === article.winner ? "won" : "lost"}`}>
                        {article.pick === article.winner ? "✔ Gagné" : "✘ Perdu"} ·{" "}
                        {article.home_score ?? "-"} – {article.away_score ?? "-"}
                    </span>
                )}
                <p className="article-content">{article.content}</p>
                <Reactions article={article} onChange={setArticle} />
            </article>
            <Comments articleId={article.id} />
        </div>

    );
}