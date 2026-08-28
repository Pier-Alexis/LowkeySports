import type { Match } from "../lib/api";
import { formatScheduledAt, sportLabel } from "../lib/format";

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

export function MatchCard({ match }: { match: Match }) {
    return (
        <div className={`card match-card sport-${match.sport}`}>
            <div className="match-card-header">
                <span className="match-competition">{match.competition ?? sportLabel(match.sport)}</span>
                <span className="match-date">{formatScheduledAt(match.scheduled_at)}</span>
            </div>
            <div className="match-teams">
                <div className="match-team">
                    <TeamLogo name={match.home_team} logo={match.home_team_logo} />
                    <span className="match-team-name">{match.home_team}</span>
                </div>
                <div className="match-vs">vs</div>
                <div className="match-team">
                    <TeamLogo name={match.away_team} logo={match.away_team_logo} />
                    <span className="match-team-name">{match.away_team}</span>
                </div>
            </div>
            {match.status !== "scheduled" && (
                <div className="match-score">
                    {match.home_score ?? "-"} – {match.away_score ?? "-"}
                </div>
            )}
        </div>
    );
}