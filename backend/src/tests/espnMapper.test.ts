import test from "node:test";
import assert from "node:assert/strict";

import { mapEspnEvent } from "../utils/espnMapper.js";
import type { LeagueConfig } from "../config/leagues.js";

const FOOTBALL_CFG: LeagueConfig = {
    sport: "football",
    provider: "espn",
    espnSport: "soccer",
    league: "eng.1",
    label: "Premier League",
    region: "world",
    flashscore: "https://www.flashscore.com/football/"
};

const TENNIS_CFG: LeagueConfig = {
    sport: "tennis",
    provider: "espn",
    espnSport: "tennis",
    league: "atp",
    label: "ATP",
    region: "world",
    flashscore: "https://www.flashscore.com/tennis/"
};

function teamEvent(overrides: Record<string, unknown> = {}) {
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

test("maps a team-sport scheduled game to a single match", () => {
    const mapped = mapEspnEvent(teamEvent(), FOOTBALL_CFG);

    assert.equal(mapped.length, 1);
    const m = mapped[0];
    assert.equal(m.provider, "espn");
    assert.equal(m.provider_event_id, "401879294");
    assert.equal(m.sport, "football");
    assert.equal(m.competition, "Premier League");
    assert.equal(m.home_team, "Crystal Palace");
    assert.equal(m.away_team, "Manchester City");
    assert.equal(m.home_team_logo, "https://home.png");
    assert.equal(m.away_team_logo, "https://away.png");
    assert.equal(m.scheduled_at.toISOString(), "2026-08-28T19:00:00.000Z");
});

test("uses the configured sport category", () => {
    const basketball = { ...FOOTBALL_CFG, sport: "basketball", league: "nba", label: "NBA" };
    const mapped = mapEspnEvent(teamEvent(), basketball);
    assert.equal(mapped.length, 1);
    assert.equal(mapped[0].sport, "basketball");
    assert.equal(mapped[0].competition, "NBA");
});

test("returns an empty array when a required field is missing", () => {
    assert.equal(mapEspnEvent(teamEvent({ id: undefined }), FOOTBALL_CFG).length, 0);
    assert.equal(mapEspnEvent(teamEvent({ date: "pas-une-date" }), FOOTBALL_CFG).length, 0);
    const noTeams = teamEvent({ competitions: [{ competitors: [] }] });
    assert.equal(mapEspnEvent(noTeams, FOOTBALL_CFG).length, 0);
});

test("skips finished (non-pending) team games", () => {
    const finished = teamEvent({ status: { type: { state: "post" } } });
    assert.equal(mapEspnEvent(finished, FOOTBALL_CFG).length, 0);
});

test("handles missing team logos", () => {
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
    const mapped = mapEspnEvent(noLogos, FOOTBALL_CFG);
    assert.equal(mapped.length, 1);
    assert.equal(mapped[0].home_team_logo, null);
    assert.equal(mapped[0].away_team_logo, null);
});

test("maps tennis tournaments: one match per pending grouped competition", () => {
    const event = {
        id: "363-2026",
        date: "2026-08-22T04:00Z",
        groupings: [
            {
                competitions: [
                    {
                        id: "182065",
                        date: "2026-08-29T20:00Z",
                        status: { type: { state: "pre" } },
                        competitors: [
                            { homeAway: "home", athlete: { displayName: "Arthur Fery" } },
                            { homeAway: "away", athlete: { displayName: "Ignacio Buse" } }
                        ]
                    },
                    {
                        id: "182071",
                        date: "2026-08-29T00:35Z",
                        status: { type: { state: "post" } },
                        competitors: [
                            { homeAway: "home", athlete: { displayName: "Player A" } },
                            { homeAway: "away", athlete: { displayName: "Player B" } }
                        ]
                    }
                ]
            }
        ]
    };

    const mapped = mapEspnEvent(event, TENNIS_CFG);

    assert.equal(mapped.length, 1);
    const [m] = mapped;
    assert.equal(m.sport, "tennis");
    assert.equal(m.provider_event_id, "182065");
    assert.equal(m.home_team, "Arthur Fery");
    assert.equal(m.away_team, "Ignacio Buse");
    assert.equal(m.home_team_logo, null);
});

test("skips tennis matches whose opponents are not yet known", () => {
    const event = {
        id: "363-2026",
        groupings: [
            {
                competitions: [
                    {
                        id: "182071",
                        date: "2026-08-29T00:35Z",
                        status: { type: { state: "pre" } },
                        competitors: [
                            { homeAway: "home", athlete: {} },
                            { homeAway: "away", athlete: {} }
                        ]
                    }
                ]
            }
        ]
    };

    assert.equal(mapEspnEvent(event, TENNIS_CFG).length, 0);
});

function tbdEvent(home: string, away: string) {
    return {
        id: "555",
        date: "2026-12-26T18:00:00Z",
        status: { type: { state: "pre" } },
        competitions: [
            {
                competitors: [
                    { homeAway: "home", team: { displayName: home } },
                    { homeAway: "away", team: { displayName: away } }
                ]
            }
        ]
    };
}

test("skips a TBD vs TBD matchup", () => {
    assert.equal(mapEspnEvent(tbdEvent("TBD", "TBD"), FOOTBALL_CFG).length, 0);
});

test("skips a matchup whose opponent is still TBD", () => {
    assert.equal(mapEspnEvent(tbdEvent("Ohio State", "TBD"), FOOTBALL_CFG).length, 0);
    assert.equal(mapEspnEvent(tbdEvent("TBD", "Notre Dame"), FOOTBALL_CFG).length, 0);
});

test("skips NCAA tournament bracket placeholders", () => {
    assert.equal(mapEspnEvent(tbdEvent("Winner M1", "Loser M2"), FOOTBALL_CFG).length, 0);
    assert.equal(mapEspnEvent(tbdEvent("Ohio State", "Winner M1"), FOOTBALL_CFG).length, 0);
});

test("accepts lowercase and punctuated TBD variants", () => {
    assert.equal(mapEspnEvent(tbdEvent("tbd", "T.B.D."), FOOTBALL_CFG).length, 0);
    assert.equal(mapEspnEvent(tbdEvent("TBA", "To Be Announced"), FOOTBALL_CFG).length, 0);
});

test("carries the FlashScore hub of the competition", () => {
    const mapped = mapEspnEvent(teamEvent(), FOOTBALL_CFG);
    assert.equal(mapped[0].flashscore_url, "https://www.flashscore.com/football/");
});
