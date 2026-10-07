import {
  requireRegistrationStaff,
  RegistrationError,
  registrationError,
} from "@/lib/api/registration-auth";
import { pool } from "@/lib/db";
import { EVENT_ID, csvCell } from "@/lib/registration/service";
export async function GET(request: Request) {
  const access = await requireRegistrationStaff();
  if ("error" in access) return access.error;
  try {
    const mode = new URL(request.url).searchParams.get("mode") ?? "mlh";
    if (!["mlh", "logistics", "roles"].includes(mode))
      throw new RegistrationError("Unknown export.");
    if (mode === "mlh") {
      const event = await pool.query("SELECT details FROM registration_events WHERE id=$1", [
        EVENT_ID,
      ]);
      if (event.rows[0]?.details.mlhPartnerConfirmed !== true)
        throw new RegistrationError(
          "Confirm the MLH partnership in event settings before exporting data for MLH.",
          409,
        );
    }
    const result = await pool.query(
      `SELECT s.*,p.status AS participant_status,p.checked_in FROM form_submissions s LEFT JOIN participants p ON p.user_id=s.participant_id WHERE s.event_id=$1 AND s.email_verified_at IS NOT NULL AND s.status NOT IN ('DECLINED','WITHDRAWN') ORDER BY s.kind,s.created_at`,
      [EVENT_ID],
    );
    const rows = result.rows.filter(
      (row) => mode !== "mlh" || (row.kind === "hacker" && row.data.mlhSharing === true),
    );
    const headers =
      mode === "mlh"
        ? [
            "first_name",
            "last_name",
            "age",
            "email",
            "school",
            "phone",
            "country",
            "level_of_study",
            "mlh_coc",
            "mlh_sharing",
            "mlh_emails",
            "attended",
          ]
        : mode === "logistics"
          ? [
              "id",
              "kind",
              "name",
              "email",
              "status",
              "diet",
              "food_allergies",
              "accessibility_needs",
              "shirt_size",
            ]
          : [
              "id",
              "kind",
              "name",
              "email",
              "status",
              "roles",
              "expertise",
              "available_slots",
              "availability_notes",
              "conflicts",
              "assignment",
              "follow_up_at",
            ];
    const values = rows.map((s) => {
      const d = s.data;
      return mode === "mlh"
        ? [
            d.firstName,
            d.lastName,
            d.age,
            s.email,
            d.school,
            d.phone,
            d.country,
            d.levelOfStudy,
            d.mlhCoc,
            d.mlhSharing,
            d.mlhEmails,
            Boolean(s.checked_in),
          ]
        : mode === "logistics"
          ? [
              s.id,
              s.kind,
              d.fullName ?? d.contactName ?? `${d.firstName ?? ""} ${d.lastName ?? ""}`,
              s.email,
              s.participant_status ?? s.status,
              d.dietRestrictions,
              d.foodAllergies,
              d.accessibilityNeeds,
              d.shirtSize,
            ]
          : [
              s.id,
              s.kind,
              d.fullName ?? d.contactName ?? `${d.firstName ?? ""} ${d.lastName ?? ""}`,
              s.email,
              s.status,
              d.roles,
              d.expertiseAreas,
              d.availabilitySlots,
              d.availabilityNotes,
              d.conflicts,
              s.assignment,
              s.follow_up_at,
            ];
    });
    return new Response(
      [headers, ...values].map((row) => row.map(csvCell).join(",")).join("\r\n"),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="revuc-2027-${mode}.csv"`,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return registrationError(error);
  }
}
