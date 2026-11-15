import { NextResponse } from "next/server";
import { db, must, now } from "@/lib/db";
import { ACCESS_REQUEST_COLUMNS } from "@/lib/db/columns";
import { APP_ROLES, type AppRole } from "@/lib/auth";
import { sendApprovalEmail, sendDenialEmail } from "@/lib/email";
import { logAction } from "@/lib/audit";
import { withAdminSession } from "@/lib/api/admin-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/admin/approvals - List access requests
export async function GET(request: Request) {
  return withAdminSession(async () => {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    let query = db.from("access_requests").select(ACCESS_REQUEST_COLUMNS);

    if (
      statusFilter &&
      ["pending", "approved", "denied"].includes(statusFilter)
    ) {
      query = query.eq("status", statusFilter as "pending" | "approved" | "denied");
    }

    const requests = must(await query.order("requested_at", { ascending: true }));
    return NextResponse.json(requests);
  });
}

// PATCH /api/admin/approvals - Approve or deny a request
export async function PATCH(request: Request) {
  return withAdminSession(async (session) => {
    const body = await request.json();
    const { requestId, action, role } = body as {
      requestId: string;
      action: "approve" | "deny" | "revoke";
      role?: string;
    };

    if (!requestId || !["approve", "deny", "revoke"].includes(action)) {
      return NextResponse.json(
        {
          error:
            "Invalid request. Provide requestId and action (approve/deny/revoke).",
        },
        { status: 400 },
      );
    }

    // Validate role if approving
    if (action === "approve" && role && !(APP_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be lead, organizer, or admin." },
        { status: 400 },
      );
    }

    const assignedRole: AppRole | undefined = action === "approve" ? ((role as AppRole) || "lead") : undefined;

    // Get the access request
    const existingRequest = must(
      await db.from("access_requests").select(ACCESS_REQUEST_COLUMNS).eq("id", requestId).maybeSingle(),
    );

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (action !== "approve" && existingRequest.userId === session.user.id) {
      return NextResponse.json({ error: "You can't deny or revoke your own access." }, { status: 400 });
    }

    // Roles live in Supabase RBAC (public.user_roles), keyed by the Supabase auth user id.
    if (!UUID_RE.test(existingRequest.userId)) {
      return NextResponse.json(
        { error: "This account predates Supabase Auth. Ask the user to sign up again." },
        { status: 400 },
      );
    }

    if (assignedRole) {
      must(
        await db
          .from("user_roles")
          .upsert(
            { user_id: existingRequest.userId, role: assignedRole, updated_at: now() },
            { onConflict: "user_id" },
          ),
      );
    } else {
      // Deny and revoke both remove the role.
      must(await db.from("user_roles").delete().eq("user_id", existingRequest.userId));
    }

    const newStatus = action === "approve" ? "approved" : "denied";

    // Update the access request
    must(
      await db
        .from("access_requests")
        .update({
          status: newStatus,
          ...(assignedRole && { role: assignedRole }),
          reviewed_at: now(),
          reviewed_by: session.user.id,
        })
        .eq("id", requestId),
    );

    if (action === "approve") {
      await logAction({
        userId: session.user.id,
        name: session.user.name,
        email: session.user.email,
        action: "APPROVE_USER",
        details: {
          targetName: existingRequest.name,
          targetEmail: existingRequest.email,
          assignedRole: assignedRole,
        },
      });
    } else if (action === "revoke") {
      await logAction({
        userId: session.user.id,
        name: session.user.name,
        email: session.user.email,
        action: "REVOKE_USER",
        details: {
          targetName: existingRequest.name,
          targetEmail: existingRequest.email,
        },
      });
    } else {
      // Deny
      await logAction({
        userId: session.user.id,
        name: session.user.name,
        email: session.user.email,
        action: "DENY_USER",
        details: {
          targetName: existingRequest.name,
          targetEmail: existingRequest.email,
        },
      });
    }

    // Send notification email (fire-and-forget) - only for approve/deny, not revoke
    if (action === "approve") {
      sendApprovalEmail(existingRequest.email, existingRequest.name).catch(
        (err: unknown) => console.error("Failed to send approval email:", err),
      );
    } else if (action === "deny") {
      sendDenialEmail(existingRequest.email, existingRequest.name).catch(
        (err: unknown) => console.error("Failed to send denial email:", err),
      );
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
    });
  });
}
