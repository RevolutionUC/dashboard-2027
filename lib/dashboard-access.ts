import { redirect } from "next/navigation";
import { type AppRole, getAccessInfo } from "@/lib/auth";

interface DashboardAccessInfo {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  /** From the verified Supabase `user_role` JWT claim. null = not approved. */
  dashboardRole: AppRole | null;
  isAdmin: boolean;
  isApproved: boolean;
}

/** Access info for server components. Redirects to /sign-in when not signed in. */
export async function getDashboardAccessInfo(): Promise<DashboardAccessInfo> {
  const access = await getAccessInfo();

  if (!access) {
    redirect("/sign-in");
  }

  const { user } = access.session;
  return {
    userId: user.id,
    userName: user.name ?? null,
    userEmail: user.email ?? null,
    userImage: user.image ?? null,
    dashboardRole: access.dashboardRole,
    isAdmin: access.isAdmin,
    isApproved: access.isApproved,
  };
}
