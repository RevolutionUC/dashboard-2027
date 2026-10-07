import { NextResponse } from "next/server";
import {
  requireRegistrationStaff,
  assertRegistrationOrigin,
  RegistrationError,
  registrationError,
  readRegistrationJson,
} from "@/lib/api/registration-auth";
import { review, type ReviewAction } from "@/lib/registration/service";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRegistrationStaff();
  if ("error" in access) return access.error;
  try {
    assertRegistrationOrigin(request);
    const body = (await readRegistrationJson(request)) as ReviewAction;
    if (
      !body ||
      ![
        "approve",
        "decline",
        "assign",
        "check-in-role",
        "notes",
        "link-participant",
        "remind",
        "offer",
        "retry-email",
      ].includes(body.action)
    )
      throw new RegistrationError("Choose a valid review action.");
    for (const key of ["categoryId", "sponsorId", "assignment", "notes"] as const)
      if (body[key] !== undefined && (typeof body[key] !== "string" || body[key]!.length > 4000))
        throw new RegistrationError("Review details are too long or invalid.");
    if (
      body.followUpAt !== undefined &&
      body.followUpAt !== null &&
      (typeof body.followUpAt !== "string" || Number.isNaN(Date.parse(body.followUpAt)))
    )
      throw new RegistrationError("Invalid follow-up date.");
    return NextResponse.json(await review((await params).id, body, access.info.session.user.id));
  } catch (error) {
    return registrationError(error);
  }
}
