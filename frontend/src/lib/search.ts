function normalize(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, "");
}

function levenshtein(a: string, b: string): number {
    const rows = a.length + 1;
    const cols = b.length + 1;
    const dist: number[][] = Array.from({ length: rows }, (_, i) => [i, ...new Array(cols - 1).fill(0)]);
    for (let j = 0; j < cols; j++) dist[0][j] = j;

    for (let i = 1; i < rows; i++) {
        for (let j = 1; j < cols; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost);
        }
    }
    return dist[rows - 1][cols - 1];
}

/**
 * Compare une recherche à un nom d'utilisateur : insensible à la casse, aux accents,
 * aux espaces, et tolérant aux fautes de frappe (distance d'édition sur les segments).
 */
export function matchesSearch(query: string, target: string): boolean {
    const q = normalize(query);
    if (!q) return true;
    const t = normalize(target);

    if (t.includes(q)) return true;

    // Tolère les fautes de frappe : compare la recherche à des fenêtres glissantes de la cible.
    const maxDistance = q.length <= 4 ? 1 : 2;
    for (let start = 0; start <= t.length - q.length + maxDistance; start++) {
        for (let len = Math.max(1, q.length - maxDistance); len <= q.length + maxDistance; len++) {
            const window = t.slice(start, start + len);
            if (window && levenshtein(q, window) <= maxDistance) return true;
        }
        if (start + q.length >= t.length) break;
    }
    return false;
}
