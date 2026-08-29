import test from "node:test";
import assert from "node:assert/strict";

import { mapFinishedResult, teamNamesMatch } from "../services/resultsSync.js";

function competitor(name: string, score: string, homeAway: string) {
    return { homeAway, score, team: { displayName: name } };
}

function finishedEvent(overrides: Record<string, unknown> = {}) {
    return {
        id: "401881922",
        competitions: [
            {
                id: "401881922",
                date: "2026-08-28T19:00:00Z",
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
        winner: "home",
        event_date: "20260828"
    });
});

test("returns null when the event has no date", () => {
    assert.equal(mapFinishedResult(finishedEvent({
        competitions: [{
            id: "6",
            status: { type: { state: "post" } },
            competitors: [
                competitor("Home Team", "2", "home"),
                competitor("Away Team", "0", "away")
            ]
        }]
    }), "soccer"), null);
});

test("maps an away win and computes the winner from scores", () => {
    const result = mapFinishedResult(finishedEvent({
        competitions: [{
            id: "2",
            date: "2026-08-28T19:00:00Z",
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
            date: "2026-08-28T19:00:00Z",
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
            date: "2026-08-28T19:00:00Z",
            status: { type: { state: "post" } },
            competitors: [
                competitor("Team A", "1", "home"),
                competitor("Team B", "0", "away")
            ]
        }]
    }), "soccer");
    assert.equal(result?.provider_event_id, "401881922");
});

test("teamNamesMatch ignores case and accents", () => {
    assert.equal(teamNamesMatch("Montreal Canadiens", "MONTRÉAL CANADIENS"), true);
});

test("teamNamesMatch ignores common filler words like 'de'", () => {
    assert.equal(teamNamesMatch("Racing de Santander", "Racing Santander"), true);
    assert.equal(teamNamesMatch("Los Angeles Lakers", "Lakers"), true);
});

test("teamNamesMatch matches exact names", () => {
    assert.equal(teamNamesMatch("Manchester City", "Manchester City"), true);
});

test("teamNamesMatch rejects unrelated names", () => {
    assert.equal(teamNamesMatch("Manchester United", "Manchester City"), false);
    assert.equal(teamNamesMatch("Liverpool", "Everton"), false);
});
