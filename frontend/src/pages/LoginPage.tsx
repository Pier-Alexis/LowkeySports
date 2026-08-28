import { FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { changePassword, getStoredUser, isAdmin, login, logout, register } from "../lib/auth";
import { LanguagePicker } from "../components/LanguagePicker";

type Mode = "login" | "register";

export function LoginPage() {
    const { pathname } = useLocation();
    const isAccountPage = pathname === "/compte";
    const user = getStoredUser();
    const [mode, setMode] = useState<Mode>("login");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
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

    async function handleChangePassword(event: FormEvent) {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (newPassword !== confirmPassword) {
            setError("Les deux nouveaux mots de passe ne correspondent pas");
            return;
        }

        setBusy(true);
        try {
            const res = await changePassword(currentPassword, newPassword);
            setSuccess(res.message);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Changement de mot de passe impossible");
        } finally {
            setBusy(false);
        }
    }

    function handleLogout() {
        logout();
        window.location.href = "/connexion";
    }

    async function switchMode(next: Mode) {
        setMode(next);
        setError(null);
    }

    if (user && isAdmin()) {
        return <Navigate to="/admin" replace />;
    }

    if (user && !isAccountPage) {
        return <Navigate to="/compte" replace />;
    }

    if (!user && isAccountPage) {
        return <Navigate to="/connexion" replace />;
    }

    if (user) {
        return (
            <div className="container">
                <section className="card admin-login">
                    <h1 className="section-title">Mon compte</h1>
                    <p className="empty">Connecté ({user.username}).</p>

                    <LanguagePicker />

                    <form onSubmit={handleChangePassword}>
                        <h2 className="section-title">Changer mon mot de passe</h2>
                        <label className="field">
                            <span className="field-label">Mot de passe actuel</span>
                            <input
                                className="input"
                                type="password"
                                value={currentPassword}
                                onChange={(event) => setCurrentPassword(event.target.value)}
                                required
                            />
                        </label>
                        <label className="field">
                            <span className="field-label">Nouveau mot de passe</span>
                            <input
                                className="input"
                                type="password"
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                required
                            />
                        </label>
                        <label className="field">
                            <span className="field-label">Confirmer le nouveau mot de passe</span>
                            <input
                                className="input"
                                type="password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                required
                            />
                        </label>
                        {error && <p className="form-error">{error}</p>}
                        {success && <p className="admin-summary">{success}</p>}
                        <button className="btn btn-gold" type="submit" disabled={busy}>
                            {busy ? "Enregistrement…" : "Changer le mot de passe"}
                        </button>
                    </form>

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
