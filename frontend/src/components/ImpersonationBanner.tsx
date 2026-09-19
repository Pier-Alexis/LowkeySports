import { useEffect, useState } from "react";
import { getStoredUser, isImpersonating, stopImpersonation, subscribeSession } from "../lib/auth";

export function ImpersonationBanner() {
    const [active, setActive] = useState(isImpersonating());
    const [username, setUsername] = useState(getStoredUser()?.username ?? "");

    useEffect(() => {
        const unsubscribe = subscribeSession(() => {
            setActive(isImpersonating());
            setUsername(getStoredUser()?.username ?? "");
        });
        return unsubscribe;
    }, []);

    if (!active) return null;

    return (
        <div className="impersonation-banner">
            <span>
                Tu es connecté en tant que <strong>{username}</strong> (session d'impersonation).
            </span>
            <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => stopImpersonation()}
            >
                Revenir à mon compte
            </button>
        </div>
    );
}