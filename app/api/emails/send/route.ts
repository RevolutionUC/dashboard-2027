import { NextRequest, NextResponse } from "next/server";
import { getSessionWithRole } from "@/lib/auth";
import {
    getTemplateById,
    renderTemplateToHtml,
    renderTemplateToText,
} from "@/lib/templates";
import { getFromAddress, getResend, sendBatchWithRetry } from "@/lib/resend";
import { db } from "@/lib/db";
import { accessRequests, confirmTokens, participants, judges } from "@/lib/db/schema";
import { eq, inArray, isNull, and } from "drizzle-orm";
import { randomBytes, randomUUID } from "crypto";

// Batch sends take several Resend calls; allow up to 60s on serverless hosts.
export const maxDuration = 60;

type RecipientType = "all" | "status" | "specific" | "specific-judges" | "judges";

interface SendEmailRequest {
    templateId: string;
    recipientType: RecipientType;
    status?: string;
    specificEmails?: string[];
}

// Templates that use per-recipient confirmation URLs
const CONFIRM_ATTENDANCE_ID = "confirm-attendance";
const JUDGE_PORTAL_LINK_ID = "judge-portal-link";

// Resend allows at most 100 emails per batch request.
const BATCH_SIZE = 100;
// Pause between batch requests to stay under Resend's per-second rate limit.
// Retries of a failed batch are handled by sendBatchWithRetry (lib/resend.ts).
const BATCH_DELAY_MS = 600;
// Time budget, measured from the start of the request, so the route returns a
// normal response before the host kills it at maxDuration:
// no new batch starts after NEW_BATCH_CUTOFF_MS, and no Resend call (including
// retries) runs past SEND_DEADLINE_MS, leaving a few seconds to respond.
const NEW_BATCH_CUTOFF_MS = (maxDuration - 15) * 1000;
const SEND_DEADLINE_MS = (maxDuration - 5) * 1000;
// Abort a single Resend call after this long without a response.
const ATTEMPT_TIMEOUT_MS = 15_000;

type RecipientVars = {
    firstName: string;
    yesUrl?: string;
    noUrl?: string;
    portalUrl?: string;
};

// The template is rendered once with these tokens, then each recipient's
// values are substituted in. Tokens are upper-case so upper-casing by the
// plain-text renderer leaves them unchanged.
const PLACEHOLDERS: Record<keyof RecipientVars, string> = {
    firstName: "__RUC_FIRSTNAME__",
    yesUrl: "__RUC_YESURL__",
    noUrl: "__RUC_NOURL__",
    portalUrl: "__RUC_PORTALURL__",
};
const PLACEHOLDER_KEYS = Object.keys(PLACEHOLDERS) as (keyof RecipientVars)[];
const PLACEHOLDER_PATTERN = new RegExp(
    Object.values(PLACEHOLDERS).join("|"),
    "g",
);
// Matches anything that looks like a placeholder, including mangled ones
const ANY_PLACEHOLDER_PATTERN = /__ruc_[a-z0-9_]*?__/gi;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function fillPlaceholders(
    content: string,
    vars: RecipientVars,
    escape: boolean,
): string {
    return content.replace(PLACEHOLDER_PATTERN, (token) => {
        const key = PLACEHOLDER_KEYS.find((k) => PLACEHOLDERS[k] === token);
        const value = (key && vars[key]) ?? "";
        return escape ? escapeHtml(value) : value;
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
    const requestStart = Date.now();
    try {
        const sessionInfo = await getSessionWithRole();

        if (!sessionInfo) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const { session, dashboardRole } = sessionInfo;

        // Block organizers from sending emails
        if (dashboardRole === "organizer") {
            return NextResponse.json(
                { error: "Forbidden - insufficient permissions" },
                { status: 403 },
            );
        }

        if (dashboardRole !== "admin") {
            const [request] = await db
                .select({ status: accessRequests.status })
                .from(accessRequests)
                .where(eq(accessRequests.userId, session.user.id))
                .limit(1);

            if (!request || request.status !== "approved") {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        const {
            templateId,
            recipientType,
            status,
            specificEmails,
        }: SendEmailRequest = await request.json();

        // Validate request
        if (!templateId) {
            return NextResponse.json(
                { error: "Template ID is required" },
                { status: 400 },
            );
        }

        if (!recipientType) {
            return NextResponse.json(
                { error: "Recipient type is required" },
                { status: 400 },
            );
        }

        if (recipientType === "status" && !status) {
            return NextResponse.json(
                { error: "Status is required when filtering by status" },
                { status: 400 },
            );
        }

        if (
            recipientType === "specific" &&
            (!specificEmails || specificEmails.length === 0)
        ) {
            return NextResponse.json(
                {
                    error: "At least one email is required for specific recipients",
                },
                { status: 400 },
            );
        }

        const resend = getResend();
        if (!resend) {
            return NextResponse.json(
                { error: "Resend configuration is missing" },
                { status: 500 },
            );
        }

        let recipients: string[] = [];
        const participantMap = new Map<string, { firstName: string; userId: string }>();

        try {
            if (recipientType === "all") {
                const allParticipants = await db
                    .select({ email: participants.email, firstName: participants.firstName, userId: participants.user_id })
                    .from(participants);
                for (const p of allParticipants) {
                    participantMap.set(p.email, { firstName: p.firstName, userId: p.userId });
                }
                recipients = allParticipants.map((p) => p.email);
            } else if (recipientType === "status") {
                const statusParticipants = await db
                    .select({ email: participants.email, firstName: participants.firstName, userId: participants.user_id })
                    .from(participants)
                    .where(eq(participants.status, status as any));
                for (const p of statusParticipants) {
                    participantMap.set(p.email, { firstName: p.firstName, userId: p.userId });
                }
                recipients = statusParticipants.map((p) => p.email);
            } else if (recipientType === "specific") {
                const knownParticipants = await db
                    .select({ email: participants.email, firstName: participants.firstName, userId: participants.user_id })
                    .from(participants)
                    .where(inArray(participants.email, specificEmails ?? []));
                for (const p of knownParticipants) {
                    participantMap.set(p.email, { firstName: p.firstName, userId: p.userId });
                }
                recipients = specificEmails || [];
            } else if (recipientType === "specific-judges") {
                const knownJudges = await db
                    .select({ email: judges.email, name: judges.name, id: judges.id })
                    .from(judges)
                    .where(inArray(judges.email, specificEmails ?? []));
                for (const j of knownJudges) {
                    participantMap.set(j.email, { firstName: j.name, userId: j.id });
                }
                recipients = specificEmails || [];

                const foundEmails = new Set(knownJudges.map((j) => j.email));
                const notFoundEmails = (specificEmails ?? []).filter(
                    (email) => !foundEmails.has(email),
                );
                if (notFoundEmails.length > 0) {
                    return NextResponse.json(
                        { error: `Judge email(s) not found: ${notFoundEmails.join(", ")}` },
                        { status: 400 },
                    );
                }
            } else if (recipientType === "judges") {
                const allJudges = await db
                    .select({ email: judges.email, name: judges.name, id: judges.id })
                    .from(judges);
                for (const j of allJudges) {
                    participantMap.set(j.email, { firstName: j.name, userId: j.id });
                }
                recipients = allJudges.map((j) => j.email);
            }
        } catch (dbError) {
            console.error("Database query error:", dbError);
            return NextResponse.json(
                { error: "Failed to fetch recipients from database" },
                { status: 500 },
            );
        }

        const seenEmails = new Set<string>();
        recipients = recipients.filter((email) => {
            const key = email.toLowerCase();
            if (seenEmails.has(key)) return false;
            seenEmails.add(key);
            return true;
        });

        if (recipients.length === 0) {
            return NextResponse.json(
                { error: "No recipients found matching the criteria" },
                { status: 400 },
            );
        }

        // Verify template exists
        const template = getTemplateById(templateId);
        if (!template) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 },
            );
        }

        // Reject templates whose required props cannot be satisfied by this route
        if (template.requiredProps && template.requiredProps.length > 0) {
            const providedProps: Record<string, unknown> = {
                firstName: true,
                ...(templateId === CONFIRM_ATTENDANCE_ID && {
                    yesConfirmationUrl: true,
                    noConfirmationUrl: true,
                }),
                ...(templateId === JUDGE_PORTAL_LINK_ID && (recipientType === "judges" || recipientType === "specific-judges") && {
                    portalUrl: true,
                }),
            };
            const unsatisfied = template.requiredProps.filter(
                (prop) => !(prop in providedProps) || !providedProps[prop],
            );
            if (unsatisfied.length > 0) {
                return NextResponse.json(
                    { error: `Template requires props that are not provided: ${unsatisfied.join(", ")}` },
                    { status: 400 },
                );
            }
        }

        // Validate email addresses
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = recipients.filter(
            (email) => !emailRegex.test(email),
        );
        if (invalidEmails.length > 0) {
            return NextResponse.json(
                {
                    error: `Invalid email addresses: ${invalidEmails.join(", ")}`,
                },
                { status: 400 },
            );
        }

        const emailSubject = template.subject;
        const isConfirmAttendance = templateId === CONFIRM_ATTENDANCE_ID;
        const isJudgePortalLink = templateId === JUDGE_PORTAL_LINK_ID;
        const baseUrl = "https://revolutionuc.com";

        // Generate short-lived confirmation tokens for confirm-attendance emails
        const tokenMap = new Map<string, string>(); // participantId → token
        if (isConfirmAttendance) {
            const participantIds = Array.from(participantMap.values())
                .map((p) => p.userId)
                .filter(Boolean);

            if (participantIds.length > 0) {
                // Invalidate existing unused tokens for these participants
                await db
                    .update(confirmTokens)
                    .set({ usedAt: new Date() })
                    .where(
                        and(
                            inArray(confirmTokens.participantId, participantIds),
                            isNull(confirmTokens.usedAt),
                        ),
                    );

                // Generate and insert new tokens
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7);

                const newTokens = Array.from(participantMap.entries()).map(
                    ([email, p]) => ({
                        token: randomBytes(32).toString("base64url"),
                        participantId: p.userId,
                        email,
                        expiresAt,
                    }),
                );

                const inserted = await db
                    .insert(confirmTokens)
                    .values(newTokens)
                    .returning({
                        token: confirmTokens.token,
                        participantId: confirmTokens.participantId,
                    });

                for (const row of inserted) {
                    tokenMap.set(row.participantId, row.token);
                }
            }
        }

        const templateProps: Record<string, string | boolean | undefined> = {
            firstName: PLACEHOLDERS.firstName,
            ...(isConfirmAttendance && {
                yesConfirmationUrl: PLACEHOLDERS.yesUrl,
                noConfirmationUrl: PLACEHOLDERS.noUrl,
            }),
            ...(isJudgePortalLink && {
                portalUrl: PLACEHOLDERS.portalUrl,
            }),
        };

        const [html, text] = await Promise.all([
            renderTemplateToHtml(templateId, templateProps),
            renderTemplateToText(templateId, templateProps),
        ]);

        if (!html || !text) {
            return NextResponse.json(
                { error: "Failed to render email template" },
                { status: 500 },
            );
        }

        const knownTokens = new Set(Object.values(PLACEHOLDERS));
        const mangledTokens = Array.from(
            new Set(
                [...html.matchAll(ANY_PLACEHOLDER_PATTERN), ...text.matchAll(ANY_PLACEHOLDER_PATTERN)]
                    .map((match) => match[0])
                    .filter((token) => !knownTokens.has(token)),
            ),
        );
        if (mangledTokens.length > 0) {
            console.error("Template rendered with altered placeholders:", {
                templateId,
                mangledTokens,
            });
            return NextResponse.json(
                { error: "Failed to personalize email template" },
                { status: 500 },
            );
        }

        const judgingPortalUrl =
            process.env.NEXT_PUBLIC_JUDGING_PORTAL_URL ||
            "https://dashboard.revolutionuc.com/judgingportal";
        const recipientVariables: Record<string, RecipientVars> = {};
        for (const email of recipients) {
            const participant = participantMap.get(email);
            const vars: RecipientVars = {
                firstName: participant?.firstName?.trim() || "Hacker",
            };
            if (isConfirmAttendance) {
                const confirmToken = participant
                    ? tokenMap.get(participant.userId)
                    : undefined;
                if (confirmToken) {
                    vars.yesUrl = `${baseUrl}/confirm?token=${confirmToken}&response=yes`;
                    vars.noUrl = `${baseUrl}/confirm?token=${confirmToken}&response=no`;
                } else {
                    vars.yesUrl = `${baseUrl}/confirm?response=yes`;
                    vars.noUrl = `${baseUrl}/confirm?response=no`;
                }
            }
            if (isJudgePortalLink) {
                vars.portalUrl = participant?.userId
                    ? `${judgingPortalUrl}/${participant.userId}`
                    : judgingPortalUrl;
            }
            recipientVariables[email] = vars;
        }

        const fromEmail = getFromAddress();
        const sendId = randomUUID();
        const results: {
            batch: number;
            count: number;
            sentCount: number;
            success: boolean;
            messageIds?: string[];
            error?: string;
        }[] = [];
        const failedRecipients: { email: string; error: string }[] = [];
        // Set when Resend returns an account-level error (quota, API key) that
        // would fail every remaining batch; those batches are skipped, not sent.
        let stopReason: string | undefined;

        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const batch = recipients.slice(i, i + BATCH_SIZE);

            const elapsedMs = Date.now() - requestStart;
            if (!stopReason && elapsedMs > NEW_BATCH_CUTOFF_MS) {
                stopReason = `server time limit reached after ${Math.round(elapsedMs / 1000)}s; re-send to the remaining addresses`;
                console.error(`Stopping bulk send before batch ${batchNumber}: ${stopReason}`);
            }

            if (stopReason) {
                const skipError = `Not sent: stopped after ${stopReason}`;
                failedRecipients.push(...batch.map((email) => ({ email, error: skipError })));
                results.push({
                    batch: batchNumber,
                    count: batch.length,
                    sentCount: 0,
                    success: false,
                    error: skipError,
                });
                continue;
            }

            const emails = batch.map((email) => {
                const vars = recipientVariables[email] ?? { firstName: "Hacker" };
                return {
                    from: fromEmail,
                    to: [email],
                    subject: emailSubject,
                    html: fillPlaceholders(html, vars, true),
                    text: fillPlaceholders(text, vars, false),
                };
            });

            const outcome = await sendBatchWithRetry(resend, emails, `${sendId}-${batchNumber}`, {
                attemptTimeoutMs: ATTEMPT_TIMEOUT_MS,
                deadline: requestStart + SEND_DEADLINE_MS,
            });

            if (outcome.ok) {
                const rejected = outcome.rejected.map((entry) => ({
                    email: batch[entry.index] ?? `(batch index ${entry.index})`,
                    error: entry.message,
                }));
                const sentCount = batch.length - rejected.length;
                if (rejected.length > 0) {
                    console.error(
                        `Batch ${batchNumber}: ${rejected.length} email(s) rejected:`,
                        rejected,
                    );
                    failedRecipients.push(...rejected);
                }
                console.log(
                    `Batch ${batchNumber} sent (${sentCount}/${batch.length} recipients)`,
                );
                results.push({
                    batch: batchNumber,
                    count: batch.length,
                    sentCount,
                    success: rejected.length === 0,
                    messageIds: outcome.messageIds,
                });
            } else {
                console.error(`Batch ${batchNumber} failed:`, outcome.error);
                failedRecipients.push(
                    ...batch.map((email) => ({ email, error: outcome.error })),
                );
                results.push({
                    batch: batchNumber,
                    count: batch.length,
                    sentCount: 0,
                    success: false,
                    error: outcome.error,
                });
                if (outcome.stop) {
                    stopReason = outcome.error;
                    console.error(`Stopping bulk send after batch ${batchNumber}: ${stopReason}`);
                }
            }

            if (!stopReason && i + BATCH_SIZE < recipients.length) {
                await sleep(BATCH_DELAY_MS);
            }
        }

        console.log("Email batch completed:", {
            templateId,
            recipientType,
            status: recipientType === "status" ? status : undefined,
            recipientCount: recipients.length,
            sentBy: "authenticated-user",
            stopReason,
            results,
        });

        const failedCount = failedRecipients.length;
        const successCount = recipients.length - failedCount;

        return NextResponse.json({
            success: failedCount === 0,
            message:
                failedCount === 0
                    ? `Sent to ${recipients.length} recipient(s)`
                    : `Sent to ${successCount} of ${recipients.length} recipient(s); ${failedCount} failed` +
                      (stopReason ? `. Stopped early: ${stopReason}` : ""),
            results,
            recipientCount: recipients.length,
            successCount,
            failedCount,
            failedRecipients,
            stopReason: stopReason ?? null,
        });
    } catch (error) {
        console.error("Error sending emails:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
