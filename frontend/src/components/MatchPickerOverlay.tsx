import { useEffect, useMemo, useState } from "react";
import type { Match } from "../lib/api";
import { SPORTS, sportLabel } from "../lib/format";

interface MatchPickerOverlayProps {
    matches: Match[];
    open: boolean;
    onClose: () => void;
    onSelect: (match: Match) => void;
}

const REGEX_PRESETS: { label: string; pattern: string }[] = [
    { label: "Exact (ex: PSG vs MAR)", pattern: "" },
    { label: ".", pattern: ".+" }
];

function matchLabel(match: Match): string {
    return `${match.home_team} vs ${match.away_team}`;
}

export function MatchPickerOverlay({ matches, open, onClose, onSelect }: MatchPickerOverlayProps) {
    const [sport, setSport] = useState<string | null>(null);
    const [query, setQuery] = useState("");

    useEffect(() => {
        if (open) {
            setSport(null);
            setQuery("");
        }
    }, [open]);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") onClose();
        }
        if (open) window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    const sportMatches = useMemo(() => {
        if (!sport) return [];
        const now = Date.now();
        return matches
            .filter(
                (m) =>
                    m.sport === sport &&
                    m.status === "scheduled" &&
                    new Date(m.scheduled_at).getTime() > now
            )
            .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    }, [sport, matches]);

    const matching = useMemo(() => {
        if (!sport) return null;
        let regex: RegExp;
        try {
            regex = new RegExp(query, "i");
        } catch {
            return { error: "Regex invalide", list: [] as Match[] };
        }
        return { error: null, list: sportMatches.filter((m) => regex.test(matchLabel(m))) };
    }, [sport, sportMatches, query]);

    if (!open) return null;

    const filtered = matching?.error ? [] : (matching?.list ?? []);
    const regexError = matching?.error ?? null;
    return (
        <div className="overlay-backdrop" onClick={onClose}>
            <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
                <button className="overlay-close" type="button" onClick={onClose} aria-label="Fermer">
                    ×
                </button>

                {!sport ? (
                    <>
                        <h3 className="overlay-title">Choisir un sport</h3>
                        <div className="overlay-sports">
                            {SPORTS.map((s) => (
                                <button
                                    key={s.id}
                                    className="overlay-sport"
                                    type="button"
                                    onClick={() => setSport(s.id)}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <h3 className="overlay-title">
                            {sportLabel(sport)} · Choisir un match
                        </h3>
                        <button className="overlay-back" type="button" onClick={() => setSport(null)}>
                            ← Changer de sport
                        </button>
                        <label className="field">
                            <span className="field-label">Recherche (regex)</span>
                            <input
                                className="input"
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ex: PSG vs.*MAR"
                                autoFocus
                            />
                        </label>
                        {REGEX_PRESETS.map((p) =>
                            p.pattern ? (
                                <button
                                    key={p.label}
                                    className="overlay-preset"
                                    type="button"
                                    onClick={() => setQuery(p.pattern)}
                                >
                                    {p.label}
                                </button>
                            ) : null
                        )}
                        {regexError && <p className="form-error">{regexError}</p>}
                        <div className="overlay-list">
                            {filtered.length === 0 ? (
                                <p className="empty">
                                    {query ? "Aucun match ne correspond à la regex." : "Saisis une regex pour filtrer les matchs."}
                                </p>
                            ) : (
                                filtered.map((match) => (
                                    <button
                                        key={match.id}
                                        className="overlay-match"
                                        type="button"
                                        onClick={() => {
                                            onSelect(match);
                                            onClose();
                                        }}
                                    >
                                        <span className="overlay-match-name">{matchLabel(match)}</span>
                                        <span className="overlay-match-meta">
                                            {match.competition ?? "Sans compétition"}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
