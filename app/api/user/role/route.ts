import { NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/lib/api/session-auth";

export async function GET() {
  const auth = await requireAuthenticatedSession();
  if (auth.error) {
    return auth.error;
  }

  return NextResponse.json({ dashboardRole: auth.access.dashboardRole });
}
