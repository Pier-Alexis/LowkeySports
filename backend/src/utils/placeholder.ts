/**
 * Détection des noms d'équipes « en attente ».
 *
 * Tant qu'un adversaire n'est pas connu, un match n'est ni pronostiquable ni
 * analysable. ESPN publie littéralement « TBD », et les tournois NCAA
 * désignent les qualifieds par des libellés de tableau (« Winner M1 »,
 * « Loser SF »). Ces matchs sont filtrés à l'import ET à la lecture, afin de
 * purger aussi les lignes déjà présentes en base.
 *
 * ⚠ `isPlaceholderTeam` (JS) et `lowkey_is_placeholder_team` (SQL, migration
 * `010`) doivent rester équivalents. Le test `placeholder.test.ts` verrouille
 * le comportement JS, la migration verrouille le SQL.
 */

function normalize(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/** Forme « compacte » : plus aucun séparateur. « T.B.D. » → « tbd ». */
function compact(value: string): string {
    return value.replace(/[^a-z0-9]+/g, "");
}

/** Valeurs entièrement placeholder, une fois normalisées ou compactées. */
const PLACEHOLDER_EXACT = new Set([
    "tbd",
    "tba",
    "tbc",
    "tbd vs tbd",
    "tbd v tbd",
    "unknown",
    "avenir",
    "a venir",
    "nd",
    "na",
    "n d",
    "n a",
    "n/d",
    "n/a",
    "n c",
    "nc",
    "-",
    "--",
    "---"
]);

/**
 * Formes longues : on les cherche en contenu plutôt qu'en tête, car le libellé
 * peut être préfixé (« TBC - To Be Confirmed »). Assez longs et assez
 * exotiques pour ne pas créer de faux positif sur un vrai nom de club.
 */
const PLACEHOLDER_CONTAINS = [
    "tobeannounced",
    "tobedetermined",
    "tobeconfirmed",
    "toconfirmed",
    "adeterminer",
    "adetermine",
    "aconfirmer",
    "aconfirme"
];

/**
 * Libellés de tableau final. `Winner`, `Loser` et `Seed` ne sont jamais
 * employés seuls comme nom de club, et le suffixe de tour est optionnel
 * (« Loser SF » comme « Winner M1 »).
 */
const BRACKET_PATTERNS: RegExp[] = [
    /^(winner|loser|seed)\s*(m|me|men'?s?|w|women'?s?|mw|mf|sf|e|f|qf|1|2|3|4|5|6|7|8|9)?\s*\d*$/,
    /^\d*(st|nd|rd|th)\s*(best|worst)?\s*seed$/,
    /^(r1|round 1|premier(\s*tour)?)\s*(leg)?\s*\d*$/
];

/** `true` si le nom d'équipe est un placeholder (TBD, tableau, …). */
export function isPlaceholderTeam(raw: unknown): boolean {
    if (typeof raw !== "string") return true;

    const normalized = normalize(raw);
    if (normalized.length === 0) return true;

    const squashed = compact(normalized);
    if (PLACEHOLDER_EXACT.has(normalized) || PLACEHOLDER_EXACT.has(squashed)) return true;
    if (PLACEHOLDER_CONTAINS.some((needle) => squashed.includes(needle))) return true;

    return BRACKET_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Un match n'est affichable que si les deux équipes sont connues. On masque dès
 * qu'un seul côté est un placeholder : pronostiquer sur « TBD vs Real Madrid »
 * n'a aucun sens, et cela évite d'éventrer un tableau final encore ouvert.
 */
export function hasKnownTeams(homeTeam: unknown, awayTeam: unknown): boolean {
    return !isPlaceholderTeam(homeTeam) && !isPlaceholderTeam(awayTeam);
}

/**
 * Fragment SQL excluant les matchs dont une équipe est un placeholder.
 *
 * Écrit en SQL plutôt qu'en JS pour que le filtre s'applique au niveau du
 * moteur : un filtrage applicatif laisserait passer des lignes que le plan
 * d'exécution a déjà envoyées.
 *
 * ⚠ Ce fragment doit rester équivalent à `isPlaceholderTeam`. Les motifs sont
 * listés une seule fois puis appliqués aux deux colonnes, ce qui évite la
 * dérive classique où l'on corrige `home_team` et oublie `away_team`.
 *
 * Contraintes du format : regex POSIX de PostgreSQL, sans apostrophe (le
 * littéral SQL est délimité par des apostrophes) et accolades simples —
 * `{{1,4}}` produirait un motif invalide.
 */
/**
 * Mêmes règles que `isPlaceholderTeam`, traduites en regex POSIX. Les motifs
 * sont ordonnés du plus large au plus étroit et la liste est exportée : la
 * migration `011_placeholder_parity.sql` doit la reprendre à l'identique, et
 * le test compare les deux listes élément par élément.
 */
export const SQL_TEAM_PATTERNS: string[] = [
    // Formes exactes : « TBD », « T.B.D. », « TBA », « TBC », « TBD vs TBD »,
    // « Unknown », « N/A », « N / D », les simples tirets. La lettre finale
    // est obligatoire dans la famille `t.b.` pour ne pas attraper un « TB »
    // qui serait un vrai nom de club.
    "^\\s*(t\\.?b\\.?d\\.?|t\\.?b\\.?[ac]\\.?|t\\.?b\\.?[dca]\\.?\\s*(vs?)\\s*t\\.?b\\.?[dca]\\.?|unknown|n\\s*/?\\s*[dca]|-{1,3})\\s*$",
    // Formes longues, cherchées en contenu et non ancrées, comme le JS qui
    // teste `squashed.includes(...)` : « To Be Confirmed », « TBC - To Be
    // Confirmed », « À déterminer », « A venir ». Les accents sont listés en
    // toutes lettres car PostgreSQL ne les normalise pas comme le JS.
    "to\\s*-?\\s*be\\s*(announced|determined|confirmed)|to\\s*-?\\s*confirmed|(a|à)\\s*(d[eé]termin[eé]?r?|confirmer|confirme|venir)",
    // Libellés de tableau final : « Winner », « Winner M1 », « Loser SF ».
    // Plus large que le JS (`[a-z0-9]{1,4}` au lieu d'une lettre unique) mais
    // il exige « winner », « loser » ou « seed » en tête : aucun nom de club
    // réel ne peut y correspondre.
    "^\\s*(winner|loser|seed)\\s*([a-z0-9]{1,4})?\\s*\\d*\\s*$",
    // « 4th Seed », « Best Seed ».
    "^\\s*\\d*(st|nd|rd|th)\\s*(best|worst)?\\s*seed\\s*$",
    // « R1 », « Round 1 », « Premier Tour », avec éventuel « leg ».
    "^\\s*(r1|round\\s*1|premier(\\s*tour)?)\\s*(leg)?\\s*\\d*\\s*$"
];

const SQL_TEAM_COLUMNS = ["home_team", "away_team"];

export const NOT_PLACEHOLDER_TEAMS_SQL = `
    NOT (
        ${SQL_TEAM_COLUMNS.flatMap((column) =>
            SQL_TEAM_PATTERNS.map((pattern) => `${column} ~* '${pattern}'`)
        ).join("\n        OR ")}
    )
`;
