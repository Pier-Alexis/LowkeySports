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
const developerEmails = parseAdminEmails(process.env.DEVELOPER_EMAILS);

export function reloadAdminEmails(): void {
    adminEmails.clear();
    parseAdminEmails(process.env.ADMIN_EMAILS).forEach((email) => adminEmails.add(email));
    developerEmails.clear();
    parseAdminEmails(process.env.DEVELOPER_EMAILS).forEach((email) => developerEmails.add(email));
}

export function isAdminEmail(email: string): boolean {
    return adminEmails.has(email.trim().toLowerCase());
}

export function isDeveloperEmail(email: string): boolean {
    return developerEmails.has(email.trim().toLowerCase());
}
