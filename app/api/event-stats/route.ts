import { NextResponse } from "next/server";
import { db, fetchAll, must } from "@/lib/db";
import { requireAuthenticatedSession } from "@/lib/api/session-auth";

type ParticipantSummary = { id: string; first_name: string; last_name: string; email: string };

async function getEventsAndRegistrations(eventType: "WORKSHOP" | "FOOD") {
  const eventsOfType = must(
    await db.from("events").select("id,name,eventType:event_type").eq("event_type", eventType),
  );

  // Inner-join on events instead of a long `.in()` list of event IDs.
  const rows = await fetchAll(() =>
    db
      .from("event_registrations")
      .select(
        "id,participant_id,event_id,registered_at,event:events!inner(event_type),participant:participants(id:user_id,first_name,last_name,email)",
      )
      .eq("event.event_type", eventType)
      .order("id"),
  );

  return { eventsOfType, rows };
}

export async function GET() {
  const auth = await requireAuthenticatedSession();
  if (auth.error) {
    return auth.error;
  }

  try {
    const [workshop, food] = await Promise.all([
      getEventsAndRegistrations("WORKSHOP"),
      getEventsAndRegistrations("FOOD"),
    ]);

    const participantMap: Record<string, ParticipantSummary> = {};
    const toRegistration = (r: (typeof workshop.rows)[number]) => {
      if (r.participant) participantMap[r.participant.id] = r.participant;
      return {
        id: r.id,
        participant_id: r.participant_id,
        event_id: r.event_id,
        registered_at: r.registered_at,
      };
    };

    const workshopRegistrations = workshop.rows.map(toRegistration);
    const foodRegistrations = food.rows.map(toRegistration);

    return NextResponse.json({
      workshops: workshop.eventsOfType,
      food: food.eventsOfType,
      workshopRegistrations,
      foodRegistrations,
      participants: participantMap,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("GET /api/event-stats failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch event stats" },
      { status: 500 },
    );
  }
}
