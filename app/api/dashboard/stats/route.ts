import { NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/lib/api/session-auth";
import { db } from "@/lib/db";
import type { Enums } from "@/lib/db/types";

async function countParticipants(status?: Enums<"participant_status">) {
  let query = db.from("participants").select("*", { count: "exact", head: true });
  if (status) query = query.eq("status", status);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function GET() {
  const auth = await requireAuthenticatedSession();
  if (auth.error) {
    return auth.error;
  }

  try {
    const [total, confirmed, waitlisted, checkedIn] = await Promise.all([
      countParticipants(),
      countParticipants("CONFIRMED"),
      countParticipants("WAITLISTED"),
      countParticipants("CHECKED_IN"),
    ]);

    return NextResponse.json({ total, confirmed, waitlisted, checkedIn });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}
