import test from "node:test";
import assert from "node:assert/strict";

import { canAccessUserProfile, canManageUserRole } from "../utils/permissions.js";

test("admin can access any user profile", () => {
    assert.equal(
        canAccessUserProfile({ id: 1, username: "admin", role: "admin" }, 42),
        true
    );
});

test("regular user can only access their own profile", () => {
    assert.equal(
        canAccessUserProfile({ id: 5, username: "alice", role: "user" }, 42),
        false
    );

    assert.equal(
        canAccessUserProfile({ id: 5, username: "alice", role: "user" }, 5),
        true
    );
});

test("only admins can manage user roles", () => {
    assert.equal(
        canManageUserRole({ id: 1, username: "admin", role: "admin" }),
        true
    );

    assert.equal(
        canManageUserRole({ id: 1, username: "alice", role: "user" }),
        false
    );
});