import { NextResponse } from "next/server";
import {
  assertRegistrationOrigin,
  requireRegistrationStaff,
  registrationError,
  readRegistrationJson,
} from "@/lib/api/registration-auth";
import { saveSettings } from "@/lib/registration/settings";
export async function PUT(request: Request) {
  const access = await requireRegistrationStaff();
  if ("error" in access) return access.error;
  try {
    assertRegistrationOrigin(request);
    return NextResponse.json(
      await saveSettings(await readRegistrationJson(request), access.info.session.user.id),
    );
  } catch (error) {
    return registrationError(error);
  }
}
