import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Article, Match, getArticles, getMatches } from "../lib/api";
import { flashscoreHub, leagueLabel, leaguesByRegion, sportIcon, sportLabel } from "../lib/format";
import { MatchCard } from "../components/MatchCard";
import { ArticleCard } from "../components/ArticleCard";

export function SportPage() {
    const { sport = "" } = useParams();
    const [searchParams] = useSearchParams();
    const competition = searchParams.get("competition") ?? undefined;
    const [matches, setMatches] = useState<Match[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            getMatches({ sport, competition }),
            getArticles({ sport, competition })
        ])
            .then(([matchList, articleList]) => {
                setMatches(matchList);
                setArticles(articleList);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [sport, competition]);

    const title = competition ? leagueLabel(sport, competition) : sportLabel(sport);
    const groups = leaguesByRegion(sport);

    return (
        <div className="container">
            <section className="hero hero-compact">
                <span className="hero-kicker" aria-hidden="true">{sportIcon(sport)}</span>
                <h1 className="hero-title">{title}</h1>
                <p className="hero-subtitle">
                    Matchs à venir et analyses {competition ? title : sportLabel(sport)}.
                </p>
                <div className="hero-actions">
                    <a
                        href={flashscoreHub(sport)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline flashscore-cta"
                    >
                        <span className="flashscore-mark" aria-hidden="true" />
                        Calendrier FlashScore
                    </a>
                </div>
            </section>

            {groups.length > 0 && (
                <section className="section section-flush">
                    <div className="league-filter">
                        <Link
                            to={`/sport/${sport}`}
                            className={`league-chip${!competition ? " active" : ""}`}
                        >
                            Toutes
                        </Link>
                        {groups.map((group) => (
                            <div key={group.region} className="league-filter-group">
                                {groups.length > 1 && (
                                    <span className="league-filter-label">{group.label}</span>
                                )}
                                <div className="league-filter-list">
                                    {group.leagues.map((league) => (
                                        <Link
                                            key={league.id}
                                            to={`/sport/${sport}?competition=${encodeURIComponent(league.id)}`}
                                            className={`league-chip${competition === league.id ? " active" : ""}`}
                                        >
                                            <span aria-hidden="true">{league.flag}</span>
                                            {league.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="section">
                <h2 className="section-title">Matchs à venir</h2>
                {loading ? (
                    <p className="empty">Chargement…</p>
                ) : matches.length === 0 ? (
                    <p className="empty">
                        {competition
                            ? `Aucun match à venir pour ${title}.`
                            : "Aucun match à venir dans cette catégorie."}
                    </p>
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
                    <p className="empty">
                        {competition
                            ? `Aucune analyse publiée pour ${title}.`
                            : "Aucune analyse publiée dans cette catégorie."}
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