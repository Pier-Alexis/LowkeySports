import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    LeaderboardEntry,
    PredictionLeaderboardEntry,
    getLeaderboard,
    getPredictionsLeaderboard
} from "../lib/api";

const ROLE_LABELS: Record<string, string> = {
    user: "Membre",
    expert: "Expert",
    admin: "Admin",
    developer: "Developer",
    owner: "Owner"
};

const ROLE_TEXT_CLASS: Record<string, string> = {
    user: "text-member",
    expert: "text-expert",
    admin: "text-admin",
    developer: "text-developer",
    owner: "text-owner"
};

type Tab = "experts" | "membres";

export function ConfidenceDots({ value }: { value: number | null }) {
    if (!value) return null;
    const rounded = Math.round(value);
    return (
        <span className="confidence" title={`Confiance moyenne : ${value.toLocaleString("fr-FR")} / 5`}>
            <span className="confidence-dots">
                {[1, 2, 3, 4, 5].map((dot) => (
                    <span key={dot} className={`confidence-dot ${dot <= rounded ? "filled" : ""}`} />
                ))}
            </span>
            {value.toLocaleString("fr-FR")}/5
        </span>
    );
}

export function LeaderboardPage() {
    const [tab, setTab] = useState<Tab>("experts");
    const [experts, setExperts] = useState<LeaderboardEntry[]>([]);
    const [membres, setMembres] = useState<PredictionLeaderboardEntry[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getLeaderboard()
            .then(setExperts)
            .catch(() => setError("Classement indisponible."));
        getPredictionsLeaderboard()
            .then(setMembres)
            .catch(() => setError("Classement indisponible."));
    }, []);

    return (
        <div className="container">
            <section className="hero hero-compact">
                <h1 className="hero-title">Bilan</h1>
                <p className="hero-subtitle">
                    Comparaison des pronostiqueurs : les experts publient des analyses, les membres
                    pronostiquent directement. Un point par pronostic gagné.
                </p>
                <div className="hero-actions">
                    <Link to="/member" className="btn btn-gold">
                        Faire mes pronostics →
                    </Link>
                </div>
            </section>

            <div className="filter-tabs">
                <button
                    type="button"
                    className={`filter-tab ${tab === "experts" ? "active" : ""}`}
                    onClick={() => setTab("experts")}
                >
                    Experts
                </button>
                <button
                    type="button"
                    className={`filter-tab ${tab === "membres" ? "active" : ""}`}
                    onClick={() => setTab("membres")}
                >
                    Membres
                </button>
            </div>

            {error && <p className="empty">{error}</p>}

            {tab === "experts" && (
                <>
                    {experts.length === 0 && (
                        <p className="empty">Aucune analyse terminée pour le moment.</p>
                    )}
                    {experts.length > 0 && (
                        <div className="leaderboard-list">
                            {experts.map((entry, index) => (
                                <div key={entry.user_id} className={`leaderboard-row ${index < 3 ? "podium" : ""}`}>
                                    <span className="leaderboard-rank">#{index + 1}</span>
                                    <span className="leaderboard-name">
                                        <span className={`${ROLE_TEXT_CLASS[entry.role] ?? ""}`}>
                                            {entry.username}
                                        </span>
                                        {entry.role && entry.role !== "user" && (
                                            <span className={ROLE_TEXT_CLASS[entry.role]}> · {ROLE_LABELS[entry.role]}</span>
                                        )}
                                    </span>
                                    <ConfidenceDots value={entry.avg_confidence} />
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
                    <p className="empty">
                        La confiance moyenne expose la prudence de chaque expert : une confiance élevée avec un
                        faible pourcentage de réussite signale un expert trop sûr de lui.
                    </p>
                </>
            )}

            {tab === "membres" && (
                <>
                    {membres.length === 0 && (
                        <p className="empty">Aucun membre n'a encore pronostiqué.</p>
                    )}
                    {membres.length > 0 && (
                        <div className="leaderboard-list">
                            {membres.map((entry, index) => (
                                <div key={entry.user_id} className={`leaderboard-row ${index < 3 ? "podium" : ""}`}>
                                    <span className="leaderboard-rank">#{index + 1}</span>
                                    <span className="leaderboard-name">{entry.username}</span>
                                    <span className="leaderboard-rate">
                                        {entry.win_rate.toLocaleString("fr-FR")} %
                                    </span>
                                    <span className="leaderboard-stats">
                                        <span title="Victoires">{entry.wins}G</span>
                                        <span title="Défaites">{entry.losses}P</span>
                                        <span>· {entry.points} pts</span>
                                        <span title="Pronostics">({entry.predictions_count})</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}