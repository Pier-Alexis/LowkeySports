import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/errors.js";

interface PgError {
    code?: string;
}

function isPgError(value: unknown): value is PgError {
    return typeof value === "object" && value !== null && "code" in value;
}

export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({ error: err.message });
    }

    if (isPgError(err) && err.code === "23505") {
        return res.status(409).json({
            error: "Une entrée avec ces identifiants existe déjà"
        });
    }

    console.error(err);

    res.status(500).json({
        error: "Une erreur interne est survenue"
    });
}