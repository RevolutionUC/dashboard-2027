import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRegistrationStaff, registrationError } from "@/lib/api/registration-auth";
import { EVENT_ID } from "@/lib/registration/service";
export async function GET(request: Request) {
  const access = await requireRegistrationStaff();
  if ("error" in access) return access.error;
  try {
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") ?? "";
    const status = url.searchParams.get("status") ?? "";
    const page = Math.max(1, Math.min(10000, Number(url.searchParams.get("page")) || 1));
    const [rows, count, event, categories, sponsors, notifications, summary] = await Promise.all([
      pool.query(
        "SELECT id,kind,email,data,status,email_verified_at,participant_id,judge_id,sponsor_id,resume_path IS NOT NULL AS has_resume,assignment,internal_notes,follow_up_at,checked_in_at,reviewed_by,reviewed_at,created_at FROM form_submissions WHERE event_id=$1 AND ($2='' OR kind=$2) AND ($3='' OR status=$3) ORDER BY created_at DESC LIMIT 20 OFFSET $4",
        [EVENT_ID, kind, status, (Math.floor(page) - 1) * 20],
      ),
      pool.query(
        "SELECT count(*)::int AS count FROM form_submissions WHERE event_id=$1 AND ($2='' OR kind=$2) AND ($3='' OR status=$3)",
        [EVENT_ID, kind, status],
      ),
      pool.query("SELECT * FROM registration_events WHERE id=$1", [EVENT_ID]),
      pool.query("SELECT id,name FROM categories ORDER BY name"),
      pool.query(
        "SELECT id,data->>'organisation' AS name FROM form_submissions WHERE event_id=$1 AND kind='sponsor' AND status='APPROVED'",
        [EVENT_ID],
      ),
      pool.query(
        "SELECT state,count(*)::int AS count FROM form_notifications n JOIN form_submissions s ON s.id=n.submission_id WHERE s.event_id=$1 GROUP BY state",
        [EVENT_ID],
      ),
      pool.query(
        "SELECT kind,status,count(*)::int AS count FROM form_submissions WHERE event_id=$1 GROUP BY kind,status ORDER BY kind,status",
        [EVENT_ID],
      ),
    ]);
    return NextResponse.json(
      {
        rows: rows.rows,
        total: count.rows[0].count,
        event: event.rows[0],
        categories: categories.rows,
        sponsors: sponsors.rows,
        notifications: notifications.rows,
        summary: summary.rows,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return registrationError(error);
  }
}
