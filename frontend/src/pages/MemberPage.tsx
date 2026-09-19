import { useEffect, useState } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { getStoredUser, logout, subscribeSession } from "../lib/auth";
import { PredictionsManager } from "../components/PredictionsManager";
import { PasswordChangeForm, UsernameChangeForm } from "../components/AccountForms";

export function MemberPage() {
    const user = getStoredUser();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [displayName, setDisplayName] = useState(user?.username ?? "");

    useEffect(() => {
        const unsubscribe = subscribeSession(() => {
            const current = getStoredUser();
            if (current) setDisplayName(current.username);
        });
        return unsubscribe;
    }, []);

    if (!user) {
        const next = `/member${location.search}`;
        return <Navigate to={`/connexion?next=${encodeURIComponent(next)}`} replace />;
    }

    const matchParam = searchParams.get("match");
    const parsedMatchId = matchParam ? Number(matchParam) : NaN;
    const initialMatchId = Number.isInteger(parsedMatchId) && parsedMatchId > 0 ? parsedMatchId : null;

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
            <PredictionsManager initialMatchId={initialMatchId} />
            <UsernameChangeForm user={user} />
            <PasswordChangeForm />
        </div>
    );
}