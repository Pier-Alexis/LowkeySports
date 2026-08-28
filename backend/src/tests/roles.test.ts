import test from "node:test";
import assert from "node:assert/strict";
import type { Request, Response, NextFunction } from "express";

import { requireRole } from "../middleware/roles.js";

function makeContext() {
    let statusCode = 200;
    let responseBody: Record<string, unknown> | undefined;
    let nextCalled = false;

    const req = {} as Request;
    const res = {
        status(code: number) {
            statusCode = code;
            return this;
        },
        json(body: Record<string, unknown>) {
            responseBody = body;
            return this;
        },
    } as unknown as Response;
    const next = (() => {
        nextCalled = true;
    }) as NextFunction;

    return { req, res, next, state: () => ({ statusCode, responseBody, nextCalled }) };
}

test("requireRole returns 403 when user role is not allowed", () => {
    const { req, res, next, state } = makeContext();
    (req as { user?: unknown }).user = { id: 1, username: "alice", role: "user" };

    requireRole("admin")(req, res, next);

    const { statusCode, responseBody, nextCalled } = state();
    assert.equal(statusCode, 403);
    assert.deepEqual(responseBody, { error: "Accès refusé" });
    assert.equal(nextCalled, false);
});

test("requireRole calls next when the role is allowed", () => {
    const { req, res, next, state } = makeContext();
    (req as { user?: unknown }).user = { id: 2, username: "bob", role: "admin" };

    requireRole("admin")(req, res, next);

    assert.equal(state().nextCalled, true);
});

test("requireRole returns 403 when the user is missing", () => {
    const { req, res, next, state } = makeContext();

    requireRole("admin")(req, res, next);

    const { statusCode, responseBody } = state();
    assert.equal(statusCode, 403);
    assert.deepEqual(responseBody, { error: "Accès refusé" });
});