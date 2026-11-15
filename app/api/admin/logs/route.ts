import { NextResponse } from "next/server";
import { db, must } from "@/lib/db";
import type { Enums } from "@/lib/db/types";
import { withAdminSession } from "@/lib/api/admin-auth";

// GET /api/admin/logs - Fetch audit logs with optional filters
export async function GET(request: Request) {
  return withAdminSession(async () => {
    const { searchParams } = new URL(request.url);
    const actionFilter = searchParams.get("action");
    const limit = Math.min(Number(searchParams.get("limit") || "50"), 200);
    const offset = Math.max(Number(searchParams.get("offset") || "0"), 0);

    try {
      let query = db
        .from("audit_log")
        .select("id,session_id,user_id,name,email,action,target_id,details,event_time");

      if (actionFilter && actionFilter !== "all") {
        query = query.eq("action", actionFilter as Enums<"actions">);
      }

      const logs = must(
        await query.order("event_time", { ascending: false }).range(offset, offset + limit - 1),
      );
      return NextResponse.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch audit logs" },
        { status: 500 },
      );
    }
  });
}
