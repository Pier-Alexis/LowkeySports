import test from "node:test";
import assert from "node:assert/strict";

import { mapSportName, mapSportsDbEvent, parseEventTimestamp } from "../utils/sportsDbMapper.js";

test("mapSportName maps TheSportsDB sports to site categories", () => {
    assert.equal(mapSportName("Soccer"), "football");
    assert.equal(mapSportName("Basketball"), "basketball");
    assert.equal(mapSportName("Baseball"), "baseball");
    assert.equal(mapSportName("Tennis"), "tennis");
    assert.equal(mapSportName("Ice Hockey"), "ice_hockey");
});

test("parseEventTimestamp prefers strTimestamp", () => {
    const parsed = parseEventTimestamp({
        strTimestamp: "2026-08-28T19:00:00",
        dateEvent: "2026-08-28",
        strTime: "19:00:00"
    });

    assert.ok(parsed instanceof Date);
    assert.equal(parsed.getTime(), new Date("2026-08-28T19:00:00").getTime());
});

test("parseEventTimestamp falls back to dateEvent+strTime", () => {
    const parsed = parseEventTimestamp({ dateEvent: "2026-09-01", strTime: "20:45:00" });

    assert.ok(parsed instanceof Date);
    assert.equal(parsed.getFullYear(), 2026);
    assert.equal(parsed.getMonth(), 8);
    assert.equal(parsed.getDate(), 1);
    assert.equal(parsed.getHours(), 20);
    assert.equal(parsed.getMinutes(), 45);
});

test("parseEventTimestamp returns null without a usable date", () => {
    assert.equal(parseEventTimestamp({}), null);
    assert.equal(parseEventTimestamp({ dateEvent: "pas-une-date" }), null);
});

test("mapSportsDbEvent maps a soccer event", () => {
    const event = {
        idEvent: "2494015",
        strTimestamp: "2026-08-28T19:00:00",
        strLeague: "English Premier League",
        strSport: "Soccer",
        strHomeTeam: "Crystal Palace",
        strAwayTeam: "Manchester City",
        strHomeTeamBadge: "https://example.com/home.png",
        strAwayTeamBadge: "https://example.com/away.png"
    };

    const mapped = mapSportsDbEvent(event);

    assert.ok(mapped);
    assert.equal(mapped.provider, "thesportsdb");
    assert.equal(mapped.provider_event_id, "2494015");
    assert.equal(mapped.sport, "football");
    assert.equal(mapped.competition, "English Premier League");
    assert.equal(mapped.home_team, "Crystal Palace");
    assert.equal(mapped.away_team, "Manchester City");
    assert.equal(mapped.home_team_logo, "https://example.com/home.png");
});

test("mapSportsDbEvent honors the sport override", () => {
    const mapped = mapSportsDbEvent(
        { idEvent: "1", strSport: "Unknown", strHomeTeam: "A", strAwayTeam: "B", dateEvent: "2026-09-01" },
        "Tennis"
    );

    assert.ok(mapped);
    assert.equal(mapped.sport, "tennis");
});

test("mapSportsDbEvent returns null when a required field is missing", () => {
    assert.equal(mapSportsDbEvent({ strHomeTeam: "A", strAwayTeam: "B" }), null);
    assert.equal(
        mapSportsDbEvent({ idEvent: "1", strHomeTeam: "A", dateEvent: "2026-09-01" }),
        null
    );
});