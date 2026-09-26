import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
    NOT_PLACEHOLDER_TEAMS_SQL,
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
        assert.equal(occurrences, 4, `${column} devrait être couvert par les 4 motifs`);
    }

    // Une accolade doublée produit une regex PostgreSQL invalide et fait
    // échouer la requête entière au premier appel.
    assert.equal(NOT_PLACEHOLDER_TEAMS_SQL.includes("{{"), false);
    assert.equal(NOT_PLACEHOLDER_TEAMS_SQL.includes("}}"), false);

    // Le SQL ne peut pas contenir d'apostrophe : le littéral est délimité par
    // des apostrophes, une apostrophe interne clôt le motif trop tôt.
    const literals = NOT_PLACEHOLDER_TEAMS_SQL.split("'");
    assert.equal(literals.length % 2, 1, "apostrophes SQL non équilibrées");

    // Les familles reconnues en JS doivent l'être aussi côté SQL.
    for (const needle of ["t\\.?(b|c|a)", "winner|loser|seed", "seed", "round\\s*1"]) {
        assert.ok(
            NOT_PLACEHOLDER_TEAMS_SQL.includes(needle),
            `le fragment SQL devrait couvrir ${needle}`
        );
    }
});

/**
 * La migration 010 définit `lowkey_is_placeholder_team` avec les mêmes motifs
 * que le fragment applicatif. Elle est relue ici parce qu'une divergence entre
 * les deux est silencieuse : la base purge d'un côté, l'API filtre de l'autre,
 * et le total affiché ne correspond à aucun des deux.
 */
test("la migration 010 reste alignée sur le filtre applicatif", () => {
    const migration = readFileSync(
        new URL("../database/migrations/010_scoring_confidence.sql", import.meta.url),
        "utf8"
    );

    for (const needle of ["t\\.?(b|c|a)", "winner|loser|seed", "\\d*(st|nd|rd|th)", "r1|round\\s*1"]) {
        assert.ok(migration.includes(needle), `la migration devrait couvrir ${needle}`);
    }

    // Un littéral délimité par des apostrophes doit être refermé sur place :
    // une apostrophe interne ferait déborder le motif sur la ligne suivante et
    // la requête entière échouerait.
    const body = migration.slice(migration.indexOf("lowkey_is_placeholder_team"));
    const patterns = [...body.matchAll(/~\* '([^'\n]*)'/g)].map((match) => match[1]);
    assert.equal(patterns.length, 4, "les 4 motifs de la fonction doivent rester sur une seule ligne");
    for (const pattern of patterns) {
        assert.ok(pattern.length > 0, "un motif vide ne filtrerait rien");
    }
});
