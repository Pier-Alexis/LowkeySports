import { Link } from "react-router-dom";
import { SPORTS } from "../lib/format";

export function DisciplinesPage() {
    return (
        <div className="container">
            <section className="hero hero-compact">
                <h1 className="hero-title">Par discipline</h1>
                <p className="hero-subtitle">Choisis un sport pour voir ses matchs et ses analyses.</p>
            </section>

            <section className="section">
                <div className="category-grid">
                    {SPORTS.map((sport) => (
                        <Link
                            key={sport.id}
                            to={`/sport/${sport.id}`}
                            className={`card category-card sport-${sport.id}`}
                        >
                            <span className="category-name">{sport.label}</span>
                            <span className="category-cta">Explorer →</span>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}
