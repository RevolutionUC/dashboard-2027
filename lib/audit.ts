import { db, must } from "@/lib/db";
import type { Enums, Json } from "@/lib/db/types";

// Action types (the `actions` enum in the database)
export type AuditAction = Enums<"actions">;

interface LogActionParams {
  userId: string;
  name: string;
  email: string;
  action: AuditAction;
  sessionId?: string | null;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
}


export async function logAction({
  userId,
  name,
  email,
  action,
  sessionId = null,
  targetId = null,
  details = null,
}: LogActionParams): Promise<void> {
  try {
    must(
      await db.from("audit_log").insert({
        user_id: userId,
        name,
        email,
        action,
        session_id: sessionId,
        target_id: targetId,
        details: details as Json,
      }),
    );
  } catch (err) {
    console.error("Audit log failed (non-fatal):", err);
  }
}
