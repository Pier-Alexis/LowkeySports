import { FormEvent, useEffect, useMemo, useState } from "react";
import type { StoredUser } from "../lib/auth";
import { changePassword, getStoredUser, isAdmin, logout } from "../lib/auth";
import type { Article, Match } from "../lib/api";
import type { ArticleInput, SyncSummary } from "../lib/admin";
import {
    adminGetArticles,
    adminGetMatches,
    createArticle,
    deleteArticle,
    syncMatches,
    updateArticle
} from "../lib/admin";
import { formatDate, sportLabel } from "../lib/format";

const EMPTY_FORM: ArticleInput = {
    matchId: 0,
    title: "",
    content: "",
    pick: "home",
    status: "draft"
};

function pickLabel(pick: string, match?: Pick<Match, "home_team" | "away_team">): string {
    if (!match) return pick;
    if (pick === "home") return `Victoire ${match.home_team}`;
    if (pick === "away") return `Victoire ${match.away_team}`;
    return "Match nul";
}

function SyncPanel({ matches, onSynced }: { matches: Match[]; onSynced: () => void }) {
    const [summary, setSummary] = useState<SyncSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const upcoming = useMemo(() => matches.filter((m) => m.status === "scheduled"), [matches]);

    async function handleSync() {
        setBusy(true);
        setError(null);
        try {
            setSummary(await syncMatches());
            onSynced();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Échec de la synchronisation");
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="card admin-section">
            <h2 className="section-title">Matchs</h2>
            <p>
                Importe les matchs à venir depuis TheSportsDB (EPL, La Liga, Ligue des champions, NBA, ATP, ligue de
                baseball). La synchro est sans doublon et peut être relancée sans risque.
            </p>
            <button className="btn btn-gold" type="button" onClick={handleSync} disabled={busy}>
                {busy ? "Import en cours…" : "Importer les matchs"}
            </button>
            {summary && (
                <p className="admin-summary">
                    {summary.imported} importés · {summary.updated} mis à jour · {summary.skipped} déjà présents
                </p>
            )}
            {error && <p className="form-error">{error}</p>}
            <div className="admin-stats">
                <span>{upcoming.length} matchs à venir</span>
                <span>{matches.length} matchs au total</span>
            </div>
        </section>
    );
}

function ArticleEditor({
    matches,
    editing,
    onDone
}: {
    matches: Match[];
    editing: Article | null;
    onDone: () => void;
}) {
    const [form, setForm] = useState<ArticleInput>(EMPTY_FORM);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (editing) {
            setForm({
                matchId: editing.match_id,
                title: editing.title,
                content: editing.content,
                pick: editing.pick,
                status: editing.status
            });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [editing]);

    const selectedMatch = matches.find((m) => m.id === form.matchId);

    function set<K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (!form.matchId) {
            setError("Choisis un match");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            if (editing) {
                await updateArticle(editing.id, form);
            } else {
                await createArticle(form);
            }
            onDone();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Enregistrement impossible");
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className="card admin-section article-editor" onSubmit={handleSubmit}>
            <h2 className="section-title">{editing ? "Modifier l'analyse" : "Nouvelle analyse"}</h2>
            <label className="field">
                <span className="field-label">Match</span>
                <select className="select" value={form.matchId} onChange={(e) => set("matchId", Number(e.target.value))}>
                    <option value={0}>— Choisir un match —</option>
                    {matches.map((match) => (
                        <option key={match.id} value={match.id}>
                            {sportLabel(match.sport)} · {match.competition ?? "Sans compétition"} — {match.home_team} vs{" "}
                            {match.away_team}
                        </option>
                    ))}
                </select>
            </label>
            <div className="form-row">
                <label className="field">
                    <span className="field-label">Pronostic</span>
                    <select className="select" value={form.pick} onChange={(e) => set("pick", e.target.value)}>
                        <option value="home">{pickLabel("home", selectedMatch)}</option>
                        <option value="away">{pickLabel("away", selectedMatch)}</option>
                        <option value="draw">{pickLabel("draw", selectedMatch)}</option>
                    </select>
                </label>
                <label className="field">
                    <span className="field-label">Statut</span>
                    <select className="select" value={form.status} onChange={(e) => set("status", e.target.value)}>
                        <option value="draft">Brouillon</option>
                        <option value="published">Publié</option>
                    </select>
                </label>
            </div>
            <label className="field">
                <span className="field-label">Titre</span>
                <input
                    className="input"
                    type="text"
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    required
                />
            </label>
            <label className="field">
                <span className="field-label">Analyse</span>
                <textarea
                    className="textarea"
                    rows={8}
                    value={form.content}
                    onChange={(e) => set("content", e.target.value)}
                    required
                />
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
                <button className="btn btn-gold" type="submit" disabled={busy}>
                    {busy ? "Enregistrement…" : editing ? "Enregistrer" : "Créer"}
                </button>
                {editing && (
                    <button
                        className="btn btn-outline"
                        type="button"
                        onClick={onDone}
                    >
                        Annuler
                    </button>
                )}
            </div>
        </form>
    );
}

function ArticlesManager({ matches }: { matches: Match[] }) {
    const [articles, setArticles] = useState<Article[]>([]);
    const [editing, setEditing] = useState<Article | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function reload() {
        try {
            setArticles(await adminGetArticles());
            setEditing(null);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Chargement impossible");
        }
    }

    useEffect(() => {
        void reload();
    }, []);

    async function handleDelete(article: Article) {
        if (!window.confirm(`Supprimer l'analyse « ${article.title} » ?`)) return;
        try {
            await deleteArticle(article.id);
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Suppression impossible");
        }
    }

    return (
        <section className="admin-section">
            <ArticleEditor matches={matches} editing={editing} onDone={() => void reload()} />
            <div className="card admin-section">
                <h2 className="section-title">Analyses ({articles.length})</h2>
                {error && <p className="form-error">{error}</p>}
                {articles.length === 0 && <p className="empty">Aucune analyse pour le moment.</p>}
                <div className="admin-list">
                    {articles.map((article) => (
                        <div key={article.id} className="card admin-item">
                            <div className="admin-item-main">
                                <strong>{article.title}</strong>
                                <span className="admin-item-meta">
                                    {sportLabel(article.sport)} · {article.home_team} vs {article.away_team} ·{" "}
                                    {pickLabel(article.pick, {
                                        home_team: article.home_team,
                                        away_team: article.away_team
                                    })}
                                    {article.published_at && ` · publié le ${formatDate(article.published_at)}`}
                                </span>
                                <span className={`status-badge status-${article.status}`}>
                                    {article.status === "published" ? "Publié" : "Brouillon"}
                                </span>
                            </div>
                            <div className="admin-item-actions">
                                <button className="btn btn-outline" type="button" onClick={() => setEditing(article)}>
                                    Modifier
                                </button>
                                <button className="btn btn-danger" type="button" onClick={() => void handleDelete(article)}>
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function PasswordChangeForm() {
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

function Dashboard({ user }: { user: StoredUser }) {
    const [matches, setMatches] = useState<Match[]>([]);
    const [error, setError] = useState<string | null>(null);

    async function reloadMatches() {
        try {
            setMatches(await adminGetMatches());
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Chargement des matchs impossible");
        }
    }

    useEffect(() => {
        void reloadMatches();
    }, []);

    return (
        <div className="container">
            <div className="admin-header">
                <h1>Bonjour {user.username}</h1>
                <button
                    className="btn btn-outline"
                    type="button"
                    onClick={() => {
                        logout();
                        window.location.reload();
                    }}
                >
                    Déconnexion
                </button>
            </div>
            {error && <p className="form-error">{error}</p>}
            <SyncPanel matches={matches} onSynced={() => void reloadMatches()} />
            <ArticlesManager matches={matches} />
            <PasswordChangeForm />
        </div>
    );
}

export function AdminPage() {
    const user = getStoredUser();

    if (!user || !isAdmin()) {
        return (
            <div className="container">
                <p className="empty">
                    Accès réservé à l'administrateur. Connecte-toi avec un compte admin via la page{" "}
                    <a href="/connexion">Connexion</a>.
                </p>
            </div>
        );
    }
    return <Dashboard user={user} />;
}