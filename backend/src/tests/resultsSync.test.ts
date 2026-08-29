import test from "node:test";
import assert from "node:assert/strict";

import { mapFinishedResult } from "../services/resultsSync.js";

function finishedEvent(overrides: Record<string, unknown> = {}) {
    return {
        id: "401881922",
        competitions: [
            {
                id: "401881922",
                status: { type: { state: "post" } },
                competitors: [
                    { homeAway: "home", score: "3" },
                    { homeAway: "away", score: "2" }
                ]
            }
        ],
        ...overrides
    };
}

test("maps a finished team-sport event to a home win", () => {
    const result = mapFinishedResult(finishedEvent());
    assert.deepEqual(result, {
        provider_event_id: "401881922",
        home_score: 3,
        away_score: 2,
        winner: "home"
    });
});

test("maps an away win and computes the winner from scores", () => {
    const result = mapFinishedResult(finishedEvent({
        competitions: [{
            id: "2",
            status: { type: { state: "post" } },
            competitors: [
                { homeAway: "home", score: "1" },
                { homeAway: "away", score: "5" }
            ]
        }]
    }));
    assert.deepEqual(result, {
        provider_event_id: "2",
        home_score: 1,
        away_score: 5,
        winner: "away"
    });
});

test("returns a draw on equal scores", () => {
    const result = mapFinishedResult(finishedEvent({
        competitions: [{
            id: "3",
            status: { type: { state: "post" } },
            competitors: [
                { homeAway: "home", score: "2" },
                { homeAway: "away", score: "2" }
            ]
        }]
    }));
    assert.equal(result?.winner, "draw");
});

test("returns null for an unfinished event", () => {
    assert.equal(mapFinishedResult(finishedEvent({
        competitions: [{ id: "4", status: { type: { state: "pre" } }, competitors: [] }]
    })), null);
});

test("returns null when a required competitor is missing", () => {
    assert.equal(mapFinishedResult(finishedEvent({
        competitions: [{
            id: "5",
            status: { type: { state: "post" } },
            competitors: [{ homeAway: "home", score: "1" }]
        }]
    })), null);
});

test("falls back to the event id when the competition has no id", () => {
    const result = mapFinishedResult(finishedEvent({
        competitions: [{
            status: { type: { state: "post" } },
            competitors: [
                { homeAway: "home", score: "1" },
                { homeAway: "away", score: "0" }
            ]
        }]
    }));
    assert.equal(result?.provider_event_id, "401881922");
});
