import { NextRequest, NextResponse } from "next/server";
import { type AuditAction, logAction } from "@/lib/audit";
import { getAccessInfo } from "@/lib/auth";

interface AuthorizedSession {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

type AuthResult =
  | { error: NextResponse }
  | { session: AuthorizedSession };

export async function requireNonOrganizerSession(): Promise<AuthResult> {
  const sessionInfo = await getAccessInfo();

  if (!sessionInfo) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!sessionInfo.isApproved) {
    return { error: NextResponse.json({ error: "Access not approved" }, { status: 403 }) };
  }

  if (sessionInfo.dashboardRole === "organizer") {
    return {
      error: NextResponse.json({ error: "Forbidden - insufficient permissions" }, { status: 403 }),
    };
  }

  return {
    session: {
      user: {
        id: sessionInfo.session.user.id,
        name: sessionInfo.session.user.name,
        email: sessionInfo.session.user.email,
      },
    },
  };
}

export function getRequiredIdFromRequest(request: NextRequest): string | NextResponse {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
  }
  return id;
}

type SessionUser = {
  id: string;
  name: string;
  email: string;
};

type SessionWithUser = {
  user: SessionUser;
};

type SessionWithIdResult =
  | { error: NextResponse }
  | { session: SessionWithUser; id: string };

export async function requireSessionWithId(
  request: NextRequest,
): Promise<SessionWithIdResult> {
  const auth = await requireNonOrganizerSession();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const idOrError = getRequiredIdFromRequest(request);
  if (typeof idOrError !== "string") {
    return { error: idOrError };
  }

  return { session: auth.session, id: idOrError };
}

export async function logNamedTargetAction(
  session: SessionWithUser,
  action: AuditAction,
  targetId: string,
  targetName: string,
) {
  await logAction({
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
    action,
    targetId,
    details: { name: targetName },
  });
}
