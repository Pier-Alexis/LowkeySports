import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Article, Match, getArticles, getMatches } from "../lib/api";
import { sportLabel } from "../lib/format";
import { MatchCard } from "../components/MatchCard";
import { ArticleCard } from "../components/ArticleCard";

export function SportPage() {
    const { sport = "" } = useParams();
    const [matches, setMatches] = useState<Match[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([getMatches({ sport }), getArticles(sport)])
            .then(([matchList, articleList]) => {
                setMatches(matchList);
                setArticles(articleList);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [sport]);

    return (
        <div className="container">
            <section className="hero hero-compact">
                <h1 className="hero-title">{sportLabel(sport)}</h1>
                <p className="hero-subtitle">
                    Matchs à venir et analyses {sportLabel(sport)}.
                </p>
            </section>

            <section className="section">
                <h2 className="section-title">Matchs à venir</h2>
                {loading ? (
                    <p className="empty">Chargement…</p>
                ) : matches.length === 0 ? (
                    <p className="empty">Aucun match à venir dans cette catégorie.</p>
                ) : (
                    <div className="match-grid">
                        {matches.map((match) => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                )}
            </section>

            <section className="section">
                <h2 className="section-title">Analyses</h2>
                {loading ? (
                    <p className="empty">Chargement…</p>
                ) : articles.length === 0 ? (
                    <p className="empty">Aucune analyse publiée dans cette catégorie.</p>
                ) : (
                    <div className="article-grid">
                        {articles.map((article) => (
                            <ArticleCard key={article.id} article={article} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}