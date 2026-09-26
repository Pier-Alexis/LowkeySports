import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Article, Match, getArticles, getMatches } from "../lib/api";
import { SPORTS, sportLeagueCount } from "../lib/format";
import { MatchCard } from "../components/MatchCard";
import { ArticleCard } from "../components/ArticleCard";

export function Home() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getMatches()
            .then(setMatches)
            .catch(() => {});
        getArticles()
            .then(setArticles)
            .catch(() => setError("Impossible de charger les données."));
    }, []);

    return (
        <div className="container">
            <section className="hero">
                <span className="hero-kicker">Prédictions · Analyses · Sans pari</span>
                <h1 className="hero-title">
                    Vos prédictions sportives,{" "}
                    <span className="text-gold">sans parier.</span>
                </h1>
                <p className="hero-subtitle">
                    Football américain NCAA (FBS &amp; FCS), basketball NCAA et toutes les grandes ligues
                    européennes, soccer, tennis, baseball et hockey. Donne ton pronostic, fixe ta confiance,
                    gagne des points.
                </p>
                <div className="hero-actions">
                    <Link to="/member" className="btn btn-gold">Faire mes pronostics</Link>
                    <Link to="/articles" className="btn btn-outline">Voir les analyses</Link>
                    <Link to="/disciplines" className="btn btn-outline">Explorer les ligues</Link>
                </div>
            </section>

            <section className="section">
                <div className="section-head">
                    <h2 className="section-title">Catégories</h2>
                    <Link to="/disciplines" className="section-link">Tout voir →</Link>
                </div>
                <div className="category-grid">
                    {SPORTS.map((sport) => (
                        <Link
                            key={sport.id}
                            to={`/sport/${sport.id}`}
                            className={`card category-card sport-${sport.id}`}
                        >
                            <span className="category-head">
                                <span className="category-name">{sport.label}</span>
                                <span className="category-count">{sportLeagueCount(sport.id)}</span>
                            </span>
                            <span className="category-cta">Explorer →</span>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="section">
                <h2 className="section-title">Matchs à venir</h2>
                {matches.length === 0 ? (
                    <p className="empty">Aucun match à venir pour le moment.</p>
                ) : (
                    <div className="match-grid">
                        {matches.slice(0, 8).map((match) => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                )}
            </section>

            <section className="section">
                <h2 className="section-title">Dernières analyses</h2>
                {error ? (
                    <p className="empty">{error}</p>
                ) : articles.length === 0 ? (
                    <p className="empty">Aucune analyse publiée pour le moment.</p>
                ) : (
                    <div className="article-grid">
                        {articles.slice(0, 4).map((article) => (
                            <ArticleCard key={article.id} article={article} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}