import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Article, getArticle } from "../lib/api";
import { formatDate, sportLabel } from "../lib/format";
import { TeamLogo } from "../components/MatchCard";
import { PickBadge } from "../components/ArticleCard";
import { getStoredUser, translateArticle } from "../lib/auth";
import { useLanguage } from "../lib/useLanguage";

export function ArticleDetail() {
    const { id = "" } = useParams();
    const [article, setArticle] = useState<Article | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [translated, setTranslated] = useState<string | null>(null);
    const [translating, setTranslating] = useState(false);
    const { language, t } = useLanguage();

    useEffect(() => {
        getArticle(id)
            .then(setArticle)
            .catch(() => setError("Article introuvable."));
    }, [id]);

    async function handleTranslate() {
        if (!article) return;
        setTranslating(true);
        setError(null);
        try {
            const res = await translateArticle(article.content, language);
            setTranslated(res.translatedText);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Traduction impossible");
        } finally {
            setTranslating(false);
        }
    }

    if (error && !article) {
        return <div className="container"><p className="empty">{error}</p></div>;
    }

    if (!article) {
        return <div className="container"><p className="empty">Chargement…</p></div>;
    }

    const isAuthenticated = Boolean(getStoredUser());
    const shownContent = translated ?? article.content;

    return (
        <div className="container">
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
                    <span>par {article.author}</span>
                </div>
                <h1 className="article-single-title">{article.title}</h1>
                <PickBadge pick={article.pick} article={article} />
                {isAuthenticated && !translated && (
                    <button className="btn btn-outline article-translate" type="button" onClick={() => void handleTranslate()} disabled={translating}>
                        {translating ? t("translating") : t("translate")}
                    </button>
                )}
                {isAuthenticated && translated && (
                    <button
                        className="btn btn-outline article-translate"
                        type="button"
                        onClick={() => setTranslated(null)}
                    >
                        {t("backToOriginal")}
                    </button>
                )}
                {error && <p className="form-error">{error}</p>}
                <p className="article-content">{shownContent}</p>
            </article>
        </div>
    );
}