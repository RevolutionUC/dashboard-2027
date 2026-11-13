import { NextResponse } from "next/server";
import { db, must } from "@/lib/db";

export async function getParticipantByUserId(userId: string) {
  const participant = must(
    await db
      .from("participants")
      .select(
        "user_id,firstName:first_name,lastName:last_name,email,status,checkedIn:checked_in,shirtSize:shirt_size,dietRestrictions:diet_restrictions",
      )
      .eq("user_id", userId)
      .maybeSingle(),
  );

  if (!participant) {
    return {
      error: NextResponse.json({ error: "Participant not found" }, { status: 404 }),
    } as const;
  }

  return { participant } as const;
}
