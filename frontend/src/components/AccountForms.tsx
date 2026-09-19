import { FormEvent, useState } from "react";
import type { StoredUser } from "../lib/auth";
import { changePassword, setStoredUsername } from "../lib/auth";
import { changeUsername } from "../lib/admin";

export function UsernameChangeForm({ user }: { user: StoredUser }) {
    const [username, setUsername] = useState(user.username);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        const trimmed = username.trim();
        if (!trimmed || trimmed === user.username) return;

        setBusy(true);
        try {
            const res = await changeUsername(user.id, trimmed);
            setStoredUsername(res.user.username);
            setUsername(res.user.username);
            setSuccess(res.message);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Changement de nom impossible");
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="card admin-section">
            <h2 className="section-title">Changer mon nom d'utilisateur</h2>
            <form onSubmit={handleSubmit}>
                <label className="field">
                    <span className="field-label">Nouveau nom d'utilisateur</span>
                    <input
                        className="input"
                        type="text"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        minLength={3}
                        required
                    />
                </label>
                <p className="admin-summary">
                    C'est le nom affiché sur tes analyses et ton profil. Tu continueras à te connecter avec ton
                    adresse email.
                </p>
                {error && <p className="form-error">{error}</p>}
                {success && <p className="admin-summary">{success}</p>}
                <button className="btn btn-gold" type="submit" disabled={busy}>
                    {busy ? "Enregistrement…" : "Changer mon nom"}
                </button>
            </form>
        </section>
    );
}

export function PasswordChangeForm() {
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

    return (
        <section className="card admin-section">
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
    );
}