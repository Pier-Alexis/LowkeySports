import test from "node:test";
import assert from "node:assert/strict";

import { mapFinishedResult } from "../services/resultsSync.js";

function competitor(name: string, score: string, homeAway: string) {
    return { homeAway, score, team: { displayName: name } };
}

function finishedEvent(overrides: Record<string, unknown> = {}) {
    return {
        id: "401881922",
        competitions: [
            {
                id: "401881922",
                status: { type: { state: "post" } },
                competitors: [
                    competitor("Crystal Palace", "3", "home"),
                    competitor("Manchester City", "2", "away")
                ]
            }
        ],
        ...overrides
    };
}

test("maps a finished team-sport event to a home win with team names", () => {
    const result = mapFinishedResult(finishedEvent(), "soccer");
    assert.deepEqual(result, {
        provider_event_id: "401881922",
        sport: "soccer",
        home_team: "Crystal Palace",
        away_team: "Manchester City",
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
                competitor("Home Team", "1", "home"),
                competitor("Away Team", "5", "away")
            ]
        }]
    }), "baseball");
    assert.equal(result?.winner, "away");
    assert.equal(result?.home_score, 1);
    assert.equal(result?.away_score, 5);
    assert.equal(result?.sport, "baseball");
});

test("returns a draw on equal scores", () => {
    const result = mapFinishedResult(finishedEvent({
        competitions: [{
            id: "3",
            status: { type: { state: "post" } },
            competitors: [
                competitor("Team A", "2", "home"),
                competitor("Team B", "2", "away")
            ]
        }]
    }), "soccer");
    assert.equal(result?.winner, "draw");
});

test("returns null for an unfinished event", () => {
    assert.equal(mapFinishedResult(finishedEvent({
        competitions: [{ id: "4", status: { type: { state: "pre" } }, competitors: [] }]
    }), "soccer"), null);
});

test("returns null when a required competitor is missing", () => {
    assert.equal(mapFinishedResult(finishedEvent({
        competitions: [{
            id: "5",
            status: { type: { state: "post" } },
            competitors: [competitor("Home Team", "1", "home")]
        }]
    }), "soccer"), null);
});

test("falls back to the event id when the competition has no id", () => {
    const result = mapFinishedResult(finishedEvent({
        competitions: [{
            status: { type: { state: "post" } },
            competitors: [
                competitor("Team A", "1", "home"),
                competitor("Team B", "0", "away")
            ]
        }]
    }), "soccer");
    assert.equal(result?.provider_event_id, "401881922");
});
