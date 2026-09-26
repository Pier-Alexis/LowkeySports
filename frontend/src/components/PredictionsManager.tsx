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
import {
    DEFAULT_CONFIDENCE,
    SPORTS,
    confidenceMeta,
    formatScheduledAt,
    leaguesBySport,
    pickLabel,
    pointsLabel,
    sportLabel
} from "../lib/format";
import { TeamLogo } from "./MatchCard";
import { ConfidencePicker } from "./ConfidencePicker";

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
    const [competition, setCompetition] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Record<number, number>>({});

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

    const availableCompetitions = useMemo(
        () => leaguesBySport(sport ?? "").map((league) => league.id),
        [sport]
    );

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return upcoming.filter((match) => {
            if (sport && match.sport !== sport) return false;
            if (competition && match.competition !== competition) return false;
            if (!query) return true;
            return (
                match.home_team.toLowerCase().includes(query) ||
                match.away_team.toLowerCase().includes(query) ||
                (match.competition ?? "").toLowerCase().includes(query) ||
                sportLabel(match.sport).toLowerCase().includes(query)
            );
        });
    }, [upcoming, search, sport, competition]);

    const history = useMemo(() => mine.filter((p) => p.status === "finished"), [mine]);
    const wins = useMemo(() => history.filter((p) => p.points > 0).length, [history]);
    const totalPoints = useMemo(
        () => history.reduce((acc, p) => acc + Number(p.points ?? 0), 0),
        [history]
    );
    const maxPossible = useMemo(
        () => history.reduce((acc, p) => acc + confidenceMeta(p.confidence).points, 0),
        [history]
    );
    const evaluated = history.length;
    const winRate = evaluated > 0 ? `${Math.round((wins * 1000) / evaluated) / 10}%` : null;

    function confidenceOf(matchId: number): number {
        return drafts[matchId] ?? byMatch.get(matchId)?.confidence ?? DEFAULT_CONFIDENCE;
    }

    function setConfidence(matchId: number, value: number) {
        setDrafts((prev) => ({ ...prev, [matchId]: value }));
    }

    async function choose(matchId: number, pick: string) {
        const existing = byMatch.get(matchId);
        const confidence = confidenceOf(matchId);
        setBusyId(matchId);
        setError(null);
        setNotice(null);
        try {
            if (existing && existing.pick === pick && existing.confidence === confidence) {
                await deletePrediction(existing.id);
                setNotice("Pronostic retiré. Tu peux en refaire un avant le match.");
            } else if (existing) {
                await updatePrediction(existing.id, pick, confidence);
                setNotice("Pronostic mis à jour.");
            } else {
                await createPrediction(matchId, pick, confidence);
                setNotice("Pronostic enregistré ! Bonne chance.");
            }
            setDrafts((prev) => {
                const next = { ...prev };
                delete next[matchId];
                return next;
            });
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
                    Donne ton pronostic et ton niveau de confiance : de 0,5 pt (prudent) à 2 pts (conviction
                    totale). Tout est compté dans le <a href="/bilan">bilan</a>. Le pronostic peut être
                    changé ou retiré jusqu&apos;au coup d&apos;envoi.
                </p>
                <div className="admin-stats">
                    <span>{upcoming.length} matchs à venir</span>
                    <span>{byMatch.size} pronostics en cours</span>
                    <span>{wins} gagnés sur {evaluated}</span>
                    <span>{pointsLabel(totalPoints)} pts marqués</span>
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
                            onClick={() => {
                                setSport(null);
                                setCompetition(null);
                            }}
                        >
                            Tous
                        </button>
                        {SPORTS.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                className={`pred-sport${sport === s.id ? " active" : ""}`}
                                onClick={() => {
                                    setSport(sport === s.id ? null : s.id);
                                    setCompetition(null);
                                }}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
                {sport && availableCompetitions.length > 0 && (
                    <div className="pred-leagues">
                        <button
                            type="button"
                            className={`league-chip${competition === null ? " active" : ""}`}
                            onClick={() => setCompetition(null)}
                        >
                            Toutes
                        </button>
                        {availableCompetitions.map((id) => (
                            <button
                                key={id}
                                type="button"
                                className={`league-chip${competition === id ? " active" : ""}`}
                                onClick={() => setCompetition(competition === id ? null : id)}
                            >
                                {id}
                            </button>
                        ))}
                    </div>
                )}
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
                            const confidence = confidenceOf(match.id);
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
                                            {current &&
                                                ` · ${pickLabel(current.pick, match)} · ${pointsLabel(current.points)} pt`}
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
                                        <ConfidencePicker
                                            compact
                                            value={confidence}
                                            disabled={busyId === match.id}
                                            onChange={(value) => setConfidence(match.id, value)}
                                        />
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
                    <p className="admin-summary">
                        {pointsLabel(totalPoints)} pts sur {pointsLabel(maxPossible)} potentiellement
                        disponibles.
                    </p>
                    <div className="form-list">
                        {history.slice(0, 30).map((prediction) => {
                            const won = prediction.points > 0;
                            const score = `${prediction.home_score ?? "-"} – ${prediction.away_score ?? "-"}`;
                            const level = confidenceMeta(prediction.confidence);
                            return (
                                <div key={prediction.id} className="form-item">
                                    <span className={`result-badge ${won ? "won" : "lost"}`}>
                                        {won ? `✔ ${pointsLabel(prediction.points)} pt` : "✘ Perdu"}
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
                                            {formatScheduledAt(prediction.scheduled_at)} · {level.label} (
                                            {prediction.confidence}/5)
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