import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isTeam } from "@/lib/dashboard/team";
import { requireAuthenticatedSession } from "@/lib/api/session-auth";
import {
  getActionPermissions,
  type DashboardRole,
} from "@/lib/dashboard/action-permissions";
import { db } from "@/lib/db";
import {accessRequests, actionItems, user as userTable} from "@/lib/db/schema";


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
    const [requestRecord] = await db
      .select({ status: accessRequests.status })
      .from(accessRequests)
      .where(eq(accessRequests.userId, session.user.id))
      .limit(1);

    if (requestRecord?.status !== "approved") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const permissions = getActionPermissions(role);
  if (!permissions.canCreateActionItems) {
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

  if (typeof data.title !== "string" || data.title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!isTeam(data.team)) {
  return NextResponse.json({ error: "Choose a valid team" }, { status: 400 });
}

if (
  data.forTeam !== undefined &&
  data.forTeam !== null &&
  data.forTeam !== "" &&
  !isTeam(data.forTeam)
) {
  return NextResponse.json(
    { error: "Choose a valid team for this item" },
    { status: 400 },
  );
}

const team = data.team;
const forTeam = isTeam(data.forTeam) ? data.forTeam : null;

  if (data.details !== undefined && typeof data.details !== "string") {
    return NextResponse.json(
      { error: "Details must be text" },
      { status: 400 },
    );
  }

  const title = data.title.trim();
  const details =
    typeof data.details === "string" ? data.details.trim() : null;

  const [actionItem] = await db
  .insert(actionItems)
  .values({
    title,
    team,
    forTeam,
    details,
    status: "open",
    createdBy: session.user.id,
  })
  .returning();

  return NextResponse.json({ actionItem }, { status: 201 });
}

export async function GET() {
  const authResult = await requireAuthenticatedSession();
  if ("error" in authResult) return authResult.error;

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

  const items = await db
    .select({
      id: actionItems.id,
      title: actionItems.title,
      team: actionItems.team,
      forTeam: actionItems.forTeam,
      details: actionItems.details,
      status: actionItems.status,
      createdAt: actionItems.createdAt,
      creatorName: userTable.name,
      sourceSuggestionId: actionItems.sourceSuggestionId,
    })
    .from(actionItems)
    .leftJoin(userTable, eq(actionItems.createdBy, userTable.id))
    .orderBy(desc(actionItems.createdAt))
    .limit(100);

  return NextResponse.json({ items });
}
