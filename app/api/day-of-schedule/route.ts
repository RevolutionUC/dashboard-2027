import { NextRequest, NextResponse } from "next/server";
import { db, must, now } from "@/lib/db";
import { DAY_OF_SCHEDULE_COLUMNS } from "@/lib/db/columns";
import type { TablesUpdate } from "@/lib/db/types";
import {
  assignSchedulingUpdateFields,
  parseOptionalCapacity,
  parseOptionalDate,
  parseOptionalString,
  validateRequiredName,
  validateVisibility,
  withCreateContext,
  withDeleteContext,
  withUpdateContext,
} from "@/lib/api/event-route-shared";
import { logNamedTargetAction } from "@/lib/api/route-utils";

// GET all day-of schedule events with creator info
export async function GET() {
  try {
    const rows = must(
      await db
        .from("day_of_schedule")
        .select(`${DAY_OF_SCHEDULE_COLUMNS},creator:user!created_by(email,name)`)
        .order("start_time", { ascending: false }),
    );

    const allScheduleItems = rows.map(({ creator, ...item }) => ({
      ...item,
      creatorEmail: creator?.email ?? null,
      creatorName: creator?.name ?? null,
    }));

    return NextResponse.json(allScheduleItems);
  } catch (error) {
    console.error("Error fetching day-of schedule:", error);
    return NextResponse.json({ error: "Failed to fetch day-of schedule" }, { status: 500 });
  }
}

// POST create a new day-of schedule event
export async function POST(request: NextRequest) {
  try {
    return withCreateContext(request, async ({ session, body }) => {
      const { name, startTime, endTime, location, capacity, visibility } = body;

      const nameError = validateRequiredName(name);
      if (nameError) return nameError;

      const visibilityError = validateVisibility(visibility);
      if (visibilityError) return visibilityError;

      const newScheduleItem = must(
        await db
          .from("day_of_schedule")
          .insert({
            name,
            start_time: parseOptionalDate(startTime),
            end_time: parseOptionalDate(endTime),
            location: parseOptionalString(location),
            capacity: parseOptionalCapacity(capacity),
            visibility: visibility || "public",
            created_by: session.user.id,
          })
          .select(DAY_OF_SCHEDULE_COLUMNS)
          .single(),
      );

      await logNamedTargetAction(session, "CREATE_SCHEDULE", newScheduleItem.id, newScheduleItem.name);

      return NextResponse.json(newScheduleItem, { status: 201 });
    });
  } catch (error) {
    console.error("Error creating day-of schedule item:", error);
    return NextResponse.json({ error: "Failed to create day-of schedule item" }, { status: 500 });
  }
}

// PATCH update a day-of schedule event
export async function PATCH(request: NextRequest) {
  try {
    return withUpdateContext(request, async ({ session, id, body }) => {
      const { name, startTime, endTime, location, capacity, visibility } = body;

      const visibilityError = validateVisibility(visibility);
      if (visibilityError) return visibilityError;

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      assignSchedulingUpdateFields(updateData, { startTime, endTime, location, capacity });
      if (visibility !== undefined) updateData.visibility = visibility;
      updateData.updated_at = now();

      const updatedItem = must(
        await db
          .from("day_of_schedule")
          .update(updateData as TablesUpdate<"day_of_schedule">)
          .eq("id", id)
          .select(DAY_OF_SCHEDULE_COLUMNS)
          .maybeSingle(),
      );

      if (!updatedItem) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      await logNamedTargetAction(session, "UPDATE_SCHEDULE", updatedItem.id, updatedItem.name);

      return NextResponse.json(updatedItem);
    });
  } catch (error) {
    console.error("Error updating schedule item:", error);
    return NextResponse.json({ error: "Failed to update schedule item" }, { status: 500 });
  }
}

// DELETE a day-of schedule event
export async function DELETE(request: NextRequest) {
  try {
    return withDeleteContext(request, async ({ session, id }) => {
      const deletedItem = must(
        await db.from("day_of_schedule").delete().eq("id", id).select("id,name").maybeSingle(),
      );

      if (!deletedItem) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      await logNamedTargetAction(session, "DELETE_SCHEDULE", deletedItem.id, deletedItem.name);

      return NextResponse.json({ message: "Event deleted successfully" });
    });
  } catch (error) {
    console.error("Error deleting day-of schedule item:", error);
    return NextResponse.json({ error: "Failed to delete day-of schedule item" }, { status: 500 });
  }
}
