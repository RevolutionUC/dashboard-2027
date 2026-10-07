import { db } from "@/lib/db";
import { events, eventRegistrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { logAction } from "@/lib/audit";
import { getParticipantByUserId } from "@/lib/api/qr-participant";
import {
  requireEventStaff,
  assertRegistrationOrigin,
  registrationError,
} from "@/lib/api/registration-auth";
import { setAttendance } from "@/lib/registration/attendance";

// GET /api/qr - Get participant info or events list
export async function GET(request: NextRequest) {
  const access = await requireEventStaff();
  if ("error" in access) return access.error;
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("id");
  const action = searchParams.get("action");

  try {
    // Fetch events list
    if (action === "events") {
      const eventsList = await db
        .select({
          id: events.id,
          name: events.name,
          description: events.description,
          eventType: events.eventType,
          location: events.location,
        })
        .from(events);

      return NextResponse.json({
        workshops: eventsList.filter((e) => e.eventType === "WORKSHOP"),
        food: eventsList.filter((e) => e.eventType === "FOOD"),
      });
    }

    // Fetch participant info
    if (!user_id) {
      return NextResponse.json({ error: "Missing participant ID" }, { status: 400 });
    }

    const participantLookup = await getParticipantByUserId(user_id);
    if ("error" in participantLookup) {
      return participantLookup.error;
    }
    const { participant } = participantLookup;

    return NextResponse.json(participant);
  } catch (error) {
    console.error("QR API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/qr - Check-in or register for event
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const access = await requireEventStaff();
    if ("error" in access) return access.error;
    assertRegistrationOrigin(request);
    const session = access.info.session;

    const { user_id, mode, eventId } = await request.json();

    if (!user_id || !mode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find participant
    const participantLookup = await getParticipantByUserId(user_id);
    if ("error" in participantLookup) {
      return participantLookup.error;
    }
    const { participant } = participantLookup;

    // Main check-in
    if (mode === "checkin") {
      if (participant.checkedIn) {
        return NextResponse.json({ error: "Already checked in" }, { status: 409 });
      }

      await setAttendance(user_id, "CHECKED_IN", true);

      await logAction({
        userId: session.user.id,
        name: session.user.name,
        email: session.user.email,
        action: "CHECKIN",
        targetId: participant.user_id,
        details: {
          firstName: participant.firstName,
          lastName: participant.lastName,
        },
      });

      return NextResponse.json({
        message: "Checked in successfully",
        participant: {
          name: participant.firstName + " " + participant.lastName,
        },
      });
    }

    // Workshop/Food registration
    if (mode === "workshop" || mode === "food") {
      if (!eventId) {
        return NextResponse.json({ error: "Event ID required" }, { status: 400 });
      }

      // Participant must be checked in before registering for food/workshop
      if (!participant.checkedIn) {
        return NextResponse.json(
          {
            error: "Participant must be checked in before registering for a " + mode,
          },
          { status: 403 },
        );
      }

      // Check event exists
      const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      // Check if already registered
      const [existing] = await db
        .select()
        .from(eventRegistrations)
        .where(
          and(
            eq(eventRegistrations.participant_id, user_id),
            eq(eventRegistrations.eventId, eventId),
          ),
        )
        .limit(1);

      if (existing) {
        return NextResponse.json({ error: "Already registered for this event" }, { status: 409 });
      }

      // Check capacity
      if (event.capacity) {
        const registrations = await db
          .select()
          .from(eventRegistrations)
          .where(eq(eventRegistrations.eventId, eventId));

        if (registrations.length >= event.capacity) {
          return NextResponse.json({ error: "Event is full" }, { status: 409 });
        }
      }

      // Register
      await db.insert(eventRegistrations).values({ participant_id: user_id, eventId });

      await logAction({
        userId: session.user.id,
        name: session.user.name,
        email: session.user.email,
        action: mode === "workshop" ? "WORKSHOP_CHECKIN" : "FOOD_CHECKIN",
        targetId: participant.user_id,
        details: {
          name: participant.firstName + " " + participant.lastName,
          eventId: event.id,
          eventName: event.name,
        },
      });

      return NextResponse.json({
        message: `Registered for ${event.name}`,
        participant: {
          firstName: participant.firstName,
          lastName: participant.lastName,
        },
        event: { name: event.name },
      });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (error) {
    return registrationError(error);
  }
}
