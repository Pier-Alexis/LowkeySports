import { FormEvent, useState } from "react";
import { getStoredUser, isAdmin, login, logout, register } from "../lib/auth";

type Mode = "login" | "register";

export function LoginPage() {
    const user = getStoredUser();
    const [mode, setMode] = useState<Mode>("login");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
            if (mode === "register") {
                await register({ username, email, password });
            } else {
                await login(email, password);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Opération impossible");
        } finally {
            setBusy(false);
        }
    }

    function handleLogout() {
        logout();
        window.location.reload();
    }

    async function switchMode(next: Mode) {
        setMode(next);
        setError(null);
    }

    if (user) {
        return (
            <div className="container">
                <section className="card admin-login">
                    <h1 className="section-title">Connexion</h1>
                    <p className="empty">
                        {isAdmin()
                            ? `Connecté en tant qu'administrateur (${user.username}).`
                            : `Connecté (${user.username}).`}
                    </p>
                    {isAdmin() && (
                        <a className="btn btn-gold" href="/admin" style={{ textAlign: "center" }}>
                            Accéder au panneau admin
                        </a>
                    )}
                    <button className="btn btn-outline" type="button" onClick={handleLogout}>
                        Déconnexion
                    </button>
                </section>
            </div>
        );
    }

    return (
        <div className="container">
            {mode === "login" ? (
                <form className="card admin-login" onSubmit={handleSubmit}>
                    <h1 className="section-title">Connexion</h1>
                    <label className="field">
                        <span className="field-label">Email</span>
                        <input
                            className="input"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                    </label>
                    <label className="field">
                        <span className="field-label">Mot de passe</span>
                        <input
                            className="input"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                    </label>
                    {error && <p className="form-error">{error}</p>}
                    <button className="btn btn-gold" type="submit" disabled={busy}>
                        {busy ? "Connexion…" : "Se connecter"}
                    </button>
                    <button className="auth-toggle" type="button" onClick={() => void switchMode("register")}>
                        Pas encore de compte ? <span>Créer un compte</span>
                    </button>
                </form>
            ) : (
                <form className="card admin-login" onSubmit={handleSubmit}>
                    <h1 className="section-title">Créer un compte</h1>
                    <label className="field">
                        <span className="field-label">Nom d'utilisateur</span>
                        <input
                            className="input"
                            type="text"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            required
                        />
                    </label>
                    <label className="field">
                        <span className="field-label">Email</span>
                        <input
                            className="input"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                    </label>
                    <label className="field">
                        <span className="field-label">Mot de passe</span>
                        <input
                            className="input"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                    </label>
                    {error && <p className="form-error">{error}</p>}
                    <button className="btn btn-gold" type="submit" disabled={busy}>
                        {busy ? "Création…" : "Créer mon compte"}
                    </button>
                    <button className="auth-toggle" type="button" onClick={() => void switchMode("login")}>
                        Déjà un compte ? <span>Se connecter</span>
                    </button>
                </form>
            )}
        </div>
    );
}
