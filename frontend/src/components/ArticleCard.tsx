import { Link } from "react-router-dom";
import { Article } from "../lib/api";
import { formatDate, pickLabel, sportLabel } from "../lib/format";
import { TeamLogo } from "./MatchCard";

export function PickBadge({ pick, article }: { pick: string; article: Article }) {
    return (
        <span className={`pick-badge pick-${pick}`}>
            Pronostic : {pickLabel(pick, { home_team: article.home_team, away_team: article.away_team })}
        </span>
    );
}

export function ArticleCard({ article }: { article: Article }) {
    return (
        <Link to={`/articles/${article.id}`} className={`card article-card sport-${article.sport}`}>
            <div className="article-card-top">
                <span className="match-competition">{sportLabel(article.sport)}</span>
                {article.published_at && <span className="match-date">{formatDate(article.published_at)}</span>}
            </div>
            <div className="article-teams">
                <TeamLogo name={article.home_team} logo={article.home_team_logo} size={32} />
                <span className="article-teams-text">
                    {article.home_team} – {article.away_team}
                </span>
                <TeamLogo name={article.away_team} logo={article.away_team_logo} size={32} />
            </div>
            <h3 className="article-title">{article.title}</h3>
            <PickBadge pick={article.pick} article={article} />
        </Link>
    );
}