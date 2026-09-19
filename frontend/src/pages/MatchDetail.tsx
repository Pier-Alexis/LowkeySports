import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Article, FormEntry, HeadToHeadEntry, Match, getArticlesByMatch, getMatch } from "../lib/api";
import { formatDate, formatScheduledAt } from "../lib/format";
import { TeamLogo } from "../components/MatchCard";
import { PickBadge } from "../components/ArticleCard";

function FormCard({ team, form }: { team: string; form: FormEntry[] }) {
    if (form.length === 0) return null;

    return (
        <div className="card">
            <h2 className="section-title">Forme récente — {team}</h2>
            <div className="form-list">
                {form.map((entry, index) => {
                    const isHome = entry.at_home;
                    const ownScore = isHome ? entry.home_score : entry.away_score;
                    const opponentScore = isHome ? entry.away_score : entry.home_score;
                    return (
                        <div key={index} className="form-item">
                            <span className={`form-mark ${entry.result === "W" ? "w" : entry.result === "D" ? "d" : "l"}`}>
                                {entry.result}
                            </span>
                            <div className="form-item-main">
                                <span className="form-opponent">
                                    {isHome ? "vs" : "à"} {entry.opponent}
                                </span>
                                <span className="form-date">{formatDate(entry.date)}</span>
                            </div>
                            <span className="h2h-score">
                                {ownScore} – {opponentScore}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function HeadToHeadCard({ headToHead }: { headToHead: HeadToHeadEntry[] }) {
    if (headToHead.length === 0) return null;

    return (
        <div className="card">
            <h2 className="section-title">Face-à-face</h2>
            <div className="form-list">
                {headToHead.map((entry, index) => {
                    const homeWon = entry.winner === "home";
                    const awayWon = entry.winner === "away";
                    return (
                        <div key={index} className="form-item">
                            <div className="form-item-main">
                                <span className="form-opponent">
                                    <strong className={homeWon ? "text-gold" : undefined}>{entry.home_team}</strong>
                                    {" – "}
                                    <strong className={awayWon ? "text-gold" : undefined}>{entry.away_team}</strong>
                                </span>
                                <span className="form-date">{formatDate(entry.date)}</span>
                            </div>
                            <span className="h2h-score">
                                {entry.home_score} – {entry.away_score}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

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

            {(match.home_form?.length || match.away_form?.length || match.head_to_head?.length) ? (
                <section className="detail-grid">
                    <FormCard team={match.home_team} form={match.home_form ?? []} />
                    <FormCard team={match.away_team} form={match.away_form ?? []} />
                    <HeadToHeadCard headToHead={match.head_to_head ?? []} />
                </section>
            ) : null}

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