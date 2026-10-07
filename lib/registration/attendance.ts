import type { PoolClient } from "pg";
import { RegistrationError } from "./errors";
import { EVENT_ID, transaction, link, queue } from "./service";
import { isParticipantStatus } from "@/lib/participant-status";
async function promote(client: PoolClient, event: Record<string, unknown>) {
  if (
    !event.capacity ||
    (event.confirmation_deadline && new Date(String(event.confirmation_deadline)) < new Date())
  )
    return;
  const count = await client.query(
    "SELECT (SELECT count(*) FROM participants WHERE status IN ('CONFIRMED','CHECKED_IN'))+(SELECT count(*) FROM form_submissions WHERE event_id=$1 AND status='REGISTERED' AND offer_expires_at>now()) AS count",
    [EVENT_ID],
  );
  if (Number(count.rows[0].count) >= Number(event.capacity)) return;
  const result = await client.query(
    "SELECT s.id,s.participant_id FROM form_submissions s JOIN participants p ON p.user_id=s.participant_id WHERE s.event_id=$1 AND s.status='WAITLISTED' AND p.status='WAITLISTED' AND s.email_verified_at IS NOT NULL ORDER BY s.updated_at,s.created_at LIMIT 1 FOR UPDATE OF s,p",
    [EVENT_ID],
  );
  if (!result.rows.length) return;
  const next = result.rows[0];
  await client.query(
    "UPDATE form_submissions SET status='REGISTERED',offer_expires_at=LEAST(now()+interval '24 hours',COALESCE($2::timestamptz,now()+interval '24 hours')),updated_at=now() WHERE id=$1",
    [next.id, event.confirmation_deadline],
  );
  await client.query(
    "UPDATE participants SET status='REGISTERED',updated_at=now() WHERE user_id=$1",
    [next.participant_id],
  );
  await queue(client, next.id, "waitlist-offer", { link: await link(client, next.id) });
}
export async function setAttendance(id: string, status: string, checkInOnly = false) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !isParticipantStatus(status))
    throw new RegistrationError("Invalid participant or status.");
  return transaction(async (client) => {
    const settings = await client.query(
      "SELECT * FROM registration_events WHERE id=$1 FOR UPDATE",
      [EVENT_ID],
    );
    if (!settings.rows[0]) throw new RegistrationError("2027 event settings are missing.");
    const application = await client.query(
      "SELECT * FROM form_submissions WHERE participant_id=$1 AND event_id=$2 FOR UPDATE",
      [id, EVENT_ID],
    );
    const result = await client.query("SELECT * FROM participants WHERE user_id=$1 FOR UPDATE", [
      id,
    ]);
    const p = result.rows[0];
    if (!p) throw new RegistrationError("Participant not found.", 404);
    if (checkInOnly && p.status !== "CONFIRMED")
      throw new RegistrationError(
        p.status === "CHECKED_IN"
          ? "Already checked in."
          : "Confirm attendance before checking this participant in.",
        409,
      );
    if (application.rows[0] && !application.rows[0].email_verified_at)
      throw new RegistrationError(
        "Email verification is required before changing attendance.",
        409,
      );
    if (
      ["CONFIRMED", "CHECKED_IN"].includes(status) &&
      !["CONFIRMED", "CHECKED_IN"].includes(p.status)
    ) {
      const used = await client.query(
        "SELECT (SELECT count(*) FROM participants WHERE status IN ('CONFIRMED','CHECKED_IN'))+(SELECT count(*) FROM form_submissions WHERE event_id=$1 AND status='REGISTERED' AND offer_expires_at>now() AND participant_id<>$2) AS count",
        [EVENT_ID, id],
      );
      if (!settings.rows[0].capacity || Number(used.rows[0].count) >= settings.rows[0].capacity)
        throw new RegistrationError("There are no unreserved attendance places.", 409);
    }
    await client.query(
      "UPDATE participants SET status=$2,checked_in=$3,updated_at=now() WHERE user_id=$1",
      [id, status, status === "CHECKED_IN"],
    );
    await client.query(
      "UPDATE form_submissions SET status=$2,offer_expires_at=NULL,updated_at=now() WHERE participant_id=$1 AND event_id=$3",
      [id, status, EVENT_ID],
    );
    if (application.rows[0] && status !== p.status && status !== "CHECKED_IN")
      await queue(client, application.rows[0].id, "attendance", { status });
    const releasedReservation = application.rows[0]?.offer_expires_at && p.status === "REGISTERED";
    if (
      status !== p.status &&
      (["CONFIRMED", "CHECKED_IN"].includes(p.status) || releasedReservation) &&
      !["CONFIRMED", "CHECKED_IN"].includes(status)
    )
      await promote(client, settings.rows[0]);
    return { previousStatus: p.status, firstName: p.first_name, lastName: p.last_name };
  });
}
