import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { SPORTS } from "../lib/format";
import { getStoredUser, subscribeSession } from "../lib/auth";
import { useLanguage } from "../lib/useLanguage";

export function Navbar() {
    const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getStoredUser()));
    const { t } = useLanguage();

    useEffect(() => {
        const refresh = () => setIsLoggedIn(Boolean(getStoredUser()));
        const unsubscribe = subscribeSession(refresh);
        return unsubscribe;
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
                        {t("nav.home")}
                    </NavLink>
                    {SPORTS.map((sport) => (
                        <NavLink key={sport.id} to={`/sport/${sport.id}`} className="nav-link">
                            {sport.label}
                        </NavLink>
                    ))}
                    <NavLink to="/articles" className="nav-link">
                        {t("nav.analyses")}
                    </NavLink>
                    <NavLink to="/about" className="nav-link">
                        {t("nav.about")}
                    </NavLink>
                    <NavLink to={isLoggedIn ? "/compte" : "/connexion"} className="nav-link">
                        {isLoggedIn ? t("nav.account") : t("nav.login")}
                    </NavLink>
                </nav>
            </div>
        </header>
    );
}