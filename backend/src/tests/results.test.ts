import test from "node:test";
import assert from "node:assert/strict";

import { computeWinner, computePoints } from "../utils/results.js";

test("computeWinner returns home when home score is greater", () => {
    assert.equal(computeWinner(3, 1), "home");
});

test("computeWinner returns away when away score is greater", () => {
    assert.equal(computeWinner(0, 2), "away");
});

test("computeWinner returns draw on equal scores", () => {
    assert.equal(computeWinner(2, 2), "draw");
});

test("computePoints awards 1 point for a correct pick and 0 otherwise", () => {
    assert.equal(computePoints("home", "home"), 1);
    assert.equal(computePoints("away", "home"), 0);
    assert.equal(computePoints("draw", "draw"), 1);
    assert.equal(computePoints("home", "draw"), 0);
});