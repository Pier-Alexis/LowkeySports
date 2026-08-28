import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Article, Match, getArticlesByMatch, getMatch } from "../lib/api";
import { formatScheduledAt } from "../lib/format";
import { TeamLogo } from "../components/MatchCard";
import { PickBadge } from "../components/ArticleCard";

export function MatchDetail() {
    const { id = "" } = useParams();
    const [match, setMatch] = useState<Match | null>(null);
    const [articles, setArticles] = useState<Article[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getMatch(id)
            .then(async (fetched) => {
                setMatch(fetched);
                try {
                    setArticles(await getArticlesByMatch(fetched.id));
                } catch {
                    // aucun article lié
                }
            })
            .catch(() => setError("Match introuvable."));
    }, [id]);

    if (error) {
        return <div className="container"><p className="empty">{error}</p></div>;
    }

    if (!match) {
        return <div className="container"><p className="empty">Chargement…</p></div>;
    }

    return (
        <div className="container">
            <section className="detail">
                <div className="detail-head">
                    <span className="match-competition">{match.competition ?? match.sport}</span>
                    <span className="match-date">{formatScheduledAt(match.scheduled_at)}</span>
                </div>
                <div className="detail-teams">
                    <div className="detail-team">
                        <TeamLogo name={match.home_team} logo={match.home_team_logo} size={80} />
                        <span>{match.home_team}</span>
                    </div>
                    <div className="detail-vs">
                        {match.status === "scheduled"
                            ? "vs"
                            : `${match.home_score ?? "-"} – ${match.away_score ?? "-"}`}
                    </div>
                    <div className="detail-team">
                        <TeamLogo name={match.away_team} logo={match.away_team_logo} size={80} />
                        <span>{match.away_team}</span>
                    </div>
                </div>
            </section>

            <section className="section">
                <h2 className="section-title">Nos analyses</h2>
                {articles.length === 0 ? (
                    <p className="empty">Aucune analyse publiée pour ce match pour le moment.</p>
                ) : (
                    articles.map((article) => (
                        <article key={article.id} className="card article-full">
                            <h3>
                                <Link to={`/articles/${article.id}`}>{article.title}</Link>
                            </h3>
                            <PickBadge pick={article.pick} article={article} />
                            <p className="article-content">{article.content}</p>
                        </article>
                    ))
                )}
            </section>
        </div>
    );
}