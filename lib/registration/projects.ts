import type { PoolClient } from "pg";
import { EVENT_ID, transaction } from "./service";
import { RegistrationError } from "./errors";
export function rosterDifferences(actual: string[], observed: string[]) {
  const a = new Set(actual.map((v) => v.trim().toLowerCase()));
  const b = new Set(observed.map((v) => v.trim().toLowerCase()));
  return { missing: [...a].filter((v) => !b.has(v)), extra: [...b].filter((v) => !a.has(v)) };
}
export async function projectWarnings(
  client: PoolClient,
  id: string,
  data: Record<string, unknown>,
  review: Record<string, unknown> = {},
) {
  const emails = Array.isArray(data.memberEmails) ? data.memberEmails.map(String) : [];
  const participants = await client.query(
    "SELECT p.email,p.status,s.email_verified_at FROM participants p LEFT JOIN form_submissions s ON s.participant_id=p.user_id AND s.event_id=$1 WHERE lower(p.email)=ANY($2::text[])",
    [EVENT_ID, emails],
  );
  const warnings: string[] = [];
  for (const email of emails) {
    const found = participants.rows.filter((p) => p.email.toLowerCase() === email);
    if (found.length !== 1 || found[0].status !== "CHECKED_IN" || !found[0].email_verified_at)
      warnings.push(`${email}: registration, verification, or check-in needs review.`);
  }
  const other = await client.query(
    "SELECT data->>'name' AS name FROM project_intakes WHERE event_id=$1 AND id<>$2 AND (data->'memberEmails') ?| $3::text[]",
    [EVENT_ID, id, emails],
  );
  if (other.rows.length)
    warnings.push(`Team members also appear on: ${other.rows.map((p) => p.name).join(", ")}.`);
  for (const [field, actual, label] of [
    ["devpostMembers", emails, "Devpost"],
    [
      "githubMembers",
      Array.isArray(data.githubMembers) ? data.githubMembers.map(String) : [],
      "GitHub",
    ],
  ] as const) {
    if (!Array.isArray(review[field])) {
      warnings.push(`${label} roster has not been recorded by an organizer.`);
      continue;
    }
    const diff = rosterDifferences(actual, review[field].map(String));
    if (diff.missing.length || diff.extra.length)
      warnings.push(
        `${label} differs: missing ${diff.missing.join(", ") || "none"}; extra ${diff.extra.join(", ") || "none"}.`,
      );
  }
  if (!data.githubUrl)
    warnings.push(
      "No GitHub repository supplied. Check the project rules and source-code submission.",
    );
  return warnings;
}
export async function reviewProject(id: string, input: unknown, actor: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !input || typeof input !== "object" || Array.isArray(input))
    throw new RegistrationError("Invalid project review.");
  const body = input as Record<string, unknown>;
  if (
    typeof body.projectId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(body.projectId) ||
    typeof body.notes !== "string" ||
    body.notes.length > 4000
  )
    throw new RegistrationError("Choose the imported project and enter valid review notes.");
  for (const field of ["devpostMembers", "githubMembers"])
    if (
      !Array.isArray(body[field]) ||
      body[field].length > 20 ||
      body[field].some((v) => typeof v !== "string" || !v.trim() || v.length > 254)
    )
      throw new RegistrationError(
        "Enter the observed Devpost emails and GitHub usernames as lists.",
      );
  return transaction(async (client) => {
    await client.query("SELECT id FROM registration_events WHERE id=$1 FOR UPDATE", [EVENT_ID]);
    const result = await client.query(
      "SELECT * FROM project_intakes WHERE id=$1 AND event_id=$2 FOR UPDATE",
      [id, EVENT_ID],
    );
    const p = result.rows[0];
    if (!p) throw new RegistrationError("Project submission not found.", 404);
    const project = await client.query("SELECT id,url FROM projects WHERE id=$1", [body.projectId]);
    if (!project.rows.length)
      throw new RegistrationError(
        "Import the project from Devpost before completing roster review.",
      );
    const warnings = await projectWarnings(client, id, p.data, body);
    const normalize = (url: string) => {
      try {
        const value = new URL(url);
        return value.origin + value.pathname.replace(/\/$/, "");
      } catch {
        return url;
      }
    };
    if (normalize(project.rows[0].url ?? "") !== normalize(p.data.devpostUrl))
      warnings.push("The selected dashboard project's Devpost link differs from this submission.");
    if (warnings.length && !String(body.notes).trim())
      throw new RegistrationError(
        "Explain how the flagged roster differences were resolved before marking this reviewed.",
      );
    const review = { ...body, warnings, reviewedAt: new Date().toISOString() };
    await client.query(
      "UPDATE project_intakes SET project_id=$1,status='REVIEWED',review=$2,reviewed_by=$3,updated_at=now() WHERE id=$4",
      [body.projectId, JSON.stringify(review), actor, id],
    );
    await client.query(
      "INSERT INTO registration_reviews(submission_id,reviewer_id,action,details) VALUES($1,$2,'project-review',$3)",
      [p.owner_id, actor, JSON.stringify({ projectIntakeId: id, ...review })],
    );
    return { ok: true, warnings };
  });
}
