import { FormEvent, useEffect, useMemo, useState } from "react";
import type { StoredUser } from "../lib/auth";
import {
    changePassword,
    getStoredUser,
    isAdmin,
    logout,
    setStoredUsername,
    subscribeSession
} from "../lib/auth";
import type { Article, Match } from "../lib/api";
import type { ArticleInput, ResultsSyncSummary, SyncSummary } from "../lib/admin";
import {
    adminGetArticles,
    adminGetMatches,
    createArticle,
    deleteArticle,
    syncMatches,
    syncResults
} from "../lib/admin";
import { formatDate, sportLabel } from "../lib/format";
import { matchesSearch } from "../lib/search";
import { MatchPickerOverlay } from "../components/MatchPickerOverlay";
import { adminGetUsers, adminSetUserRole, changeUsername, AdminUser } from "../lib/admin";

const ROLE_LABELS: Record<string, string> = {
    user: "Membre",
    expert: "Expert",
    admin: "Admin"
};

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
    const [resultsSummary, setResultsSummary] = useState<ResultsSyncSummary | null>(null);
    const [resultsBusy, setResultsBusy] = useState(false);
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

    async function handleResultsSync() {
        setResultsBusy(true);
        setError(null);
        try {
            const totals = await syncResults();
            setResultsSummary(totals);
            onSynced();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Échec de la vérification des résultats");
        } finally {
            setResultsBusy(false);
        }
    }

    return (
        <section className="card admin-section">
            <h2 className="section-title">Matchs</h2>
            <p>
                Importe les matchs à venir depuis ESPN (soccer : Premier League, La Liga, Ligue 1,
                Serie A, Bundesliga, Ligue des champions ; football américain : NFL ; NBA, ATP, WTA,
                MLB, NHL). La synchro est sans doublon et peut être relancée sans risque.
            </p>
            <button className="btn btn-gold" type="button" onClick={handleSync} disabled={busy}>
                {busy ? "Import en cours…" : "Importer les matchs"}
            </button>
            {summary && (
                <p className="admin-summary">
                    {summary.imported} importés · {summary.updated} mis à jour · {summary.skipped} déjà présents
                </p>
            )}
            <p className="admin-summary">
                Vérifie auprès d'ESPN si des matchs sont terminés et met à jour les prédictions
                (gagné / perdu). Un job automatique le fait aussi toutes les 15 minutes.
            </p>
            <button className="btn btn-outline" type="button" onClick={handleResultsSync} disabled={resultsBusy}>
                {resultsBusy ? "Vérification en cours…" : "Vérifier les matchs terminés"}
            </button>
            {resultsSummary && (
                <p className="admin-summary">
                    {resultsSummary.finished} match(s) terminé(s) · {resultsSummary.checked} vérifié(s) ·{" "}
                    {resultsSummary.skipped} déjà à jour
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

function ArticleEditor({ matches, onDone }: { matches: Match[]; onDone: () => void }) {
    const [form, setForm] = useState<ArticleInput>(EMPTY_FORM);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

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
            await createArticle(form);
            setForm(EMPTY_FORM);
            onDone();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Enregistrement impossible");
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className="card admin-section article-editor" onSubmit={handleSubmit}>
            <h2 className="section-title">Nouvelle analyse</h2>
            <label className="field">
                <span className="field-label">Match</span>
                <button className="btn btn-outline" type="button" onClick={() => setPickerOpen(true)}>
                    {selectedMatch
                        ? `${sportLabel(selectedMatch.sport)} · ${selectedMatch.home_team} vs ${selectedMatch.away_team}`
                        : "— Choisir un match —"}
                </button>
            </label>
            <MatchPickerOverlay
                matches={matches}
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={(match) => set("matchId", match.id)}
            />
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
                    {busy ? "Enregistrement…" : "Créer"}
                </button>
            </div>
        </form>
    );
}

function ArticlesManager({ matches, canDelete }: { matches: Match[]; canDelete: boolean }) {
    const [articles, setArticles] = useState<Article[]>([]);
    const [error, setError] = useState<string | null>(null);

    async function reload() {
        try {
            setArticles(await adminGetArticles());
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Chargement impossible");
        }
    }

    useEffect(() => {
        void reload();
    }, []);

    async function handleDelete(article: Article) {
        const first = window.confirm(`Supprimer l'analyse « ${article.title} » ?`);
        if (!first) return;
        const second = window.confirm(
            `Confirmation : cette action est définitive. Supprimer définitivement l'analyse « ${article.title} » ?`
        );
        if (!second) return;
        try {
            await deleteArticle(article.id);
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Suppression impossible");
        }
    }

    return (
        <section className="admin-section">
            <ArticleEditor matches={matches} onDone={() => void reload()} />
            <div className="card admin-section">
                <h2 className="section-title">Analyses ({articles.length})</h2>
                <p className="admin-summary">
                    Une analyse ne peut pas être modifiée après sa création. Elle peut uniquement être supprimée.
                </p>
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
                                {canDelete && (
                                    <button className="btn btn-danger" type="button" onClick={() => void handleDelete(article)}>
                                        Supprimer
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function UsersManager({ currentUser }: { currentUser: StoredUser }) {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [search, setSearch] = useState("");

    async function reload() {
        try {
            setUsers(await adminGetUsers());
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Chargement des utilisateurs impossible");
        }
    }

    useEffect(() => {
        void reload();
    }, []);

    const visibleUsers = useMemo(
        () => users.filter((user) => matchesSearch(search, user.username)),
        [users, search]
    );

    async function handleChangeRole(user: AdminUser, role: "user" | "expert" | "admin") {
        if (role === user.role) return;
        setBusyId(user.id);
        setError(null);
        try {
            await adminSetUserRole(user.id, role);
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Mise à jour impossible");
        } finally {
            setBusyId(null);
        }
    }

    async function handleRename(user: AdminUser) {
        const nextName = window.prompt(`Nouveau nom pour « ${user.username} » :`, user.username);
        if (nextName === null) return;
        const trimmed = nextName.trim();
        if (!trimmed || trimmed === user.username) return;

        setBusyId(user.id);
        setError(null);
        try {
            const res = await changeUsername(user.id, trimmed);
            if (user.id === currentUser.id) {
                setStoredUsername(res.user.username);
            }
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Renommage impossible");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <section className="card admin-section">
            <h2 className="section-title">Utilisateurs ({users.length})</h2>
            <input
                className="admin-search"
                type="search"
                placeholder="Rechercher un utilisateur…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
            />
            {error && <p className="form-error">{error}</p>}
            {users.length === 0 && <p className="empty">Aucun utilisateur pour le moment.</p>}
            {users.length > 0 && visibleUsers.length === 0 && (
                <p className="empty">Aucun utilisateur ne correspond à « {search} ».</p>
            )}
            <div className="admin-list">
                {visibleUsers.map((user) => {
                    const isSelf = user.id === currentUser.id;
                    return (
                        <div key={user.id} className="admin-item">
                            <div className="admin-item-main">
                                <strong className={user.role === "expert" ? "text-expert" : undefined}>
                                    {user.username}
                                    {isSelf && <span className="text-gold"> (toi)</span>}
                                </strong>
                                <span className="admin-item-meta">{user.email}</span>
                            </div>
                            <div className="admin-item-actions">
                                <span className={`status-badge status-${user.role}`}>
                                    {ROLE_LABELS[user.role] ?? user.role}
                                </span>
                                <button
                                    className="btn btn-outline"
                                    type="button"
                                    disabled={busyId === user.id}
                                    onClick={() => void handleRename(user)}
                                >
                                    {busyId === user.id ? "…" : "Renommer"}
                                </button>
                                {!isSelf && (
                                    <select
                                        className="admin-role-select"
                                        value={user.role}
                                        disabled={busyId === user.id}
                                        onChange={(event) =>
                                            void handleChangeRole(
                                                user,
                                                event.target.value as "user" | "expert" | "admin"
                                            )
                                        }
                                    >
                                        <option value="user">Membre</option>
                                        <option value="expert">Expert</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                )}
                            </div>
                        </div>
                    );
                })}
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

function UsernameChangeForm({ user }: { user: StoredUser }) {
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

function Dashboard({ user }: { user: StoredUser }) {
    const [matches, setMatches] = useState<Match[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState(user.username);

    useEffect(() => {
        const unsubscribe = subscribeSession(() => {
            const current = getStoredUser();
            if (current) setDisplayName(current.username);
        });
        return unsubscribe;
    }, []);

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
                <h1>Bonjour {displayName}</h1>
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
            {isAdmin() && <SyncPanel matches={matches} onSynced={() => void reloadMatches()} />}
            <ArticlesManager matches={matches} canDelete={isAdmin()} />
            {isAdmin() && <UsersManager currentUser={user} />}
            <UsernameChangeForm user={user} />
            <PasswordChangeForm />
        </div>
    );
}

export function AdminPage() {
    const user = getStoredUser();

    if (!user || (user.role !== "admin" && user.role !== "expert")) {
        return (
            <div className="container">
                <p className="empty">
                    Accès réservé aux administrateurs et experts. Connecte-toi avec un compte autorisé via la page{" "}
                    <a href="/connexion">Connexion</a>.
                </p>
            </div>
        );
    }
    return <Dashboard user={user} />;
}