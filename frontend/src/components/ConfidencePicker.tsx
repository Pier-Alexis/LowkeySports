import { CONFIDENCE_LEVELS, confidenceMeta } from "../lib/format";

interface ConfidencePickerProps {
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
    compact?: boolean;
}

/**
 * Sélecteur de confiance 1-5.
 *
 * Chaque palier affiche son gain : l'utilisateur voit l'enjeu de son choix au
 * moment où il le fait, plutôt que de le découvrir sur le classement final.
 *
 * Les classes `conf-picker*` sont volontairement distinctes de `.confidence-dot`
 * (affichage en lecture seule utilisé sur les analyses).
 */
export function ConfidencePicker({ value, onChange, disabled, compact }: ConfidencePickerProps) {
    const current = confidenceMeta(value);
    const stake = current.points === 1 ? "1 pt" : `${String(current.points).replace(".", ",")} pt`;

    return (
        <div className={`conf-picker${compact ? " compact" : ""}`}>
            <div className="conf-picker-head">
                <span className="conf-picker-label">Confiance</span>
                <span className="conf-picker-stake">
                    {current.label} · {stake}
                </span>
            </div>
            <div className="conf-picker-dots" role="radiogroup" aria-label="Niveau de confiance">
                {CONFIDENCE_LEVELS.map((level) => (
                    <button
                        key={level.value}
                        type="button"
                        role="radio"
                        aria-checked={value === level.value}
                        title={`${level.label} — ${level.hint} (${level.points} pt)`}
                        className={`conf-picker-dot${value === level.value ? " active" : ""}${
                            level.points === 1 ? " mid" : level.points === 2 ? " high" : ""
                        }`}
                        disabled={disabled}
                        onClick={() => onChange(level.value)}
                    >
                        {level.value}
                    </button>
                ))}
            </div>
            <p className="conf-picker-hint">{current.hint}</p>
        </div>
    );
}
