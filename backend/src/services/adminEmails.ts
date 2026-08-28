function parseAdminEmails(raw?: string): Set<string> {
    const value = (raw ?? "").trim();
    if (!value) return new Set();
    return new Set(
        value
            .split(",")
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean)
    );
}

const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);

export function reloadAdminEmails(): void {
    adminEmails.clear();
    parseAdminEmails(process.env.ADMIN_EMAILS).forEach((email) => adminEmails.add(email));
}

export function isAdminEmail(email: string): boolean {
    return adminEmails.has(email.trim().toLowerCase());
}
