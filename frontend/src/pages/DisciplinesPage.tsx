import { Link } from "react-router-dom";
import { SPORTS, leaguesBySport } from "../lib/format";

export function DisciplinesPage() {
    return (
        <div className="container">
            <section className="hero hero-compact">
                <h1 className="hero-title">Par discipline</h1>
                <p className="hero-subtitle">
                    Choisis un sport pour voir ses matchs, ou clique sur une ligue pour affiner ta recherche.
                </p>
            </section>

            <section className="section">
                <div className="category-grid">
                    {SPORTS.map((sport) => {
                        const leagues = leaguesBySport(sport.id);
                        return (
                            <div key={sport.id} className={`card category-card sport-${sport.id}`}>
                                <Link to={`/sport/${sport.id}`} className="category-link">
                                    <span className="category-name">{sport.label}</span>
                                    <span className="category-cta">Explorer →</span>
                                </Link>
                                {leagues.length > 0 && (
                                    <div className="category-leagues">
                                        {leagues.map((league) => (
                                            <Link
                                                key={league.id}
                                                to={`/sport/${sport.id}?competition=${encodeURIComponent(league.id)}`}
                                                className="league-chip"
                                            >
                                                {league.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
