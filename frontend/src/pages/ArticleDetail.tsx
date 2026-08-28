import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Article, getArticle } from "../lib/api";
import { formatDate, sportLabel } from "../lib/format";
import { TeamLogo } from "../components/MatchCard";
import { PickBadge } from "../components/ArticleCard";

export function ArticleDetail() {
    const { id = "" } = useParams();
    const [article, setArticle] = useState<Article | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getArticle(id)
            .then(setArticle)
            .catch(() => setError("Article introuvable."));
    }, [id]);

    if (error) {
        return <div className="container"><p className="empty">{error}</p></div>;
    }

    if (!article) {
        return <div className="container"><p className="empty">Chargement…</p></div>;
    }

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
                <p className="article-content">{article.content}</p>
            </article>
        </div>
    );
}