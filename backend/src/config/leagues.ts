export interface EspnLeagueConfig {
    sport: string;     // catégorie du site (football, basketball, ...)
    espnSport: string; // slug sport ESPN (soccer, basketball, ...)
    league: string;    // slug ligue ESPN (eng.1, nba, ...)
    label: string;     // libellé compétition
}

export const ESPN_LEAGUES: EspnLeagueConfig[] = [
    { sport: "football", espnSport: "soccer", league: "eng.1", label: "Premier League" },
    { sport: "football", espnSport: "soccer", league: "esp.1", label: "La Liga" },
    { sport: "football", espnSport: "soccer", league: "fra.1", label: "Ligue 1" },
    { sport: "football", espnSport: "soccer", league: "ita.1", label: "Serie A" },
    { sport: "football", espnSport: "soccer", league: "ger.1", label: "Bundesliga" },
    { sport: "football", espnSport: "soccer", league: "uefa.champions", label: "Ligue des Champions" },
    { sport: "basketball", espnSport: "basketball", league: "nba", label: "NBA" },
    { sport: "tennis", espnSport: "tennis", league: "atp", label: "ATP" },
    { sport: "baseball", espnSport: "baseball", league: "mlb", label: "MLB" },
    { sport: "hockey", espnSport: "hockey", league: "nhl", label: "NHL" }
];
