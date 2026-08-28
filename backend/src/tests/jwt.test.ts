import test from "node:test";
import assert from "node:assert/strict";

import { createAccessToken, verifyAccessToken, getJwtSecret } from "../services/jwt.js";

process.env.JWT_SECRET = "test_secret";

test("getJwtSecret returns the environment secret", () => {
    assert.equal(getJwtSecret(), "test_secret");
});

test("createAccessToken and verifyAccessToken round-trip the user", () => {
    const user = { id: 1, username: "alice", role: "admin" } as const;
    const token = createAccessToken(user);
    const decoded = verifyAccessToken(token);

    assert.deepEqual(decoded, user);
});

test("verifyAccessToken rejects an invalid token", () => {
    assert.throws(() => verifyAccessToken("not.a.real.token"));
});

test("verifyAccessToken rejects a token signed with another secret", () => {
    process.env.JWT_SECRET = "other_secret";
    const token = createAccessToken({ id: 1, username: "alice", role: "user" });
    process.env.JWT_SECRET = "test_secret";

    assert.throws(() => verifyAccessToken(token));
});