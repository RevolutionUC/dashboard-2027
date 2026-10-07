import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { RegistrationError } from "./errors";
export const EVENT_ID = "revuc-2027";
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function queue(
  client: PoolClient,
  id: string,
  type: string,
  payload: Record<string, unknown> = {},
) {
  await client.query(
    "INSERT INTO form_notifications (submission_id,type,payload) VALUES ($1,$2,$3)",
    [id, type, JSON.stringify(payload)],
  );
}
export async function link(client: PoolClient, id: string) {
  if (!process.env.WEBSITE_URL)
    throw new RegistrationError("Configure WEBSITE_URL before sending application links.", 503);
  const origin = new URL(process.env.WEBSITE_URL).origin;
  if (process.env.NODE_ENV === "production" && !origin.startsWith("https://"))
    throw new RegistrationError("WEBSITE_URL must use HTTPS.");
  const token = randomBytes(32).toString("base64url");
  await client.query(
    "INSERT INTO form_tokens (submission_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '30 days')",
    [id, createHash("sha256").update(token).digest("hex")],
  );
  return `${origin}/registration#token=${token}`;
}
export type ReviewAction = {
  action:
    | "approve"
    | "decline"
    | "assign"
    | "check-in-role"
    | "notes"
    | "link-participant"
    | "remind"
    | "offer"
    | "retry-email";
  categoryId?: string;
  sponsorId?: string;
  assignment?: string;
  notes?: string;
  followUpAt?: string | null;
};
export async function review(id: string, body: ReviewAction, reviewer: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new RegistrationError("Invalid application.");
  return transaction(async (client) => {
    const event = await client.query("SELECT * FROM registration_events WHERE id=$1 FOR UPDATE", [
      EVENT_ID,
    ]);
    if (!event.rows[0]) throw new RegistrationError("2027 registration configuration is missing.");
    const result = await client.query(
      "SELECT * FROM form_submissions WHERE id=$1 AND event_id=$2 FOR UPDATE",
      [id, EVENT_ID],
    );
    const s = result.rows[0];
    if (!s) throw new RegistrationError("Application not found.", 404);
    if (body.action === "notes") {
      await client.query(
        "UPDATE form_submissions SET internal_notes=$1,assignment=$2,follow_up_at=$3,reviewed_by=$4,updated_at=now() WHERE id=$5",
        [body.notes ?? null, body.assignment ?? null, body.followUpAt ?? null, reviewer, id],
      );
    } else if (body.action === "link-participant") {
      if (s.kind !== "hacker" || s.participant_id)
        throw new RegistrationError("Only unlinked hacker applications can be linked.");
      const participant = await client.query(
        "SELECT user_id,status FROM participants WHERE lower(email)=$1 FOR UPDATE",
        [s.email],
      );
      if (participant.rows.length !== 1)
        throw new RegistrationError(
          "There must be exactly one existing participant with the same email.",
        );
      const linked = await client.query("SELECT id FROM form_submissions WHERE participant_id=$1", [
        participant.rows[0].user_id,
      ]);
      if (linked.rows.length)
        throw new RegistrationError("This participant is already linked to an application.");
      await client.query(
        "UPDATE form_submissions SET participant_id=$1,status=$2,reviewed_by=$3,reviewed_at=now(),updated_at=now() WHERE id=$4",
        [participant.rows[0].user_id, participant.rows[0].status, reviewer, id],
      );
    } else if (body.action === "retry-email") {
      await client.query(
        "UPDATE form_notifications SET state='pending',attempts=0,available_at=now(),last_error=NULL WHERE submission_id=$1 AND state='failed'",
        [id],
      );
    } else {
      if (!s.email_verified_at)
        throw new RegistrationError("The applicant needs to verify their email first.", 409);
      if (body.action === "check-in-role") {
        if (["hacker", "interest"].includes(s.kind) || !["APPROVED", "ASSIGNED"].includes(s.status))
          throw new RegistrationError("Only approved role applicants can be checked in.");
        await client.query(
          "UPDATE form_submissions SET checked_in_at=COALESCE(checked_in_at,now()),updated_at=now() WHERE id=$1",
          [id],
        );
        if (s.judge_id)
          await client.query("UPDATE judges SET is_checkedin=true,updated_at=now() WHERE id=$1", [
            s.judge_id,
          ]);
      } else if (body.action === "remind") {
        if (["WITHDRAWN", "DECLINED", "CHECKED_IN"].includes(s.status))
          throw new RegistrationError("This application should not receive a reminder.");
        const recent = await client.query(
          "SELECT id FROM form_notifications WHERE submission_id=$1 AND type='reminder' AND created_at>now()-interval '24 hours'",
          [id],
        );
        if (recent.rows.length)
          throw new RegistrationError("A reminder was already queued within the last day.");
        await queue(client, id, "reminder", { link: await link(client, id) });
      } else if (body.action === "offer") {
        if (s.kind !== "hacker" || s.status !== "WAITLISTED" || !s.participant_id)
          throw new RegistrationError("Only a waitlisted hacker can receive a place offer.");
        const settings = event.rows[0];
        if (
          !settings.capacity ||
          (settings.confirmation_deadline && new Date(settings.confirmation_deadline) < new Date())
        )
          throw new RegistrationError("Attendance offers are not open.");
        const used = await client.query(
          "SELECT count(*)::int AS count FROM participants WHERE status IN ('CONFIRMED','CHECKED_IN')",
        );
        const held = await client.query(
          "SELECT count(*)::int AS count FROM form_submissions WHERE event_id=$1 AND status='REGISTERED' AND offer_expires_at>now()",
          [EVENT_ID],
        );
        if (used.rows[0].count + held.rows[0].count >= settings.capacity)
          throw new RegistrationError("There are no unreserved places available.", 409);
        await client.query(
          "UPDATE form_submissions SET status='REGISTERED',offer_expires_at=LEAST(now()+interval '24 hours',COALESCE($2::timestamptz,now()+interval '24 hours')),updated_at=now() WHERE id=$1",
          [id, settings.confirmation_deadline],
        );
        await client.query(
          "UPDATE participants SET status='REGISTERED',updated_at=now() WHERE user_id=$1",
          [s.participant_id],
        );
        await queue(client, id, "waitlist-offer", { link: await link(client, id) });
      } else {
        if (["hacker", "interest"].includes(s.kind))
          throw new RegistrationError("Use attendance controls for hacker registrations.");
        if (["WITHDRAWN", "DECLINED"].includes(s.status) && body.action !== "approve")
          throw new RegistrationError("Reopen this application before assigning it.");
        if (
          body.action === "approve" &&
          s.kind === "judge-mentor" &&
          Array.isArray(s.data.roles) &&
          s.data.roles.includes("Judge")
        ) {
          if (!body.categoryId)
            throw new RegistrationError("Choose a judging category before approving a judge.");
          const category = await client.query("SELECT id FROM categories WHERE id=$1", [
            body.categoryId,
          ]);
          if (!category.rows.length) throw new RegistrationError("Unknown judging category.");
          const judge = await client.query(
            "INSERT INTO judges (name,email,category_id) VALUES ($1,$2,$3) ON CONFLICT(email) DO UPDATE SET category_id=excluded.category_id,updated_at=now() RETURNING id",
            [s.data.fullName, s.email, body.categoryId],
          );
          await client.query("UPDATE form_submissions SET judge_id=$1 WHERE id=$2", [
            judge.rows[0].id,
            id,
          ]);
        }
        if (body.action === "approve" && s.kind === "sponsor-representative") {
          if (!body.sponsorId || s.data.resumeUseAgreement !== true)
            throw new RegistrationError(
              "Choose an approved sponsor company and require the resume-use agreement.",
            );
          const company = await client.query(
            "SELECT id FROM form_submissions WHERE id=$1 AND event_id=$2 AND kind='sponsor' AND status='APPROVED' AND email_verified_at IS NOT NULL",
            [body.sponsorId, EVENT_ID],
          );
          if (!company.rows.length)
            throw new RegistrationError("Choose an approved sponsor company.");
          await client.query("UPDATE form_submissions SET sponsor_id=$1 WHERE id=$2", [
            body.sponsorId,
            id,
          ]);
        }
        if (body.action === "assign" && !["APPROVED", "ASSIGNED"].includes(s.status))
          throw new RegistrationError("Approve the application before assigning it.");
        if (body.action === "assign" && !body.assignment?.trim())
          throw new RegistrationError("Enter an assignment first.");
        await client.query(
          "UPDATE form_submissions SET status=$1,assignment=COALESCE($2,assignment),reviewed_by=$3,reviewed_at=now(),updated_at=now() WHERE id=$4",
          [
            body.action === "approve"
              ? "APPROVED"
              : body.action === "assign"
                ? s.kind === "sponsor" || s.kind === "sponsor-representative"
                  ? "APPROVED"
                  : "ASSIGNED"
                : "DECLINED",
            body.assignment ?? null,
            reviewer,
            id,
          ],
        );
        await queue(client, id, "management-link", { link: await link(client, id) });
      }
    }
    // Every review change gets its own private audit entry, including the actor and action.
    await client.query(
      "INSERT INTO registration_reviews (id,submission_id,reviewer_id,action,details) VALUES ($1,$2,$3,$4,$5)",
      [randomUUID(), id, reviewer, body.action, JSON.stringify(body)],
    );
    return { ok: true };
  });
}
export function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
