import { FormEvent, useState } from "react";
import { changePassword, getStoredUser } from "../lib/auth";

export function SettingsPage() {
    const user = getStoredUser();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event: FormEvent) {
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

    if (!user) {
        return (
            <div className="container">
                <p className="empty">
                    Tu dois être connecté pour accéder aux réglages.{" "}
                    <a href="/connexion">Se connecter</a>.
                </p>
            </div>
        );
    }

    return (
        <div className="container">
            <section className="hero hero-compact">
                <h1 className="hero-title">
                    Réglages <span className="text-gold">{user.username}</span>
                </h1>
            </section>

            <section className="card admin-login">
                <h2 className="section-title">Changer mon mot de passe</h2>
                <form onSubmit={handleSubmit}>
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
            </section>
        </div>
    );
}
