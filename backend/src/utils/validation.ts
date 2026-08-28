import { badRequest } from "./errors.js";
import { isPick, Pick } from "../types/match.js";

type Stringish = Record<string, unknown>;

function normalizeString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function assertRequired(value: string, label: string) {
    if (!value) {
        throw badRequest(`${label} est requis`);
    }
}

export function validateRegistrationInput(data: Stringish) {
    const username = normalizeString(data.username);
    const email = normalizeString(data.email).toLowerCase();
    const password = typeof data.password === "string" ? data.password : "";

    assertRequired(username, "Le nom d'utilisateur");
    if (username.length < 3) {
        throw badRequest("Le nom d'utilisateur doit contenir au moins 3 caractères");
    }

    assertRequired(email, "L'adresse email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw badRequest("Veuillez fournir une adresse email valide");
    }

    assertRequired(password, "Le mot de passe");
    if (password.length < 8) {
        throw badRequest("Le mot de passe doit contenir au moins 8 caractères");
    }

    return { username, email, password };
}

export function validateLoginInput(data: Stringish) {
    const email = normalizeString(data.email).toLowerCase();
    const password = typeof data.password === "string" ? data.password : "";

    assertRequired(email, "L'adresse email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw badRequest("Veuillez fournir une adresse email valide");
    }

    assertRequired(password, "Le mot de passe");
    if (password.length < 8) {
        throw badRequest("Le mot de passe doit contenir au moins 8 caractères");
    }

    return { email, password };
}

export function validatePlayerInput(data: Stringish) {
    const sport = normalizeString(data.sport);
    const position = normalizeString(data.position);
    const team = normalizeString(data.team);
    const ageValue = data.age;

    assertRequired(sport, "Le sport");
    assertRequired(position, "Le poste");
    assertRequired(team, "L'équipe");

    if (typeof ageValue !== "number" || Number.isNaN(ageValue) || ageValue < 1 || ageValue > 120) {
        throw badRequest("L'âge doit être un nombre entre 1 et 120");
    }

    return {
        sport,
        position,
        age: ageValue,
        team,
    };
}

export function validateMatchInput(data: Stringish) {
    const sport = normalizeString(data.sport);
    const competition = normalizeString(data.competition);
    const homeTeam = normalizeString(data.homeTeam);
    const awayTeam = normalizeString(data.awayTeam);
    const scheduledAtValue = data.scheduledAt;

    assertRequired(sport, "Le sport");
    assertRequired(homeTeam, "L'équipe à domicile");
    assertRequired(awayTeam, "L'équipe à l'extérieur");

    if (homeTeam.toLowerCase() === awayTeam.toLowerCase()) {
        throw badRequest("Les deux équipes doivent être différentes");
    }

    if (typeof scheduledAtValue !== "string" || Number.isNaN(Date.parse(scheduledAtValue))) {
        throw badRequest("La date du match est invalide");
    }

    const scheduledAt = new Date(scheduledAtValue);
    if (scheduledAt.getTime() <= Date.now()) {
        throw badRequest("La date du match doit être dans le futur");
    }

    return {
        sport,
        competition,
        homeTeam,
        awayTeam,
        scheduledAt,
    };
}

export function validateMatchResultInput(data: Stringish) {
    const homeScore = data.homeScore;
    const awayScore = data.awayScore;

    if (!Number.isInteger(homeScore) || Number(homeScore) < 0 || !Number.isInteger(awayScore) || Number(awayScore) < 0) {
        throw badRequest("Les scores doivent être des entiers positifs");
    }

    return { homeScore: Number(homeScore), awayScore: Number(awayScore) };
}

export function validatePick(data: Stringish) {
    const pick = data.pick;

    if (!isPick(pick)) {
        throw badRequest("Prédiction invalide (valeurs possibles : home, away, draw)");
    }

    return { pick: pick as Pick };
}

export function validatePredictionInput(data: Stringish) {
    const matchId = data.matchId;

    if (!Number.isInteger(matchId) || Number(matchId) <= 0) {
        throw badRequest("ID de match invalide");
    }

    return {
        matchId: Number(matchId),
        ...validatePick(data),
    };
}

export type ArticleStatus = "draft" | "published";

export function validateArticleInput(data: Stringish) {
    const matchId = data.matchId;
    const title = normalizeString(data.title);
    const content = typeof data.content === "string" ? data.content.trim() : "";
    const statusValue = data.status;

    if (!Number.isInteger(matchId) || Number(matchId) <= 0) {
        throw badRequest("ID de match invalide");
    }

    if (title.length < 5) {
        throw badRequest("Le titre doit contenir au moins 5 caractères");
    }

    if (title.length > 255) {
        throw badRequest("Le titre est trop long (255 caractères max)");
    }

    if (content.length < 20) {
        throw badRequest("L'analyse doit contenir au moins 20 caractères");
    }

    let status: ArticleStatus = "draft";
    if (statusValue !== undefined) {
        if (statusValue !== "draft" && statusValue !== "published") {
            throw badRequest("Statut invalide (valeurs : draft, published)");
        }
        status = statusValue;
    }

    return {
        matchId: Number(matchId),
        title,
        content,
        status,
        ...validatePick(data),
    };
}