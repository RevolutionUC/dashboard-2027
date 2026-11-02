import { and, eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/lib/api/session-auth";
import {
  getActionPermissions,
  type DashboardRole,
} from "@/lib/dashboard/action-permissions";
import { db } from "@/lib/db";
import { accessRequests, actionItems, suggestions, user as userTable } from "@/lib/db/schema";

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedSession();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { session } = authResult;

  const [userData] = await db
    .select({ dashboardRole: userTable.dashboardRole })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);

  const authRole = (session.user as { role?: string }).role;
  const dbRole = userData?.dashboardRole;

  const role: DashboardRole =
    authRole === "admin" || dbRole === "admin"
      ? "admin"
      : dbRole === "lead" || dbRole === "organizer"
        ? dbRole
        : null;

  if (role !== "admin") {
    const [accessRequest] = await db
      .select({ status: accessRequests.status })
      .from(accessRequests)
      .where(eq(accessRequests.userId, session.user.id))
      .limit(1);

    if (accessRequest?.status !== "approved") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const permissions = getActionPermissions(role);
  if (!permissions.canSubmitSuggestions) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  if (typeof data.content !== "string" || data.content.trim().length === 0) {
    return NextResponse.json(
      { error: "Suggestion text is required" },
      { status: 400 },
    );
  }

  const content = data.content.trim();
  if (content.length > 2000) {
    return NextResponse.json(
      { error: "Suggestion text must be 2000 characters or fewer" },
      { status: 400 },
    );
  }

  const [suggestion] = await db
    .insert(suggestions)
    .values({
      content,
      status: "pending",
      submitterUserId: session.user.id,
    })
    .returning();

  return NextResponse.json({ suggestion }, { status: 201 });
}

export async function GET() {
  const authResult = await requireAuthenticatedSession();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { session } = authResult;

  const [userData] = await db
    .select({ dashboardRole: userTable.dashboardRole })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);

  const authRole = (session.user as { role?: string }).role;
  const dbRole = userData?.dashboardRole;

  const role: DashboardRole =
    authRole === "admin" || dbRole === "admin"
      ? "admin"
      : dbRole === "lead" || dbRole === "organizer"
        ? dbRole
        : null;

  if (role !== "admin") {
    const [accessRequest] = await db
      .select({ status: accessRequests.status })
      .from(accessRequests)
      .where(eq(accessRequests.userId, session.user.id))
      .limit(1);

    if (accessRequest?.status !== "approved") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!getActionPermissions(role).canReviewSuggestions) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await db
    .select({
      id: suggestions.id,
      content: suggestions.content,
      status: suggestions.status,
      createdAt: suggestions.createdAt,
      submitterName: userTable.name,
    })
    .from(suggestions)
    .leftJoin(userTable, eq(suggestions.submitterUserId, userTable.id))
    .orderBy(desc(suggestions.createdAt))
    .limit(100);

  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
  const authResult = await requireAuthenticatedSession();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { session } = authResult;

  // Get the reviewer's role from the database/session, not the request body.
  const [userData] = await db
    .select({ dashboardRole: userTable.dashboardRole })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))
    .limit(1);

  const authRole = (session.user as { role?: string }).role;
  const dbRole = userData?.dashboardRole;

  const role: DashboardRole =
    authRole === "admin" || dbRole === "admin"
      ? "admin"
      : dbRole === "lead" || dbRole === "organizer"
        ? dbRole
        : null;

  // Confirm dashboard access is approved.
  if (role !== "admin") {
    const [accessRequest] = await db
      .select({ status: accessRequests.status })
      .from(accessRequests)
      .where(eq(accessRequests.userId, session.user.id))
      .limit(1);

    if (accessRequest?.status !== "approved") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Only admins and leads may review suggestions.
  if (!getActionPermissions(role).canReviewSuggestions) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const suggestionId = data.suggestionId;
  const decision = data.decision;

  if (
    typeof suggestionId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      suggestionId,
    ) ||
    (decision !== "accept" && decision !== "dismiss")
  ) {
    return NextResponse.json(
      { error: "Provide a valid suggestionId and decision (accept or dismiss)." },
      { status: 400 },
    );
  }

  const result = await db.transaction(async (tx) => {
    // Update only pending suggestions, preventing a suggestion from being
    // accepted or dismissed more than once.
    const [suggestion] = await tx
      .update(suggestions)
      .set({ status: decision === "accept" ? "accepted" : "dismissed" })
      .where(
        and(
          eq(suggestions.id, suggestionId),
          eq(suggestions.status, "pending"),
        ),
      )
      .returning();

    if (!suggestion) {
      return null;
    }

    if (decision === "accept") {
      const [actionItem] = await tx
        .insert(actionItems)
        .values({
          title: suggestion.content,
          details: null,
          status: "open",
          createdBy: session.user.id,
          sourceSuggestionId: suggestion.id,
        })
        .returning();

      return { suggestion, actionItem };
    }

    return { suggestion, actionItem: null };
  });

  if (!result) {
    return NextResponse.json(
      { error: "Suggestion not found or already reviewed." },
      { status: 409 },
    );
  }

  return NextResponse.json(result);
}