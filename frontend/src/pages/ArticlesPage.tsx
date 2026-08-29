import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Article, getArticles } from "../lib/api";
import { SPORTS, sportLabel } from "../lib/format";
import { ArticleCard } from "../components/ArticleCard";

export function ArticlesPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedSport = searchParams.get("sport") ?? "";
    const [articles, setArticles] = useState<Article[]>([]);
    const [statusTab, setStatusTab] = useState<"upcoming" | "finished">("upcoming");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getArticles({ sport: selectedSport || undefined })
            .then(setArticles)
            .catch(() => setError("Impossible de charger les analyses."));
    }, [selectedSport]);

    const visibleArticles = articles.filter((article) =>
        statusTab === "finished"
            ? article.match_status === "finished"
            : article.match_status !== "finished"
    );

    return (
        <div className="container">
            <section className="hero hero-compact">
                <h1 className="hero-title">Analyses &amp; pronostics</h1>
                <p className="hero-subtitle">Nos analyses détaillées sur les matchs choisis.</p>
            </section>

            <div className="filter-tabs">
                <button
                    type="button"
                    className={`filter-tab ${statusTab === "upcoming" ? "active" : ""}`}
                    onClick={() => setStatusTab("upcoming")}
                >
                    À venir
                </button>
                <button
                    type="button"
                    className={`filter-tab ${statusTab === "finished" ? "active" : ""}`}
                    onClick={() => setStatusTab("finished")}
                >
                    Terminés
                </button>
            </div>

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
                ) : visibleArticles.length === 0 ? (
                    <p className="empty">
                        {statusTab === "finished"
                            ? "Aucune analyse terminée"
                            : "Aucune analyse publiée"}
                        {selectedSport ? ` en ${sportLabel(selectedSport)}` : ""} pour le moment.
                    </p>
                ) : (
                    <div className="article-grid">
                        {visibleArticles.map((article) => (
                            <ArticleCard key={article.id} article={article} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}