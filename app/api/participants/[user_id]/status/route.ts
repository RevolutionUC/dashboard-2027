import { NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/api/session-auth";
import { db, must, now } from "@/lib/db";
import { isParticipantStatus } from "@/lib/participant-status";
import { logAction } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ user_id: string }> }) {
  const auth = await requireAuthenticatedSession();
  if (auth.error) {
    return auth.error;
  }
  const { session } = auth;

  const { user_id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const nextStatus = (body as { status?: unknown } | null | undefined)?.status;
  if (!isParticipantStatus(nextStatus)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }
  // Fetch the current status before updating so we can log the transition
  const current = must(
    await db
      .from("participants")
      .select("status,firstName:first_name,lastName:last_name")
      .eq("user_id", user_id)
      .maybeSingle(),
  );

  if (!current) {
    return NextResponse.json(
      { message: "Participant not found" },
      { status: 404 },
    );
  }

  const previousStatus = current.status;

  const checkedIn = nextStatus === "CHECKED_IN";
  const updated = must(
    await db
      .from("participants")
      .update({
        status: nextStatus,
        checked_in: checkedIn,
        updated_at: now(),
      })
      .eq("user_id", user_id)
      .select("user_id")
      .maybeSingle(),
  );

  if (!updated) {
    return NextResponse.json(
      { message: "Participant not found" },
      { status: 404 },
    );
  }

  await logAction({
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
    action: "UPDATE_STATUS",
    targetId: user_id,
    details: {
      name: current.firstName + " " + current.lastName,
      from: previousStatus,
      to: nextStatus,
    },
  });

  return NextResponse.json({ ok: true });
}
