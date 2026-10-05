/**
 * Accès HTTP aux fournisseurs de scores.
 *
 * Les deux API publiques (ESPN, 365scores) n'annoncent aucun contrat de
 * service et réagissent mal aux clients naïfs : un `User-Agent` réduit à sa
 * plus courte expression suffit parfois à se faire bloquer, et une erreur
 * réseau transitoire fait échouer une ligue entière alors que la suivante
 * aurait répondu.
 */

/**
 * Navigateur de bureau crédible. Un UA tronqué (« Mozilla/5.0 ») est un signal
 * d'automatisation ; les API le filtrent en priorité.
 */
const DEFAULT_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/131.0.0.0 Safari/537.36";

const DEFAULT_HEADERS: Record<string, string> = {
    "User-Agent": DEFAULT_USER_AGENT,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9"
};

export interface FetchJsonOptions {
    /** Nombre de tentatives en plus de la première. */
    retries?: number;
    /** Délai avant le premier retry, doublé à chaque nouvelle tentative. */
    backoffMs?: number;
    /** Délai maximal d'une requête, en millisecondes. */
    timeoutMs?: number;
    /** En-têtes additionnels, fusionnés avec ceux par défaut. */
    headers?: Record<string, string>;
    signal?: AbortSignal;
}

export class HttpError extends Error {
    constructor(
        readonly status: number,
        readonly url: string,
        readonly body: string
    ) {
        super(`HTTP ${status} sur ${url}${body ? ` : ${body.slice(0, 120)}` : ""}`);
        this.name = "HttpError";
    }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Un statut ne mérite pas d'être rejoué quand il est définitif : un 403 ou un
 * 404 se reproduira à l'identique, et réessayer ne fait que multiplier les
 * requêtes pour rien. Seuls le réseau et les statuts temporaires sont rejoués.
 */
function isRetryableStatus(status: number): boolean {
    return status === 408 || status === 429 || status >= 500;
}

/** `GET` une URL et parse la réponse JSON, avec reprise sur erreur transitoire. */
export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
    const { retries = 2, backoffMs = 500, timeoutMs = 20000, headers, signal } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        // Une annulation venue de l'appelant doit rester prioritaire sur le
        // timeout interne, sinon un sync interrompu relance une tentative.
        const onAbort = () => controller.abort();
        signal?.addEventListener("abort", onAbort, { once: true });

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { ...DEFAULT_HEADERS, ...headers }
            });

            if (!response.ok) {
                const body = await response.text().catch(() => "");
                throw new HttpError(response.status, url, body);
            }

            return (await response.json()) as T;
        } catch (error) {
            lastError = error;

            if (signal?.aborted) throw error;

            const retryable = error instanceof HttpError ? isRetryableStatus(error.status) : true;
            if (!retryable || attempt === retries) throw error;

            await sleep(backoffMs * 2 ** attempt);
        } finally {
            clearTimeout(timeout);
            signal?.removeEventListener("abort", onAbort);
        }
    }

    throw lastError;
}
