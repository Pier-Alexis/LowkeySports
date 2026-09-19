export function Confidence({ value, showLabel = true }: { value: number | null; showLabel?: boolean }) {
    if (!value || value < 1 || value > 5) return null;

    return (
        <span className="confidence">
            {showLabel && <span>Confiance</span>}
            <span className="confidence-dots" aria-label={`Confiance ${value} sur 5`}>
                {[1, 2, 3, 4, 5].map((dot) => (
                    <span key={dot} className={`confidence-dot ${dot <= value ? "filled" : ""}`} />
                ))}
            </span>
            {value}/5
        </span>
    );
}