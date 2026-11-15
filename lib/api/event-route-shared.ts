import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireNonOrganizerSession, requireSessionWithId } from "@/lib/api/route-utils";

export const EVENT_VISIBILITIES = ["internal", "public"] as const;
export const EVENT_TYPES = ["WORKSHOP", "FOOD"] as const;

/** Parses an optional date string into an ISO timestamp for the database. */
export function parseOptionalDate(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return new Date(value).toISOString();
}

export function parseOptionalString(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return value;
}

export function parseOptionalCapacity(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.length === 0) return null;
  return Number.parseInt(value, 10);
}

export function assignSchedulingUpdateFields(
  updateData: Record<string, unknown>,
  values: {
    startTime?: unknown;
    endTime?: unknown;
    location?: unknown;
    capacity?: unknown;
  },
) {
  const { startTime, endTime, location, capacity } = values;
  // Keys are database column names
  if (startTime !== undefined) updateData.start_time = parseOptionalDate(startTime);
  if (endTime !== undefined) updateData.end_time = parseOptionalDate(endTime);
  if (location !== undefined) updateData.location = parseOptionalString(location);
  if (capacity !== undefined) updateData.capacity = parseOptionalCapacity(capacity);
}

export function validateRequiredName(name: unknown): NextResponse | null {
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  return null;
}

export function validateVisibility(visibility: unknown): NextResponse | null {
  if (visibility && !EVENT_VISIBILITIES.includes(visibility as (typeof EVENT_VISIBILITIES)[number])) {
    return NextResponse.json(
      { error: "Visibility must be 'internal' or 'public'" },
      { status: 400 },
    );
  }
  return null;
}

export function validateRequiredEventType(eventType: unknown): NextResponse | null {
  if (!eventType || typeof eventType !== "string") {
    return NextResponse.json({ error: "Event type is required" }, { status: 400 });
  }
  return null;
}

export function validateEventType(eventType: unknown): NextResponse | null {
  if (eventType && !EVENT_TYPES.includes(eventType as (typeof EVENT_TYPES)[number])) {
    return NextResponse.json(
      { error: "Event type must be 'WORKSHOP' or 'FOOD'" },
      { status: 400 },
    );
  }
  return null;
}

export async function requireCreateContext(request: NextRequest) {
  const auth = await requireNonOrganizerSession();
  if ("error" in auth) {
    return { error: auth.error } as const;
  }

  const body = await request.json();
  return { session: auth.session, body } as const;
}

export async function requireUpdateContext(request: NextRequest) {
  const sessionAndId = await requireSessionWithId(request);
  if ("error" in sessionAndId) {
    return { error: sessionAndId.error } as const;
  }

  const body = await request.json();
  return { session: sessionAndId.session, id: sessionAndId.id, body } as const;
}

export async function requireDeleteContext(request: NextRequest) {
  const sessionAndId = await requireSessionWithId(request);
  if ("error" in sessionAndId) {
    return { error: sessionAndId.error } as const;
  }

  return { session: sessionAndId.session, id: sessionAndId.id } as const;
}

/** The success branch of a require*Context result (handlers never see the error case). */
type ContextOf<F extends (...args: never[]) => Promise<unknown>> = Exclude<
  Awaited<ReturnType<F>>,
  { error: NextResponse }
>;

export async function withCreateContext(
  request: NextRequest,
  handler: (context: ContextOf<typeof requireCreateContext>) => Promise<Response>,
) {
  const createContext = await requireCreateContext(request);
  if ("error" in createContext) {
    return createContext.error;
  }
  return handler(createContext);
}

export async function withUpdateContext(
  request: NextRequest,
  handler: (context: ContextOf<typeof requireUpdateContext>) => Promise<Response>,
) {
  const updateContext = await requireUpdateContext(request);
  if ("error" in updateContext) {
    return updateContext.error;
  }
  return handler(updateContext);
}

export async function withDeleteContext(
  request: NextRequest,
  handler: (context: ContextOf<typeof requireDeleteContext>) => Promise<Response>,
) {
  const deleteContext = await requireDeleteContext(request);
  if ("error" in deleteContext) {
    return deleteContext.error;
  }
  return handler(deleteContext);
}
