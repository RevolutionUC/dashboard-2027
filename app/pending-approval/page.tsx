import { redirect } from "next/navigation";
import { db, must } from "@/lib/db";
import { getDashboardAccessInfo } from "@/lib/dashboard-access";
import { PendingApprovalClient } from "./client";

export default async function PendingApprovalPage() {
  const access = await getDashboardAccessInfo();
  // Has a role in Supabase RBAC -> approved
  if (access.isApproved) {
    redirect("/dashboard");
  }

  // Check the user's access request status
  const request = must(
    await db
      .from("access_requests")
      .select("status,requestedAt:requested_at")
      .eq("user_id", access.userId)
      .limit(1)
      .maybeSingle(),
  );

  return (
    <PendingApprovalClient
      userName={access.userName ?? ""}
      userEmail={access.userEmail ?? ""}
      userImage={access.userImage}
      status={request?.status ?? "pending"}
      userId={access.userId}
    />
  );
}
