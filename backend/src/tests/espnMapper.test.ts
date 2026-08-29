import test from "node:test";
import assert from "node:assert/strict";

import { mapEspnEvent } from "../utils/espnMapper.js";
import type { EspnLeagueConfig } from "../config/leagues.js";

const NFL_STYLE_CFG: EspnLeagueConfig = {
    sport: "football",
    espnSport: "soccer",
    league: "eng.1",
    label: "Premier League"
};

function event(overrides: Record<string, unknown> = {}) {
    return {
        id: "401879294",
        date: "2026-08-28T19:00:00Z",
        status: { type: { state: "pre" } },
        competitions: [
            {
                competitors: [
                    { homeAway: "home", team: { displayName: "Crystal Palace", logo: "https://home.png" } },
                    { homeAway: "away", team: { displayName: "Manchester City", logo: "https://away.png" } }
                ]
            }
        ],
        ...overrides
    };
}

test("mapEspnEvent maps a scheduled game", () => {
    const mapped = mapEspnEvent(event(), NFL_STYLE_CFG);

    assert.ok(mapped);
    assert.equal(mapped.provider, "espn");
    assert.equal(mapped.provider_event_id, "401879294");
    assert.equal(mapped.sport, "football");
    assert.equal(mapped.competition, "Premier League");
    assert.equal(mapped.home_team, "Crystal Palace");
    assert.equal(mapped.away_team, "Manchester City");
    assert.equal(mapped.home_team_logo, "https://home.png");
    assert.equal(mapped.away_team_logo, "https://away.png");
    assert.equal(mapped.scheduled_at.toISOString(), "2026-08-28T19:00:00.000Z");
});

test("mapEspnEvent uses the configured sport category", () => {
    const basketball = { ...NFL_STYLE_CFG, sport: "basketball", league: "nba", label: "NBA" };
    const mapped = mapEspnEvent(event(), basketball);
    assert.ok(mapped);
    assert.equal(mapped.sport, "basketball");
    assert.equal(mapped.competition, "NBA");
});

test("mapEspnEvent returns null when a required field is missing", () => {
    assert.equal(mapEspnEvent(event({ id: undefined }), NFL_STYLE_CFG), null);
    assert.equal(mapEspnEvent(event({ date: "pas-une-date" }), NFL_STYLE_CFG), null);
    const noCompetitors = event({ competitions: [{ competitors: [] }] });
    assert.equal(mapEspnEvent(noCompetitors, NFL_STYLE_CFG), null);
});

test("mapEspnEvent skips finished (non-pending) games", () => {
    const finished = event({ status: { type: { state: "post" } } });
    assert.equal(mapEspnEvent(finished, NFL_STYLE_CFG), null);
});

test("mapEspnEvent handles missing team logos", () => {
    const noLogos = {
        id: "2",
        date: "2026-08-28T19:00:00Z",
        status: { type: { state: "pre" } },
        competitions: [
            { competitors: [
                { homeAway: "home", team: { displayName: "Team A" } },
                { homeAway: "away", team: { displayName: "Team B" } }
            ] }
        ]
    };
    const mapped = mapEspnEvent(noLogos, NFL_STYLE_CFG);
    assert.ok(mapped);
    assert.equal(mapped.home_team_logo, null);
    assert.equal(mapped.away_team_logo, null);
});
