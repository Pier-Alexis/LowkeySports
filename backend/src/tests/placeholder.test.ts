import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

import {
    NOT_PLACEHOLDER_TEAMS_SQL,
    SQL_TEAM_PATTERNS,
    hasKnownTeams,
    isPlaceholderTeam
} from "../utils/placeholder.js";

test("recognises the plain TBD family", () => {
    for (const value of ["TBD", "tbd", "TBA", "TBC", "T.B.D.", "tbd.", " TBD "]) {
        assert.equal(isPlaceholderTeam(value), true, `${value} devrait être un placeholder`);
    }
});

test("recognises the French equivalents", () => {
    for (const value of ["À déterminer", "a determiner", "À confirmer", "N/D", "n/a"]) {
        assert.equal(isPlaceholderTeam(value), true, `${value} devrait être un placeholder`);
    }
});

test("recognises the English long forms", () => {
    for (const value of ["To Be Announced", "to be determined", "TBC - To Be Confirmed"]) {
        assert.equal(isPlaceholderTeam(value), true, `${value} devrait être un placeholder`);
    }
});

test("recognises NCAA tournament bracket placeholders", () => {
    for (const value of ["Winner M1", "Loser M2", "winner mf1", "Loser SF", "Seed 4", "1st Seed"]) {
        assert.equal(isPlaceholderTeam(value), true, `${value} devrait être un placeholder`);
    }
});

test("does not treat a real club as a placeholder", () => {
    for (const value of ["Real Madrid", "Paris Saint-Germain", "TBD FC", "Winnipeg", "Tebas"]) {
        assert.equal(isPlaceholderTeam(value), false, `${value} ne devrait PAS être un placeholder`);
    }
});

test("empty and non-string values are placeholders", () => {
    assert.equal(isPlaceholderTeam(""), true);
    assert.equal(isPlaceholderTeam("   "), true);
    assert.equal(isPlaceholderTeam(null), true);
    assert.equal(isPlaceholderTeam(undefined), true);
    assert.equal(isPlaceholderTeam(42), true);
});

test("hasKnownTeams rejects as soon as one side is unknown", () => {
    assert.equal(hasKnownTeams("Real Madrid", "Barcelone"), true);
    assert.equal(hasKnownTeams("TBD", "Barcelone"), false);
    assert.equal(hasKnownTeams("Real Madrid", "TBD"), false);
    assert.equal(hasKnownTeams("TBD", "TBD"), false);
});

test("le fragment SQL applique les mêmes motifs que le JS", () => {
    // Les deux colonnes doivent être couvertes par chaque motif, sinon
    // corriger un côté et oublier l'autre fait réapparaître la moitié des
    // matchs TBD.
    for (const column of ["home_team", "away_team"]) {
        const occurrences = NOT_PLACEHOLDER_TEAMS_SQL.split(`${column} ~*`).length - 1;
        assert.equal(occurrences, SQL_TEAM_PATTERNS.length, `${column} devrait être couvert par chaque motif`);
    }

    // Une accolade doublée produit une regex PostgreSQL invalide et fait
    // échouer la requête entière au premier appel.
    assert.equal(NOT_PLACEHOLDER_TEAMS_SQL.includes("{{"), false);
    assert.equal(NOT_PLACEHOLDER_TEAMS_SQL.includes("}}"), false);

    // Le SQL ne peut pas contenir d'apostrophe : le littéral est délimité par
    // des apostrophes, une apostrophe interne clôt le motif trop tôt.
    const literals = NOT_PLACEHOLDER_TEAMS_SQL.split("'");
    assert.equal(literals.length % 2, 1, "apostrophes SQL non équilibrées");

    // Chaque motif doit apparaître tel quel dans le fragment : c'est ce test
    // qui avait laissé passer `t\.?(b|c|a)`, présent dans les deux fichiers
    // mais incapable de reconnaître « TBD ».
    for (const pattern of SQL_TEAM_PATTERNS) {
        assert.ok(NOT_PLACEHOLDER_TEAMS_SQL.includes(pattern), `le fragment SQL devrait contenir ${pattern}`);
    }
});

/**
 * La fonction SQL de purge et le filtre applicatif doivent reconnaître le même
 * ensemble de noms. Une divergence est silencieuse : la base purge d'un côté,
 * l'API filtre de l'autre, et le total affiché ne correspond à aucun des deux.
 *
 * La comparaison est stricte (égalité caractère par caractère) et non une
 * recherche de sous-chaîne : c'est précisément la faiblesse qui a laissé passer
 * `t\.?(b|c|a)`, présent dans les deux fichiers mais faux.
 */
test("la migration 011 reste alignée sur le filtre applicatif", () => {
    const migration = readFileSync(
        new URL("../database/migrations/011_placeholder_parity.sql", import.meta.url),
        "utf8"
    );

    // Un littéral délimité par des apostrophes doit être refermé sur place :
    // une apostrophe interne ferait déborder le motif sur la ligne suivante et
    // la requête entière échouerait.
    const patterns = [...migration.matchAll(/~\* '([^'\n]*)'/g)].map((match) => match[1]);
    assert.deepEqual(
        patterns,
        SQL_TEAM_PATTERNS,
        "les motifs SQL doivent être identiques à ceux du filtre applicatif"
    );
});

/**
 * Un BOM en tête de migration fait échouer PostgreSQL sur une erreur de syntaxe
 * en position 1, sans aucun rapport avec le contenu du fichier.
 */
test("les migrations ne commencent pas par un BOM", () => {
    const dir = new URL("../database/migrations/", import.meta.url);
    for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql"))) {
        const content = readFileSync(new URL(file, dir), "utf8");
        assert.equal(content.startsWith("\uFEFF"), false, `${file} commence par un BOM`);
    }
});
