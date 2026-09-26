import test from "node:test";
import assert from "node:assert/strict";

import { computeWinner, computePoints, normalizeConfidence } from "../utils/results.js";

test("computeWinner returns home when home score is greater", () => {
    assert.equal(computeWinner(3, 1), "home");
});

test("computeWinner returns away when away score is greater", () => {
    assert.equal(computeWinner(0, 2), "away");
});

test("computeWinner returns draw on equal scores", () => {
    assert.equal(computeWinner(2, 2), "draw");
});

test("a low-confidence correct pick is worth 0.5", () => {
    assert.equal(computePoints("home", "home", 1), 0.5);
    assert.equal(computePoints("home", "home", 2), 0.5);
    assert.equal(computePoints("draw", "draw", 3), 0.5);
});

test("a missing confidence falls back to the default barème", () => {
    assert.equal(computePoints("home", "home"), 0.5);
    assert.equal(computePoints("draw", "draw", null), 0.5);
});

test("confidence 4 is worth 1 point and confidence 5 is worth 2", () => {
    assert.equal(computePoints("away", "away", 4), 1);
    assert.equal(computePoints("away", "away", 5), 2);
});

test("a wrong pick is worth nothing whatever the confidence", () => {
    for (const confidence of [1, 2, 3, 4, 5]) {
        assert.equal(computePoints("home", "away", confidence), 0);
        assert.equal(computePoints("draw", "home", confidence), 0);
    }
});

test("confidence 5 is worth four times a default pick", () => {
    assert.equal(computePoints("home", "home", 5) / computePoints("home", "home", 2), 4);
});

test("normalizeConfidence clamps to the 1-5 range", () => {
    assert.equal(normalizeConfidence(0), 1);
    assert.equal(normalizeConfidence(9), 5);
    assert.equal(normalizeConfidence(3), 3);
    assert.equal(normalizeConfidence(undefined), 2);
    assert.equal(normalizeConfidence(2.5), 2);
});
