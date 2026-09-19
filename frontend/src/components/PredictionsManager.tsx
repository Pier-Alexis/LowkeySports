import { useEffect, useMemo, useState } from "react";
import {
    Match,
    PredictionEntry,
    createPrediction,
    deletePrediction,
    getMatches,
    getMyPredictions,
    updatePrediction
} from "../lib/api";
import { SPORTS, formatScheduledAt, pickLabel, sportLabel } from "../lib/format";
import { TeamLogo } from "./MatchCard";

interface PredictionsManagerProps {
    initialMatchId?: number | null;
}

export function PredictionsManager({ initialMatchId }: PredictionsManagerProps) {
    const [upcoming, setUpcoming] = useState<Match[]>([]);
    const [mine, setMine] = useState<PredictionEntry[]>([]);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [sport, setSport] = useState<string | null>(null);

    async function reload() {
        const [matches, predictions] = await Promise.all([getMatches(), getMyPredictions()]);
        setUpcoming(matches);
        setMine(predictions);
    }

    useEffect(() => {
        reload().catch((err) => setError(err instanceof Error ? err.message : "Chargement impossible"));
    }, []);

    const byMatch = useMemo(() => {
        const map = new Map<number, PredictionEntry>();
        for (const prediction of mine) map.set(prediction.match_id, prediction);
        return map;
    }, [mine]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return upcoming.filter((match) => {
            if (sport && match.sport !== sport) return false;
            if (!query) return true;
            return (
                match.home_team.toLowerCase().includes(query) ||
                match.away_team.toLowerCase().includes(query) ||
                (match.competition ?? "").toLowerCase().includes(query) ||
                sportLabel(match.sport).toLowerCase().includes(query)
            );
        });
    }, [upcoming, search, sport]);

    const history = useMemo(() => mine.filter((p) => p.status === "finished"), [mine]);
    const wins = useMemo(() => history.filter((p) => p.points > 0).length, [history]);
    const evaluated = history.length;
    const winRate =
        evaluated > 0
            ? `${Math.round((wins * 1000) / evaluated) / 10}%`
            : null;

    async function choose(matchId: number, pick: string) {
        const existing = byMatch.get(matchId);
        setBusyId(matchId);
        setError(null);
        setNotice(null);
        try {
            if (existing && existing.pick === pick) {
                await deletePrediction(existing.id);
                setNotice("Pronostic retiré. Tu peux en refaire un avant le match.");
            } else if (existing) {
                await updatePrediction(existing.id, pick);
                setNotice("Pronostic mis à jour.");
            } else {
                await createPrediction(matchId, pick);
                setNotice("Pronostic enregistré ! Bonne chance.");
            }
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Enregistrement impossible");
        } finally {
            setBusyId(null);
        }
    }

    const options = (match: Match): { id: string; label: string }[] => [
        { id: "home", label: match.home_team },
        { id: "draw", label: "Match nul" },
        { id: "away", label: match.away_team }
    ];

    return (
        <section className="admin-section">
            <div className="card admin-section">
                <h2 className="section-title">Mes pronostics</h2>
                <p className="admin-summary">
                    Donne ton pronostic sur les matchs à venir : 1 point par bon pronostic, compté dans le{" "}
                    <a href="/bilan">bilan</a>. Le pronostic peut être changé ou retiré jusqu'au coup d'envoi.
                </p>
                <div className="admin-stats">
                    <span>{upcoming.length} matchs à venir</span>
                    <span>{byMatch.size} pronostics en cours</span>
                    <span>{wins} gagnés</span>
                    <span>{history.length - wins} perdus</span>
                    {winRate && <span>Réussite {winRate}</span>}
                </div>
                <div className="pred-toolbar">
                    <input
                        className="admin-search pred-search"
                        type="search"
                        placeholder="Rechercher (équipe, compétition, discipline)…"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    <div className="pred-sports">
                        <button
                            type="button"
                            className={`pred-sport${sport === null ? " active" : ""}`}
                            onClick={() => setSport(null)}
                        >
                            Tous
                        </button>
                        {SPORTS.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                className={`pred-sport${sport === s.id ? " active" : ""}`}
                                onClick={() => setSport(sport === s.id ? null : s.id)}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
                {error && <p className="form-error">{error}</p>}
                {notice && <p className="admin-summary">{notice}</p>}
                {filtered.length === 0 ? (
                    <p className="empty">
                        {upcoming.length === 0
                            ? "Aucun match à venir pour le moment."
                            : "Aucun match ne correspond à ta recherche."}
                    </p>
                ) : (
                    <div className="admin-list">
                        {filtered.map((match) => {
                            const current = byMatch.get(match.id);
                            const focus = initialMatchId != null && match.id === initialMatchId;
                            return (
                                <div key={match.id} className={`card admin-item${focus ? " pred-focus" : ""}`}>
                                    <div className="admin-item-main">
                                        <strong>
                                            {match.home_team} vs {match.away_team}
                                        </strong>
                                        <span className="admin-item-meta">
                                            {sportLabel(match.sport)}
                                            {match.competition ? ` · ${match.competition}` : ""} ·{" "}
                                            {formatScheduledAt(match.scheduled_at)}
                                            {current && ` · Mon pronostic : ${pickLabel(current.pick, match)}`}
                                        </span>
                                    </div>
                                    <div className="pred-options">
                                        <div className="pred-teams">
                                            <TeamLogo name={match.home_team} logo={match.home_team_logo} size={24} />
                                            <span className="pred-teams-text">
                                                {match.home_team} – {match.away_team}
                                            </span>
                                            <TeamLogo name={match.away_team} logo={match.away_team_logo} size={24} />
                                        </div>
                                        <div className="pred-buttons">
                                            {options(match).map((option) => (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    data-pick={option.id}
                                                    className={`pred-option${current?.pick === option.id ? " active" : ""}`}
                                                    disabled={busyId === match.id}
                                                    onClick={() => void choose(match.id, option.id)}
                                                >
                                                    {option.label}
                                                    {current?.pick === option.id && " ✓"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {history.length > 0 && (
                <div className="card admin-section">
                    <h2 className="section-title">Historique</h2>
                    <div className="form-list">
                        {history.slice(0, 30).map((prediction) => {
                            const won = prediction.points > 0;
                            const score = `${prediction.home_score ?? "-"} – ${prediction.away_score ?? "-"}`;
                            return (
                                <div key={prediction.id} className="form-item">
                                    <span className={`result-badge ${won ? "won" : "lost"}`}>
                                        {won ? "✔ Gagné" : "✘ Perdu"}
                                    </span>
                                    <div className="form-item-main">
                                        <span className="form-opponent">
                                            {pickLabel(prediction.pick, {
                                                home_team: prediction.home_team,
                                                away_team: prediction.away_team
                                            })}
                                        </span>
                                        <span className="form-date">
                                            {sportLabel(prediction.sport)}
                                            {prediction.competition ? ` · ${prediction.competition}` : ""} ·{" "}
                                            {formatScheduledAt(prediction.scheduled_at)}
                                        </span>
                                    </div>
                                    <span className="h2h-score">{score}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );
}