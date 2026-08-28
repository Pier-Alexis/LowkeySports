import { Link, NavLink } from "react-router-dom";
import { SPORTS } from "../lib/format";

export function Navbar() {
    return (
        <header className="navbar">
            <div className="container navbar-inner">
                <Link to="/" className="navbar-brand">
                    <img src="/logo.webp" alt="LowkeySports" className="navbar-logo" />
                    <span>Lowkey<span className="text-gold">Sports</span></span>
                </Link>
                <nav className="navbar-links">
                    <NavLink to="/" end className="nav-link">
                        Accueil
                    </NavLink>
                    {SPORTS.map((sport) => (
                        <NavLink key={sport.id} to={`/sport/${sport.id}`} className="nav-link">
                            {sport.label}
                        </NavLink>
                    ))}
                    <NavLink to="/articles" className="nav-link">
                        Analyses
                    </NavLink>
                    <NavLink to="/about" className="nav-link">
                        À propos
                    </NavLink>
                    <NavLink to="/reglages" className="nav-link">
                        Réglages
                    </NavLink>
                    <NavLink to="/connexion" className="nav-link">
                        Connexion
                    </NavLink>
                </nav>
            </div>
        </header>
    );
}