import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { getStoredUser, subscribeSession } from "../lib/auth";
import { getTheme, subscribeTheme, toggleTheme } from "../lib/theme";

export function Navbar() {
    const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getStoredUser()));
    const [theme, setTheme] = useState(getTheme());

    useEffect(() => {
        const refresh = () => setIsLoggedIn(Boolean(getStoredUser()));
        const unsubscribe = subscribeSession(refresh);
        return unsubscribe;
    }, []);

    useEffect(() => {
        return subscribeTheme(setTheme);
    }, []);

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
                    <NavLink to="/disciplines" className="nav-link">
                        Par discipline
                    </NavLink>
                    <NavLink to="/articles" className="nav-link">
                        Analyses
                    </NavLink>
                    <NavLink to="/bilan" className="nav-link">
                        Bilan
                    </NavLink>
                    <NavLink to="/about" className="nav-link">
                        À propos
                    </NavLink>
                    <NavLink to={isLoggedIn ? "/compte" : "/connexion"} className="nav-link">
                        {isLoggedIn ? "Compte" : "Connexion"}
                    </NavLink>
                    <button
                        type="button"
                        className="theme-toggle"
                        title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
                        onClick={() => void toggleTheme()}
                        aria-label="Changer de thème"
                    >
                        {theme === "dark" ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="12" cy="12" r="4" />
                                <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
                            </svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
                            </svg>
                        )}
                    </button>
                </nav>
            </div>
        </header>
    );
}