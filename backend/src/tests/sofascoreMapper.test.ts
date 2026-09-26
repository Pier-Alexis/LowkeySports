import test from "node:test";
import assert from "node:assert/strict";

import type { LeagueConfig } from "../config/leagues.js";
import {
    mapFinishedSofascoreResult,
    mapSofascoreEvent,
    leagueMatchesEvent,
    normalizeTournamentName
} from "../utils/sofascoreMapper.js";

const ACB: LeagueConfig = {
    sport: "basketball",
    provider: "sofascore",
    league: "liga-acb",
    label: "Liga ACB",
    region: "europe",
    sofascoreTournament: ["Liga ACB", "ACB"],
    sofascoreCountry: "Spain",
    flashscore: "https://www.flashscore.com/basketball/"
};

function event(overrides: Record<string, unknown> = {}) {
    return {
        id: 1234567,
        startTimestamp: 1767225600,
        status: { type: "notstarted" },
        homeTeam: { name: "Real Madrid", id: 1 },
        awayTeam: { name: "Barcelona", id: 2 },
        tournament: {
            name: "Liga ACB",
            uniqueTournament: { id: 118, name: "Liga ACB" },
            category: { name: "Spain", alpha2: "ES" }
        },
        ...overrides
    };
}

test("maps a scheduled basketball event to a match", () => {
    const mapped = mapSofascoreEvent(event(), ACB);

    assert.ok(mapped);
    assert.equal(mapped.provider, "sofascore");
    assert.equal(mapped.provider_event_id, "1234567");
    assert.equal(mapped.sport, "basketball");
    assert.equal(mapped.competition, "Liga ACB");
    assert.equal(mapped.home_team, "Real Madrid");
    assert.equal(mapped.away_team, "Barcelona");
    assert.equal(mapped.scheduled_at.toISOString(), new Date(1767225600 * 1000).toISOString());
    assert.equal(mapped.flashscore_url, "https://www.flashscore.com/basketball/");
});

test("rejects a finished event when importing upcoming matches", () => {
    assert.equal(mapSofascoreEvent(event({ status: { type: "finished" } }), ACB), null);
});

test("rejects an event whose opponent is still TBD", () => {
    const tbd = event({ awayTeam: { name: "TBD", id: 3 } });
    assert.equal(mapSofascoreEvent(tbd, ACB), null);
});

test("rejects an event without a usable timestamp", () => {
    assert.equal(mapSofascoreEvent(event({ startTimestamp: undefined }), ACB), null);
});

test("normalises tournament names before comparing", () => {
    assert.equal(normalizeTournamentName("Liga ACB"), "liga acb");
    assert.equal(normalizeTournamentName("  Liga   ACB  "), "liga acb");
    assert.equal(normalizeTournamentName("Basketbol Süper Ligi"), "basketbol super ligi");
    assert.equal(normalizeTournamentName(undefined), "");
});

test("matches a league on any of its tournament aliases", () => {
    assert.equal(leagueMatchesEvent(ACB, event() as never), true);

    const acbShort = event({
        tournament: {
            name: "ACB",
            uniqueTournament: { id: 118, name: "ACB" },
            category: { name: "Spain", alpha2: "ES" }
        }
    });
    assert.equal(leagueMatchesEvent(ACB, acbShort as never), true);
});

test("falls back to the country when the tournament was renamed", () => {
    const renamed = event({
        tournament: {
            name: "Liga Endesa",
            uniqueTournament: { id: 118, name: "Liga Endesa" },
            category: { name: "Spain", alpha2: "ES" }
        }
    });
    assert.equal(leagueMatchesEvent(ACB, renamed as never), true);
});

test("does not match a league from another country", () => {
    const french = event({
        tournament: {
            name: "Betclic Elite",
            uniqueTournament: { id: 137, name: "Betclic Elite" },
            category: { name: "France", alpha2: "FR" }
        }
    });
    assert.equal(leagueMatchesEvent(ACB, french as never), false);
});

test("maps a finished event to a result with a winner", () => {
    const finished = event({
        status: { type: "finished" },
        homeScore: { current: 88 },
        awayScore: { current: 74 }
    });

    const result = mapFinishedSofascoreResult(finished as never, "basketball");
    assert.ok(result);
    assert.equal(result.provider_event_id, "1234567");
    assert.equal(result.home_score, 88);
    assert.equal(result.away_score, 74);
    assert.equal(result.winner, "home");
    assert.match(result.event_date, /^\d{8}$/);
});

test("returns null for a finished event without scores", () => {
    const noScore = event({ status: { type: "finished" } });
    assert.equal(mapFinishedSofascoreResult(noScore as never, "basketball"), null);
});

test("returns null for an unfinished event in the results pass", () => {
    assert.equal(mapFinishedSofascoreResult(event() as never, "basketball"), null);
});
