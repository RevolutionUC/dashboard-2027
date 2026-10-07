import { NextResponse } from "next/server";
import {
  requireRegistrationStaff,
  assertRegistrationOrigin,
  registrationError,
  readRegistrationJson,
} from "@/lib/api/registration-auth";
import { EVENT_ID, transaction } from "@/lib/registration/service";
import { projectWarnings, reviewProject } from "@/lib/registration/projects";
export async function GET(request: Request) {
  const access = await requireRegistrationStaff();
  if ("error" in access) return access.error;
  try {
    const page = Math.max(
      1,
      Math.floor(Number(new URL(request.url).searchParams.get("page")) || 1),
    );
    const result = await transaction(async (client) => {
      const rows = await client.query(
        "SELECT p.*,s.email AS owner_email FROM project_intakes p JOIN form_submissions s ON s.id=p.owner_id WHERE p.event_id=$1 ORDER BY p.created_at DESC LIMIT 20 OFFSET $2",
        [EVENT_ID, (Math.min(page, 10000) - 1) * 20],
      );
      const total = await client.query(
        "SELECT count(*)::int AS count FROM project_intakes WHERE event_id=$1",
        [EVENT_ID],
      );
      const projects = await client.query("SELECT id,name,url FROM projects ORDER BY name");
      for (const row of rows.rows)
        row.warnings = await projectWarnings(client, row.id, row.data, row.review);
      return { rows: rows.rows, total: total.rows[0].count, projects: projects.rows };
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return registrationError(error);
  }
}
export async function PATCH(request: Request) {
  const access = await requireRegistrationStaff();
  if ("error" in access) return access.error;
  try {
    assertRegistrationOrigin(request);
    const body = (await readRegistrationJson(request)) as { id?: string };
    return NextResponse.json(
      await reviewProject(body?.id ?? "", body, access.info.session.user.id),
    );
  } catch (error) {
    return registrationError(error);
  }
}
