export class ApiError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message);
    }
}

export function badRequest(message: string): ApiError {
    return new ApiError(400, message);
}

export function unauthorized(message: string): ApiError {
    return new ApiError(401, message);
}