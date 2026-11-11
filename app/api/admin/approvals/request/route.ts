import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, must, now } from "@/lib/db";

// POST /api/admin/approvals/request - Re-request access (for denied users)
export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { userId } = body as { userId: string };

  // Users can only re-request for themselves
  if (userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check current request status
  const existingRequest = must(
    await db.from("access_requests").select("id,status").eq("user_id", userId).limit(1).maybeSingle(),
  );

  if (!existingRequest) {
    return NextResponse.json({ error: "No existing request found" }, { status: 404 });
  }

  if (existingRequest.status === "approved") {
    return NextResponse.json({ error: "Already approved" }, { status: 400 });
  }

  if (existingRequest.status === "pending") {
    return NextResponse.json({ error: "Request already pending" }, { status: 400 });
  }

  // Reset to pending
  must(
    await db
      .from("access_requests")
      .update({
        status: "pending",
        reviewed_at: null,
        reviewed_by: null,
        requested_at: now(),
      })
      .eq("id", existingRequest.id),
  );

  return NextResponse.json({ success: true });
}
