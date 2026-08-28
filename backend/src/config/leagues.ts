export interface LeagueConfig {
    id: string;
    sport: string;
}

export const DEFAULT_LEAGUES: LeagueConfig[] = [
    { id: "4328", sport: "football" },
    { id: "4335", sport: "football" },
    { id: "4480", sport: "football" },
    { id: "4387", sport: "basketball" },
    { id: "4464", sport: "tennis" },
    { id: "4591", sport: "baseball" }
];