import test from "node:test";
import assert from "node:assert/strict";

import {
    validateRegistrationInput,
    validateLoginInput,
    validatePlayerInput,
    validateMatchInput,
    validatePredictionInput,
    validatePick,
    validateArticleInput,
} from "../utils/validation.js";

test("validateRegistrationInput rejects a weak password", () => {
    assert.throws(
        () => validateRegistrationInput({
            username: "alice",
            email: "alice@example.com",
            password: "123",
        }),
        /au moins 8 caractères/
    );
});

test("validateLoginInput normalizes email", () => {
  const result = validateLoginInput({
    email: "  ALICE@EXAMPLE.com  ",
    password: "Secret123",
  });

  assert.equal(result.email, "alice@example.com");
  assert.equal(result.password, "Secret123");
});

test("validatePlayerInput accepts valid profile data", () => {
    const result = validatePlayerInput({
        sport: "Hockey",
        position: "Forward",
        age: 22,
        team: "Lions",
    });

    assert.equal(result.sport, "Hockey");
    assert.equal(result.position, "Forward");
    assert.equal(result.age, 22);
    assert.equal(result.team, "Lions");
});

test("validateMatchInput accepts valid future match data", () => {
    const result = validateMatchInput({
        sport: "Hockey",
        competition: "NHL",
        homeTeam: "Lions",
        awayTeam: "Tigers",
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    assert.equal(result.sport, "Hockey");
    assert.equal(result.competition, "NHL");
    assert.equal(result.homeTeam, "Lions");
    assert.equal(result.awayTeam, "Tigers");
    assert.ok(result.scheduledAt instanceof Date);
});

test("validateMatchInput rejects identical teams", () => {
    assert.throws(
        () => validateMatchInput({
            sport: "Hockey",
            homeTeam: "Lions",
            awayTeam: "Lions",
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
        /différentes/
    );
});

test("validateMatchInput rejects a past date", () => {
    assert.throws(
        () => validateMatchInput({
            sport: "Hockey",
            homeTeam: "Lions",
            awayTeam: "Tigers",
            scheduledAt: new Date(Date.now() - 60 * 1000).toISOString(),
        }),
        /futur/
    );
});

test("validatePredictionInput rejects an invalid pick", () => {
    assert.throws(
        () => validatePredictionInput({ matchId: 1, pick: "unknown" }),
        /Prédiction invalide/
    );
});

test("validatePredictionInput rejects an invalid match id", () => {
    assert.throws(
        () => validatePredictionInput({ matchId: 0, pick: "home" }),
        /ID de match invalide/
    );
});

test("validatePredictionInput accepts a valid pick for a valid match", () => {
    const result = validatePredictionInput({ matchId: 7, pick: "away" });
    assert.deepEqual(result, { matchId: 7, pick: "away" });
});

test("validatePick only accepts home, away or draw", () => {
    const result = validatePick({ pick: "draw" });
    assert.deepEqual(result, { pick: "draw" });
});

test("validateArticleInput accepts valid editorial data", () => {
    const result = validateArticleInput({
        matchId: 3,
        title: "Analyse du choc",
        content: "Une analyse complète de cette rencontre très attendue.",
        pick: "home",
        status: "published",
    });

    assert.deepEqual(result, {
        matchId: 3,
        title: "Analyse du choc",
        content: "Une analyse complète de cette rencontre très attendue.",
        pick: "home",
        status: "published",
    });
});

test("validateArticleInput defaults the status to draft", () => {
    const result = validateArticleInput({
        matchId: 3,
        title: "Analyse du choc",
        content: "Une analyse complète de cette rencontre très attendue.",
        pick: "away",
    });

    assert.equal(result.status, "draft");
});

test("validateArticleInput rejects a short title or a tiny analysis", () => {
    assert.throws(
        () => validateArticleInput({ matchId: 1, title: "A", content: "Un texte assez long pour réussir.", pick: "home" }),
        /titre doit contenir/
    );

    assert.throws(
        () => validateArticleInput({ matchId: 1, title: "Titre valide", content: "court", pick: "home" }),
        /au moins 20 caractères/
    );
});
