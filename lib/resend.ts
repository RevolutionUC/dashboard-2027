import { Resend, type CreateBatchOptions } from "resend";

const DEFAULT_FROM_EMAIL = "RevolutionUC <info@revolutionuc.com>";

// Retries per batch after a temporary error. Retrying is safe because every
// attempt reuses the batch's idempotency key, so Resend delivers each email at
// most once even if an earlier attempt was accepted but its response was lost.
const MAX_BATCH_RETRIES = 2;
// Upper bound for one retry wait, including a server-provided retry-after.
const MAX_RETRY_DELAY_MS = 5000;
// Abort one attempt if Resend hasn't answered by then (the SDK has no timeout).
const DEFAULT_ATTEMPT_TIMEOUT_MS = 15_000;
// Don't start an attempt with less than this much time left before the deadline.
const MIN_ATTEMPT_MS = 2000;

// Errors that may succeed on a later attempt: rate limits, Resend 5xx, network
// failures (the SDK reports those as application_error), and an earlier attempt
// with the same idempotency key that is still being processed.
const RETRYABLE_ERRORS = new Set<string>([
    "rate_limit_exceeded",
    "application_error",
    "internal_server_error",
    "concurrent_idempotent_requests",
]);

// Account-level errors that would fail every remaining batch the same way.
const STOP_ERRORS = new Set<string>([
    "daily_quota_exceeded",
    "monthly_quota_exceeded",
    "missing_api_key",
    "invalid_api_key",
    "restricted_api_key",
]);

export type BatchSendOutcome =
    | { ok: true; messageIds: string[]; rejected: { index: number; message: string }[] }
    | { ok: false; error: string; stop: boolean };

export interface BatchSendLimits {
    /** Abort one attempt after this many ms without a response. */
    attemptTimeoutMs?: number;
    /** Epoch ms. No attempt runs past it, and no retry starts that can't finish before it. */
    deadline?: number;
}

let client: Resend | null = null;

export function getResend(): Resend | null {
    if (client) return client;
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;
    client = new Resend(apiKey);
    return client;
}

export function getFromAddress(): string {
    return process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(attempt: number, headers: Record<string, string> | null): number {
    const retryAfterSeconds = Number(headers?.["retry-after"]);
    const delayMs =
        Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? retryAfterSeconds * 1000
            : 1000 * 2 ** attempt;
    return Math.min(delayMs, MAX_RETRY_DELAY_MS);
}

/**
 * Send one batch (up to 100 emails) in permissive mode, retrying temporary
 * errors with the same idempotency key. Each attempt is cut off after
 * `attemptTimeoutMs`, and nothing runs past `deadline`. `stop` is true when
 * later batches shouldn't be attempted: an account-level error (quota, API
 * key) or no time left.
 */
export async function sendBatchWithRetry(
    resend: Resend,
    emails: CreateBatchOptions,
    idempotencyKey: string,
    limits: BatchSendLimits = {},
): Promise<BatchSendOutcome> {
    const attemptTimeoutMs = limits.attemptTimeoutMs ?? DEFAULT_ATTEMPT_TIMEOUT_MS;
    const deadline = limits.deadline ?? Number.POSITIVE_INFINITY;

    for (let attempt = 0; ; attempt++) {
        const timeoutMs = Math.min(attemptTimeoutMs, deadline - Date.now());
        if (timeoutMs < MIN_ATTEMPT_MS) {
            return { ok: false, error: "Out of time before this batch could be sent", stop: true };
        }
        const signal = AbortSignal.timeout(timeoutMs);
        // A timed-out request may still have reached Resend; retrying with the
        // same idempotency key returns the original result instead of resending.
        const timeoutMessage = `timeout: Resend did not respond within ${Math.round(timeoutMs / 1000)}s (this batch may still have been delivered)`;

        let errorMessage: string;
        let retryable = true;
        let headers: Record<string, string> | null = null;

        try {
            // The SDK returns API and network errors (including an abort) instead of throwing them
            const {
                data,
                error,
                headers: responseHeaders,
            } = await resend.batch.send(emails, {
                idempotencyKey,
                batchValidation: "permissive",
                signal,
            });

            if (!error) {
                return {
                    ok: true,
                    messageIds: data.data.map((entry) => entry.id),
                    rejected: (data.errors ?? []).map(({ index, message }) => ({
                        index,
                        message,
                    })),
                };
            }

            if (signal.aborted) {
                errorMessage = timeoutMessage;
            } else {
                errorMessage = `${error.name}: ${error.message}`;
                if (STOP_ERRORS.has(error.name)) {
                    return { ok: false, error: errorMessage, stop: true };
                }
                retryable = RETRYABLE_ERRORS.has(error.name) || (error.statusCode ?? 0) >= 500;
                headers = responseHeaders;
            }
        } catch (error) {
            // Unexpected throw; retrying is still safe thanks to the idempotency key
            errorMessage = signal.aborted
                ? timeoutMessage
                : error instanceof Error
                  ? error.message
                  : "Unknown error";
        }

        if (!retryable || attempt >= MAX_BATCH_RETRIES) {
            return { ok: false, error: errorMessage, stop: false };
        }
        const delayMs = getRetryDelayMs(attempt, headers);
        if (Date.now() + delayMs + MIN_ATTEMPT_MS > deadline) {
            return { ok: false, error: `${errorMessage}; no time left to retry`, stop: true };
        }
        await wait(delayMs);
    }
}
