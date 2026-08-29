import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Article, getArticles } from "../lib/api";
import { SPORTS, sportLabel } from "../lib/format";
import { ArticleCard } from "../components/ArticleCard";

export function ArticlesPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedSport = searchParams.get("sport") ?? "";
    const [articles, setArticles] = useState<Article[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getArticles({ sport: selectedSport || undefined })
            .then(setArticles)
            .catch(() => setError("Impossible de charger les analyses."));
    }, [selectedSport]);

    return (
        <div className="container">
            <section className="hero hero-compact">
                <h1 className="hero-title">Analyses &amp; pronostics</h1>
                <p className="hero-subtitle">Nos analyses détaillées sur les matchs choisis.</p>
            </section>

            <div className="filter-tabs">
                <button
                    type="button"
                    className={`filter-tab ${selectedSport === "" ? "active" : ""}`}
                    onClick={() => setSearchParams({})}
                >
                    Tous
                </button>
                {SPORTS.map((sport) => (
                    <button
                        key={sport.id}
                        type="button"
                        className={`filter-tab ${selectedSport === sport.id ? "active" : ""}`}
                        onClick={() => setSearchParams({ sport: sport.id })}
                    >
                        {sport.label}
                    </button>
                ))}
            </div>

            <section className="section">
                {error ? (
                    <p className="empty">{error}</p>
                ) : articles.length === 0 ? (
                    <p className="empty">
                        Aucune analyse publiée{selectedSport ? ` en ${sportLabel(selectedSport)}` : ""} pour le moment.
                    </p>
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