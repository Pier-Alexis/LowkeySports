import test from "node:test";
import assert from "node:assert/strict";

import { generateRefreshToken, hashRefreshToken } from "../utils/tokens.js";

test("generateRefreshToken returns unique opaque tokens", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();

    assert.notEqual(a, b);
    assert.ok(a.length >= 32);
});

test("hashRefreshToken produces a stable 64-character hex digest", () => {
    const token = generateRefreshToken();
    const first = hashRefreshToken(token);
    const second = hashRefreshToken(token);

    assert.equal(first, second);
    assert.match(first, /^[0-9a-f]{64}$/);
});

test("hashRefreshToken differs for different tokens", () => {
    assert.notEqual(hashRefreshToken("token-a"), hashRefreshToken("token-b"));
});