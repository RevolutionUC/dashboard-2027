import { NextResponse } from "next/server";
import {
  requireRegistrationStaff,
  assertRegistrationOrigin,
  registrationError,
  RegistrationError,
} from "@/lib/api/registration-auth";
import { setAttendance } from "@/lib/registration/attendance";
import { isParticipantStatus } from "@/lib/participant-status";
import { logAction } from "@/lib/audit";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ user_id: string }> },
) {
  const access = await requireRegistrationStaff();
  if ("error" in access) return access.error;
  try {
    assertRegistrationOrigin(request);
    const body = await request.json();
    if (!isParticipantStatus(body?.status))
      throw new RegistrationError("Invalid participant status.");
    const id = (await params).user_id;
    const result = await setAttendance(id, body.status);
    const user = access.info.session.user;
    await logAction({
      userId: user.id,
      name: user.name,
      email: user.email,
      action: "UPDATE_STATUS",
      targetId: id,
      details: { from: result.previousStatus, to: body.status },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return registrationError(error);
  }
}
