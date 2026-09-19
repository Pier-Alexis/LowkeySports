import { useEffect, useState } from "react";
import { LeaderboardEntry, getLeaderboard } from "../lib/api";

export function LeaderboardPage() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getLeaderboard()
            .then(setEntries)
            .catch(() => setError("Classement indisponible."));
    }, []);

    return (
        <div className="container">
            <section className="hero">
                <h1 className="hero-title">Bilan des experts</h1>
                <p className="hero-subtitle">
                    Analyses gagnées ou perdues, publiées sur des matchs terminés.
                </p>
                <p className="empty">
                    Pour chaque analyse, un point quand le pronostic est le bon. Le pourcentage de
                    réussite départage les experts à égalité.
                </p>
            </section>

            {error && <p className="empty">{error}</p>}
            {!error && entries.length === 0 && (
                <p className="empty">Aucune analyse terminée pour le moment.</p>
            )}
            {entries.length > 0 && (
                <div className="leaderboard-list">
                    {entries.map((entry, index) => (
                        <div key={entry.user_id} className={`leaderboard-row ${index < 3 ? "podium" : ""}`}>
                            <span className="leaderboard-rank">#{index + 1}</span>
                            <span className="leaderboard-name">
                                {entry.username}
                                {entry.role === "expert" && <span className="text-expert"> · expert</span>}
                            </span>
                            <span className="leaderboard-rate">
                                {entry.win_rate.toLocaleString("fr-FR")} %
                            </span>
                            <span className="leaderboard-stats">
                                <span title="Victoires">{entry.wins}G</span>
                                <span title="Défaites">{entry.losses}P</span>
                                <span>· {entry.points} pts</span>
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}