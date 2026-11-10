import { Resend } from "resend";

const DEFAULT_FROM_EMAIL = "RevolutionUC <info@revolutionuc.com>";

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
