import { useState } from "react";
import { Link } from "react-router-dom";
import { SPORTS, leaguesByRegion, sportLeagueCount } from "../lib/format";

/**
 * Les disciplines sont groupées en deux colonnes : le basket européen expose
 * près de 30 ligues, ce qui écrasait la grille et rendait les autres
 * catégories illisibles sur mobile. Chaque bloc garde sa propre hauteur et les
 * ligues se déploient par région, au lieu d'être toutes affichées d'un bloc.
 */
function SportCategory({ sportId, label, icon }: { sportId: string; label: string; icon: string }) {
    const groups = leaguesByRegion(sportId);
    const total = sportLeagueCount(sportId);
    const [open, setOpen] = useState(false);

    if (total === 0) {
        return (
            <div className={`card category-card sport-${sportId}`}>
                <Link to={`/sport/${sportId}`} className="category-link">
                    <span className="category-head">
                        <span className="category-icon" aria-hidden="true">{icon}</span>
                        <span className="category-name">{label}</span>
                    </span>
                    <span className="category-cta">Explorer →</span>
                </Link>
            </div>
        );
    }

    return (
        <div className={`card category-card sport-${sportId}${open ? " open" : ""}`}>
            <Link to={`/sport/${sportId}`} className="category-link">
                <span className="category-head">
                    <span className="category-icon" aria-hidden="true">{icon}</span>
                    <span className="category-name">{label}</span>
                    <span className="category-count">{total}</span>
                </span>
                <span className="category-cta">Explorer →</span>
            </Link>
            <button
                type="button"
                className="category-toggle"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
            >
                {open ? "Masquer les ligues" : `Voir les ${total} ligues`}
                <span aria-hidden="true">{open ? "▴" : "▾"}</span>
            </button>
            {open && (
                <div className="category-leagues">
                    {groups.map((group) => (
                        <div key={group.region} className="category-region">
                            {groups.length > 1 && <p className="category-region-label">{group.label}</p>}
                            <div className="category-league-list">
                                {group.leagues.map((league) => (
                                    <Link
                                        key={league.id}
                                        to={`/sport/${sportId}?competition=${encodeURIComponent(league.id)}`}
                                        className="league-chip"
                                    >
                                        <span aria-hidden="true">{league.flag}</span>
                                        {league.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function DisciplinesPage() {
    return (
        <div className="container">
            <section className="hero hero-compact">
                <h1 className="hero-title">Par discipline</h1>
                <p className="hero-subtitle">
                    Football américain (NCAAF, FBS &amp; FCS), basket NCAA et basketball européen, plus
                    soccer, tennis, baseball et hockey. Clique sur une ligue pour filtrer les matchs.
                </p>
            </section>

            <section className="section">
                <div className="category-grid">
                    {SPORTS.map((sport) => (
                        <SportCategory key={sport.id} sportId={sport.id} label={sport.label} icon={sport.icon} />
                    ))}
                </div>
            </section>

            <section className="section">
                <div className="card coverage-note">
                    <h2 className="section-title">D'où viennent les données ?</h2>
                    <p>
                        Les matchs college et NFL proviennent d'ESPN. Le basketball n'étant pas couvert par
                        ESPN hors États-Unis, les ligues européennes sont synchronisées via{" "}
                        <a href="https://www.sofascore.com" target="_blank" rel="noopener noreferrer">
                            Sofascore
                        </a>
                        . Les matchs dont un participant n'est pas encore connu (TBD, TBC…) sont masqués
                        automatiquement.
                    </p>
                </div>
            </section>
        </div>
    );
}
