import { Link } from "react-router-dom";
import type { Match } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { flashscoreUrlFor, formatScheduledAt, sportLabel } from "../lib/format";

export function TeamLogo({ name, logo, size = 48 }: { name: string; logo: string | null; size?: number }) {
    if (logo) {
        return <img className="team-logo" src={logo} alt={name} width={size} height={size} loading="lazy" />;
    }

    return (
        <div className="team-logo team-logo-fallback" style={{ width: size, height: size }}>
            {name.slice(0, 2).toUpperCase()}
        </div>
    );
}

/**
 * Accès direct à FlashScore pour la fiche détaillée du match.
 *
 * La carte entière est un lien : imbriquer un `<a>` dedans est invalide en
 * HTML, d'où le `position: relative` + `z-index` sur ce bouton.
 */
function FlashScoreLink({ match }: { match: Match }) {
    return (
        <a
            className="flashscore-link"
            href={flashscoreUrlFor(match)}
            target="_blank"
            rel="noopener noreferrer"
            title="Calendrier, stats et temps réels sur FlashScore"
            onClick={(event) => event.stopPropagation()}
        >
            <span className="flashscore-mark" aria-hidden="true" />
            FlashScore
            <span aria-hidden="true">↗</span>
        </a>
    );
}

export function MatchCard({ match }: { match: Match }) {
    const user = getStoredUser();
    const canAnalyze = user !== null && (user.role === "admin" || user.role === "developer" || user.role === "owner" || user.role === "expert");
    const hasScore = match.status === "finished";

    const inner = (
        <>
            <div className="match-card-header">
                <span className="match-competition">{match.competition ?? sportLabel(match.sport)}</span>
                <span className="match-date">{formatScheduledAt(match.scheduled_at)}</span>
            </div>
            <div className="match-teams">
                <div className="match-team">
                    <TeamLogo name={match.home_team} logo={match.home_team_logo} />
                    <span className="match-team-name">{match.home_team}</span>
                </div>
                <div className="match-vs">{hasScore ? "final" : "vs"}</div>
                <div className="match-team">
                    <TeamLogo name={match.away_team} logo={match.away_team_logo} />
                    <span className="match-team-name">{match.away_team}</span>
                </div>
            </div>
            <div className="match-card-foot">
                {match.status === "scheduled" && (
                    <span className="match-cta">{canAnalyze ? "Rédiger une analyse →" : "Faire mon pronostic →"}</span>
                )}
                {hasScore && (
                    <span className="match-score">
                        {match.home_score ?? "-"} – {match.away_score ?? "-"}
                    </span>
                )}
                <FlashScoreLink match={match} />
            </div>
        </>
    );

    return match.status === "scheduled" ? (
        <Link
            to={`${canAnalyze ? "/admin" : "/member"}?match=${match.id}`}
            className={`card match-card sport-${match.sport} match-card-link`}
        >
            {inner}
        </Link>
    ) : (
        <div className={`card match-card sport-${match.sport}`}>{inner}</div>
    );
}
