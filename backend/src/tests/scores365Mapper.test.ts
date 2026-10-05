import test from "node:test";
import assert from "node:assert/strict";

import {
    BASKETBALL_SPORT_ID,
    leagueMatchesGame,
    mapFinishedScores365Game,
    mapScores365Game
} from "../utils/scores365Mapper.js";
import { LEAGUES } from "../config/leagues.js";
import type { LeagueConfig } from "../config/leagues.js";

const ABA_CFG: LeagueConfig = {
    sport: "basketball",
    provider: "365scores",
    league: "aba-league",
    label: "ABA League",
    region: "europe",
    competitionId: 548,
    flashscore: "https://www.flashscore.com/basketball/"
};

function scheduledGame(overrides: Record<string, unknown> = {}) {
    return {
        id: 4846270,
        sportId: BASKETBALL_SPORT_ID,
        competitionId: 548,
        startTime: "2026-10-05T16:30:00+00:00",
        statusGroup: 2,
        homeCompetitor: { id: 13651, name: "KK Mega Vizura", score: -1 },
        awayCompetitor: { id: 5509, name: "KK Partizan", score: -1 },
        ...overrides
    };
}

test("mapScores365Game converts a scheduled game", () => {
    const mapped = mapScores365Game(ABA_CFG, scheduledGame());

    assert.notEqual(mapped, null);
    assert.equal(mapped?.provider, "365scores");
    assert.equal(mapped?.provider_event_id, "4846270");
    assert.equal(mapped?.sport, "basketball");
    assert.equal(mapped?.competition, "ABA League");
    assert.equal(mapped?.home_team, "KK Mega Vizura");
    assert.equal(mapped?.away_team, "KK Partizan");
    assert.equal(mapped?.scheduled_at.toISOString(), "2026-10-05T16:30:00.000Z");
    assert.equal(mapped?.flashscore_url, "https://www.flashscore.com/basketball/");
});

test("mapScores365Game rejects a game from another competition", () => {
    const other: LeagueConfig = { ...ABA_CFG, label: "BBL", competitionId: 27 };
    assert.equal(mapScores365Game(other, scheduledGame()), null);
});

test("mapScores365Game rejects a competition id reused by another sport", () => {
    // Le flux global mêle les disciplines : le même identifiant désigne autre
    // chose dans un autre sport, le filtre sport est donc obligatoire.
    const footballish = scheduledGame({ sportId: 1 });
    assert.equal(mapScores365Game(ABA_CFG, footballish), null);
});

test("mapScores365Game rejects live, finished and cancelled games", () => {
    assert.equal(mapScores365Game(ABA_CFG, scheduledGame({ statusGroup: 3 })), null);
    assert.equal(mapScores365Game(ABA_CFG, scheduledGame({ statusGroup: 5 })), null);
    assert.equal(mapScores365Game(ABA_CFG, scheduledGame({ statusGroup: 4 })), null);
});

test("mapScores365Game rejects placeholder teams", () => {
    const tbd = scheduledGame({ awayCompetitor: { id: 1, name: "TBD", score: -1 } });
    assert.equal(mapScores365Game(ABA_CFG, tbd), null);
});

test("mapScores365Game rejects an unparseable date and a missing id", () => {
    assert.equal(mapScores365Game(ABA_CFG, scheduledGame({ startTime: "not-a-date" })), null);
    assert.equal(mapScores365Game(ABA_CFG, scheduledGame({ id: undefined })), null);
});

test("mapScores365Game rejects a league configured for another provider", () => {
    const espnOnly: LeagueConfig = { ...ABA_CFG, provider: "espn", competitionId: undefined };
    assert.equal(leagueMatchesGame(espnOnly, scheduledGame()), false);
});

test("mapFinishedScores365Game reads the final score", () => {
    const finished = scheduledGame({
        statusGroup: 5,
        homeCompetitor: { id: 1, name: "A", score: 88 },
        awayCompetitor: { id: 2, name: "B", score: 79 }
    });

    const result = mapFinishedScores365Game(finished);
    assert.equal(result?.home_score, 88);
    assert.equal(result?.away_score, 79);
    assert.equal(result?.provider_event_id, "4846270");
    assert.equal(result?.event_date, "20261005");
});

test("mapFinishedScores365Game ignores the -1 sentinel used before kickoff", () => {
    const notPlayed = scheduledGame({
        statusGroup: 5,
        homeCompetitor: { id: 1, name: "A", score: -1 },
        awayCompetitor: { id: 2, name: "B", score: -1 }
    });
    assert.equal(mapFinishedScores365Game(notPlayed), null);
});

test("mapFinishedScores365Game ignores a still-scheduled game", () => {
    assert.equal(mapFinishedScores365Game(scheduledGame()), null);
});

test("mapFinishedScores365Game accepts a legitimate 0-0", () => {
    const nilNil = scheduledGame({
        statusGroup: 5,
        homeCompetitor: { id: 1, name: "A", score: 0 },
        awayCompetitor: { id: 2, name: "B", score: 0 }
    });
    assert.equal(mapFinishedScores365Game(nilNil)?.home_score, 0);
});

test("every European basketball league declares a 365scores competition id", () => {
    const european = LEAGUES.filter((l) => l.sport === "basketball" && l.region === "europe");
    assert.ok(european.length > 0, "le basket européen doit rester configuré");
    for (const league of european) {
        assert.equal(league.provider, "365scores", `${league.label} doit venir de 365scores`);
        assert.equal(
            typeof league.competitionId,
            "number",
            `${league.label} doit avoir un competitionId`
        );
    }
});

test("competition ids are unique across the 365scores leagues", () => {
    const from365 = LEAGUES.filter((l) => l.provider === "365scores");
    const ids = from365.map((l) => l.competitionId);
    assert.equal(new Set(ids).size, ids.length, `competitionId dupliqué : ${ids.join(", ")}`);
});