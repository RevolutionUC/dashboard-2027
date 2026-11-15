import { NextResponse } from "next/server";
import { getAccessInfo } from "@/lib/auth";

/** Requires a signed-in user whose access request was approved (or an admin). */
export async function requireAuthenticatedSession() {
  const access = await getAccessInfo();
  if (!access) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (!access.isApproved) {
    return { error: NextResponse.json({ error: "Access not approved" }, { status: 403 }) } as const;
  }
  return { session: access.session, access } as const;
}
