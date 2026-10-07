import { pool } from "@/lib/db";
import { defaultEmailEvent } from "@/lib/templates/event-details";
export async function emailDetails() {
  const result = await pool.query("SELECT * FROM registration_events WHERE id='revuc-2027'");
  const event = result.rows[0];
  if (!event) return defaultEmailEvent;
  const date = (value: unknown) =>
    new Date(String(value)).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: event.timezone,
    });
  return {
    ...defaultEmailEvent,
    year: event.year,
    dates:
      event.starts_at && event.ends_at
        ? `${date(event.starts_at)} to ${date(event.ends_at)} (${event.timezone})`
        : defaultEmailEvent.dates,
    deadline: event.confirmation_deadline
      ? `${date(event.confirmation_deadline)} (${event.timezone})`
      : defaultEmailEvent.deadline,
    venue: event.details.venue || defaultEmailEvent.venue,
    checkInInfo: event.details.checkInInfo || defaultEmailEvent.checkInInfo,
    scheduleUrl: event.details.scheduleUrl || defaultEmailEvent.scheduleUrl,
  };
}
