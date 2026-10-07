import { randomUUID, createHash, randomBytes } from "node:crypto";
import { RegistrationError } from "./errors";
import { EVENT_ID, transaction, queue } from "./service";
const roleOptions = [
  "Judge",
  "Mentor",
  "Other",
  "judge-mentor",
  "volunteer",
  "speaker",
  "sponsor-representative",
];
export function validateSettings(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new RegistrationError("Invalid event settings.");
  const body = input as Record<string, unknown>;
  const capacity = body.capacity === null || body.capacity === "" ? null : Number(body.capacity);
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000))
    throw new RegistrationError("Capacity must be a positive whole number.");
  const date = (key: string) => {
    const value = body[key];
    if (!value) return null;
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
      throw new RegistrationError(`Invalid ${key}.`);
    return new Date(value).toISOString();
  };
  const startsAt = date("startsAt"),
    endsAt = date("endsAt"),
    confirmationDeadline = date("confirmationDeadline");
  if (startsAt && endsAt && startsAt >= endsAt)
    throw new RegistrationError("The event must end after it starts.");
  if (confirmationDeadline && endsAt && confirmationDeadline > endsAt)
    throw new RegistrationError("The confirmation deadline must be before the event ends.");
  if (typeof body.registrationOpen !== "boolean")
    throw new RegistrationError("Choose whether registration is open.");
  if (body.registrationOpen && (!capacity || !startsAt || !endsAt || !confirmationDeadline))
    throw new RegistrationError(
      "Set the dates, capacity, and confirmation deadline before opening registration.",
    );
  if (typeof body.timezone !== "string") throw new RegistrationError("Timezone is required.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: body.timezone });
  } catch {
    throw new RegistrationError("Enter a valid timezone, such as America/New_York.");
  }
  if (!Array.isArray(body.slots) || body.slots.length > 100)
    throw new RegistrationError("Availability slots must be an array of up to 100 entries.");
  const ids = new Set<string>();
  for (const slot of body.slots) {
    if (
      !slot ||
      typeof slot.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(slot.id) ||
      ids.has(slot.id) ||
      typeof slot.label !== "string" ||
      !slot.label.trim() ||
      slot.label.length > 300 ||
      !Array.isArray(slot.roles) ||
      !slot.roles.length ||
      slot.roles.some((r: unknown) => typeof r !== "string" || !roleOptions.includes(r))
    )
      throw new RegistrationError(
        "Each slot needs a unique ID, a dated time label, and valid roles.",
      );
    ids.add(slot.id);
  }
  if (!body.details || typeof body.details !== "object" || Array.isArray(body.details))
    throw new RegistrationError("Invalid event details.");
  const details = body.details as Record<string, unknown>;
  for (const key of Object.keys(details)) {
    if (
      [
        "emergencyContact",
        "travelQuestions",
        "projectSubmissionOpen",
        "mlhPartnerConfirmed",
      ].includes(key)
    ) {
      if (typeof details[key] !== "boolean") throw new RegistrationError(`Invalid ${key}.`);
    } else if (key === "maxTeamSize") {
      if (!Number.isInteger(details[key]) || Number(details[key]) < 1 || Number(details[key]) > 20)
        throw new RegistrationError("Team size must be a whole number between 1 and 20.");
    } else if (key === "shirtSizes") {
      if (
        !Array.isArray(details[key]) ||
        (details[key] as unknown[]).some(
          (v) => !["XS", "S", "M", "L", "XL", "2XL", "3XL", "No shirt"].includes(String(v)),
        )
      )
        throw new RegistrationError("Choose valid shirt sizes.");
    } else if (
      ![
        "accessibilityContact",
        "waiverUrl",
        "mediaNotice",
        "expensePolicy",
        "privacyNotice",
        "retentionNotice",
        "checkInInfo",
        "venue",
        "scheduleUrl",
        "projectRules",
      ].includes(key) ||
      typeof details[key] !== "string" ||
      (details[key] as string).length > 4000
    )
      throw new RegistrationError(`Invalid setting: ${key}.`);
  }
  for (const key of ["waiverUrl", "scheduleUrl"])
    if (details[key]) {
      try {
        const url = new URL(String(details[key]));
        if (url.protocol !== "https:" || url.username || url.password) throw new Error();
      } catch {
        throw new RegistrationError(`${key} must be a full HTTPS link.`);
      }
    }
  if (
    details.projectSubmissionOpen &&
    (!details.maxTeamSize || !String(details.projectRules ?? "").trim())
  )
    throw new RegistrationError(
      "Set the approved project rules and team size before opening project submissions.",
    );
  return {
    registrationOpen: body.registrationOpen,
    capacity,
    startsAt,
    endsAt,
    confirmationDeadline,
    timezone: body.timezone,
    slots: body.slots,
    details,
  };
}
export async function saveSettings(input: unknown, actor: string) {
  const settings = validateSettings(input);
  return transaction(async (client) => {
    const previous = await client.query(
      "SELECT * FROM registration_events WHERE id=$1 FOR UPDATE",
      [EVENT_ID],
    );
    if (!previous.rows.length) throw new RegistrationError("2027 event settings are missing.");
    const used = await client.query(
      "SELECT (SELECT count(*) FROM participants WHERE status IN ('CONFIRMED','CHECKED_IN')) + (SELECT count(*) FROM form_submissions WHERE event_id=$1 AND status='REGISTERED' AND offer_expires_at>now()) AS count",
      [EVENT_ID],
    );
    if (settings.capacity !== null && settings.capacity < Number(used.rows[0].count))
      throw new RegistrationError(
        "Capacity cannot be lower than confirmed attendance and reserved offers.",
        409,
      );
    // Removing a selected slot would silently lose applicants' availability.
    const selected = await client.query(
      "SELECT DISTINCT jsonb_array_elements_text(COALESCE(data->'availabilitySlots','[]'::jsonb)) AS id FROM form_submissions WHERE event_id=$1 AND status NOT IN ('WITHDRAWN','DECLINED')",
      [EVENT_ID],
    );
    if (selected.rows.some((row) => !settings.slots.some((slot) => slot.id === row.id)))
      throw new RegistrationError(
        "An active applicant selected a slot you removed. Keep its ID and update its label, or coordinate changes first.",
        409,
      );
    await client.query(
      "UPDATE registration_events SET registration_open=$2,capacity=$3,starts_at=$4,ends_at=$5,confirmation_deadline=$6,timezone=$7,slots=$8,details=$9 WHERE id=$1",
      [
        EVENT_ID,
        settings.registrationOpen,
        settings.capacity,
        settings.startsAt,
        settings.endsAt,
        settings.confirmationDeadline,
        settings.timezone,
        JSON.stringify(settings.slots),
        JSON.stringify(settings.details),
      ],
    );
    if (settings.registrationOpen && !previous.rows[0].registration_open) {
      if (!process.env.WEBSITE_URL)
        throw new RegistrationError("Configure WEBSITE_URL before opening registration.");
      const website = new URL(process.env.WEBSITE_URL);
      if (
        !["http:", "https:"].includes(website.protocol) ||
        website.username ||
        website.password ||
        (process.env.NODE_ENV === "production" && website.protocol !== "https:")
      )
        throw new RegistrationError("WEBSITE_URL must be the public HTTPS website origin.");
      const candidates = await client.query(
        "SELECT id FROM form_submissions i WHERE i.event_id=$1 AND i.kind='interest' AND i.email_verified_at IS NOT NULL AND i.status<>'WITHDRAWN' AND NOT EXISTS(SELECT 1 FROM form_submissions h WHERE h.event_id=i.event_id AND h.kind='hacker' AND h.email=i.email) AND NOT EXISTS(SELECT 1 FROM form_notifications n WHERE n.submission_id=i.id AND n.type='interest-open')",
        [EVENT_ID],
      );
      for (const row of candidates.rows) {
        const token = randomBytes(32).toString("base64url");
        await client.query(
          "INSERT INTO form_tokens(submission_id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 days')",
          [row.id, createHash("sha256").update(token).digest("hex")],
        );
        await queue(client, row.id, "interest-open", {
          link: `${website.origin}/register#interest=${token}`,
        });
      }
    }
    await client.query(
      "INSERT INTO audit_log(id,user_id,name,email,action,details) SELECT $1,id,name,email,'UPDATE_EVENT',$3::json FROM \"user\" WHERE id=$2",
      [randomUUID(), actor, JSON.stringify({ eventId: EVENT_ID, ...settings })],
    );
    return { ok: true };
  });
}
