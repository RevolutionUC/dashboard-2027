import { NextRequest, NextResponse } from "next/server";
import { getAccessInfo } from "@/lib/auth";
import {
    getTemplateById,
    renderTemplateToHtml,
    renderTemplateToText,
} from "@/lib/templates";
import formData from "form-data";
import Mailgun from "mailgun.js";
import { chunk, db, fetchAll, must, now } from "@/lib/db";
import type { Enums } from "@/lib/db/types";
import { randomBytes } from "crypto";

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

export async function POST(request: NextRequest) {
    try {
        const sessionInfo = await getAccessInfo();

        if (!sessionInfo) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const { dashboardRole } = sessionInfo;

        // Block organizers from sending emails
        if (dashboardRole === "organizer") {
            return NextResponse.json(
                { error: "Forbidden - insufficient permissions" },
                { status: 403 },
            );
        }

        if (!sessionInfo.isApproved) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

        if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
            return NextResponse.json(
                { error: "Mailgun configuration is missing" },
                { status: 500 },
            );
        }

        // Fetch recipients and build personalization map (email → {firstName, userId})
        let recipients: string[] = [];
        const participantMap = new Map<string, { firstName: string; userId: string }>();

        try {
            const PARTICIPANT_RECIPIENT_COLUMNS = "email,firstName:first_name,userId:user_id";
            const JUDGE_RECIPIENT_COLUMNS = "email,name,id";

            if (recipientType === "all") {
                const allParticipants = await fetchAll(() =>
                    db.from("participants").select(PARTICIPANT_RECIPIENT_COLUMNS).order("user_id"),
                );
                for (const p of allParticipants) {
                    participantMap.set(p.email, { firstName: p.firstName, userId: p.userId });
                }
                recipients = allParticipants.map((p) => p.email);
            } else if (recipientType === "status") {
                const statusParticipants = await fetchAll(() =>
                    db
                        .from("participants")
                        .select(PARTICIPANT_RECIPIENT_COLUMNS)
                        .eq("status", status as Enums<"participant_status">)
                        .order("user_id"),
                );
                for (const p of statusParticipants) {
                    participantMap.set(p.email, { firstName: p.firstName, userId: p.userId });
                }
                recipients = statusParticipants.map((p) => p.email);
            } else if (recipientType === "specific") {
                const knownParticipants = (
                    await Promise.all(
                        chunk(specificEmails ?? []).map(async (emails) =>
                            must(await db.from("participants").select(PARTICIPANT_RECIPIENT_COLUMNS).in("email", emails)),
                        ),
                    )
                ).flat();
                for (const p of knownParticipants) {
                    participantMap.set(p.email, { firstName: p.firstName, userId: p.userId });
                }
                recipients = specificEmails || [];
            } else if (recipientType === "specific-judges") {
                const knownJudges = (
                    await Promise.all(
                        chunk(specificEmails ?? []).map(async (emails) =>
                            must(await db.from("judges").select(JUDGE_RECIPIENT_COLUMNS).in("email", emails)),
                        ),
                    )
                ).flat();
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
                const allJudges = await fetchAll(() =>
                    db.from("judges").select(JUDGE_RECIPIENT_COLUMNS).order("id"),
                );
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
                const usedAt = now();
                for (const ids of chunk(participantIds)) {
                    must(
                        await db
                            .from("confirm_tokens")
                            .update({ used_at: usedAt })
                            .in("participant_id", ids)
                            .is("used_at", null),
                    );
                }

                // Generate and insert new tokens
                const expiresAtDate = new Date();
                expiresAtDate.setDate(expiresAtDate.getDate() + 7);
                const expiresAt = expiresAtDate.toISOString();

                const newTokens = Array.from(participantMap.entries()).map(
                    ([email, p]) => ({
                        token: randomBytes(32).toString("base64url"),
                        participant_id: p.userId,
                        email,
                        expires_at: expiresAt,
                    }),
                );

                const inserted = (
                    await Promise.all(
                        chunk(newTokens, 500).map(async (rows) =>
                            must(
                                await db
                                    .from("confirm_tokens")
                                    .insert(rows)
                                    .select("token,participantId:participant_id"),
                            ),
                        ),
                    )
                ).flat();

                for (const row of inserted) {
                    tokenMap.set(row.participantId, row.token);
                }
            }
        }

        // Render template once with Mailgun recipient-variable placeholders.
        // Mailgun substitutes %recipient.X% per delivery, so each recipient
        // sees their own personalized content with a single render + API call.
        const templateProps: Record<string, string | boolean | undefined> = {
            firstName: "%recipient.firstName%",
            ...(isConfirmAttendance && {
                yesConfirmationUrl: "%recipient.yesUrl%",
                noConfirmationUrl: "%recipient.noUrl%",
            }),
            ...(isJudgePortalLink && {
                portalUrl: "%recipient.portalUrl%",
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

        // Build per-recipient variable map for Mailgun substitution
        const recipientVariables: Record<string, Record<string, string>> = {};
        for (const email of recipients) {
            const participant = participantMap.get(email);
            const vars: Record<string, string> = {
                firstName: participant?.firstName ?? "Hacker",
            };
            if (isConfirmAttendance && participant) {
                const confirmToken = tokenMap.get(participant.userId);
                if (confirmToken) {
                    vars.yesUrl = `${baseUrl}/confirm?token=${confirmToken}&response=yes`;
                    vars.noUrl = `${baseUrl}/confirm?token=${confirmToken}&response=no`;
                } else {
                    // Fallback if token generation failed for this participant
                    vars.yesUrl = `${baseUrl}/confirm?response=yes`;
                    vars.noUrl = `${baseUrl}/confirm?response=no`;
                }
            }
            if (isJudgePortalLink && participant?.userId) {
                const judgingPortalUrl = process.env.NEXT_PUBLIC_JUDGING_PORTAL_URL || "https://dashboard.revolutionuc.com/judgingportal";
                vars.portalUrl = `${judgingPortalUrl}/${participant.userId}`;
            }
            recipientVariables[email] = vars;
        }

        // Initialize Mailgun
        const mailgun = new Mailgun(formData);
        const mg = mailgun.client({
            username: "api",
            key: process.env.MAILGUN_API_KEY,
        });

        const mailgunDomain = process.env.MAILGUN_DOMAIN;
        const fromEmail =
            process.env.MAILGUN_FROM_EMAIL || "info@revolutionuc.com";

        // Send in batches of 1000 (Mailgun's limit)
        const BATCH_SIZE = 1000;
        const results = [];

        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            const batch = recipients.slice(i, i + BATCH_SIZE);
            const batchVars = Object.fromEntries(
                batch.map((email) => [
                    email,
                    recipientVariables[email] ?? { firstName: "Hacker" },
                ]),
            );

            try {
                const response = await mg.messages.create(mailgunDomain, {
                    from: fromEmail,
                    to: batch,
                    subject: emailSubject,
                    html: html,
                    text: text,
                    "recipient-variables": JSON.stringify(batchVars),
                });

                console.log(
                    `Batch ${Math.floor(i / BATCH_SIZE) + 1} sent (${batch.length} recipients):`,
                    response.id,
                );
                results.push({
                    batch: Math.floor(i / BATCH_SIZE) + 1,
                    count: batch.length,
                    success: true,
                    messageId: response.id,
                });
            } catch (error) {
                console.error(
                    `Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`,
                    error,
                );
                results.push({
                    batch: Math.floor(i / BATCH_SIZE) + 1,
                    count: batch.length,
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
                });
            }
        }

        console.log("Email batch completed:", {
            templateId,
            recipientType,
            status: recipientType === "status" ? status : undefined,
            recipientCount: recipients.length,
            sentBy: "authenticated-user",
            results,
        });

        const successCount = results.filter((r) => r.success).length;
        const failedCount = results.length - successCount;

        return NextResponse.json({
            success: failedCount === 0,
            message: `Sent to ${recipients.length} recipient(s)`,
            results,
            recipientCount: recipients.length,
            successCount,
            failedCount,
        });
    } catch (error) {
        console.error("Error sending emails:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
