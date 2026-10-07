import { NextResponse } from "next/server";
import { getSessionWithRole } from "@/lib/auth";
import { pool } from "@/lib/db";
import { RegistrationError } from "@/lib/registration/errors";
export { RegistrationError } from "@/lib/registration/errors";
export async function requireRegistrationStaff() {
  return requireEventStaff(["admin", "lead"]);
}
export async function requireEventStaff(roles = ["admin", "lead", "organizer"]) {
  const info = await getSessionWithRole();
  if (!info || !roles.includes(info.dashboardRole))
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  if (info.dashboardRole !== "admin") {
    const result = await pool.query("SELECT status FROM access_requests WHERE user_id=$1", [
      info.session.user.id,
    ]);
    if (result.rows[0]?.status !== "approved")
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { info } as const;
}
export function assertRegistrationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.BETTER_AUTH_URL!).origin;
  if (origin && origin !== expected)
    throw new RegistrationError("Request origin is not allowed.", 403);
}
export function registrationError(error: unknown) {
  if (error instanceof RegistrationError)
    return NextResponse.json(
      { error: error.message, message: error.message },
      { status: error.status },
    );
  console.error(
    "Registration administration failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return NextResponse.json(
    {
      error: "Could not complete this operation. Please try again.",
      message: "Could not complete this operation. Please try again.",
    },
    { status: 503 },
  );
}
export async function readRegistrationJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new RegistrationError("Invalid JSON body.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65536) {
        await reader.cancel();
        throw new RegistrationError("This request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new RegistrationError("Invalid JSON body.");
  }
}
