import { type NextRequest, NextResponse } from "next/server";
import { db, must, now } from "@/lib/db";
import { EVENT_COLUMNS } from "@/lib/db/columns";
import type { TablesUpdate } from "@/lib/db/types";
import {
  assignSchedulingUpdateFields,
  parseOptionalCapacity,
  parseOptionalDate,
  parseOptionalString,
  validateEventType,
  validateRequiredEventType,
  validateRequiredName,
  withCreateContext,
  withDeleteContext,
  withUpdateContext,
} from "@/lib/api/event-route-shared";
import { logNamedTargetAction } from "@/lib/api/route-utils";

// GET all events
export async function GET() {
  try {
    const allEvents = must(
      await db.from("events").select(EVENT_COLUMNS).order("start_time", { ascending: false }),
    );

    return NextResponse.json(allEvents);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

// POST create a new event
export async function POST(request: NextRequest) {
  try {
    return withCreateContext(request, async ({ session, body }) => {
      const { name, description, eventType, startTime, endTime, location, capacity } = body;

      const nameError = validateRequiredName(name);
      if (nameError) return nameError;
      const requiredTypeError = validateRequiredEventType(eventType);
      if (requiredTypeError) return requiredTypeError;
      const typeError = validateEventType(eventType);
      if (typeError) return typeError;

      const newEvent = must(
        await db
          .from("events")
          .insert({
            name,
            description: parseOptionalString(description),
            event_type: eventType,
            start_time: parseOptionalDate(startTime),
            end_time: parseOptionalDate(endTime),
            location: parseOptionalString(location),
            capacity: parseOptionalCapacity(capacity),
          })
          .select(EVENT_COLUMNS)
          .single(),
      );

      await logNamedTargetAction(session, "CREATE_EVENT", newEvent.id, newEvent.name);

      return NextResponse.json(newEvent, { status: 201 });
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

// PATCH update an event
export async function PATCH(request: NextRequest) {
  try {
    return withUpdateContext(request, async ({ session, id, body }) => {
      const { name, description, eventType, startTime, endTime, location, capacity } = body;

      const typeError = validateEventType(eventType);
      if (typeError) return typeError;

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = parseOptionalString(description);
      if (eventType !== undefined) updateData.event_type = eventType;
      assignSchedulingUpdateFields(updateData, { startTime, endTime, location, capacity });
      updateData.updated_at = now();

      const updatedEvent = must(
        await db
          .from("events")
          .update(updateData as TablesUpdate<"events">)
          .eq("id", id)
          .select(EVENT_COLUMNS)
          .maybeSingle(),
      );

      if (!updatedEvent) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      await logNamedTargetAction(session, "UPDATE_EVENT", updatedEvent.id, updatedEvent.name);

      return NextResponse.json(updatedEvent);
    });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

// DELETE an event
export async function DELETE(request: NextRequest) {
  try {
    return withDeleteContext(request, async ({ session, id }) => {
      const deletedEvent = must(
        await db.from("events").delete().eq("id", id).select("id,name").maybeSingle(),
      );

      if (!deletedEvent) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      await logNamedTargetAction(session, "DELETE_EVENT", deletedEvent.id, deletedEvent.name);

      return NextResponse.json({ message: "Event deleted successfully" });
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
