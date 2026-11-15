import { NextResponse } from "next/server";
import { getAccessInfo } from "@/lib/auth";

type AdminSession = NonNullable<Awaited<ReturnType<typeof getAdminSession>>>;

export async function getAdminSession() {
  // Admin = `user_role` claim from Supabase RBAC (verified JWT).
  const access = await getAccessInfo();
  if (!access?.isAdmin) {
    return null;
  }

  return access.session;
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  return { session } as const;
}

export async function withAdminSession<T>(
  handler: (session: AdminSession) => Promise<T>,
): Promise<T | Response> {
  const auth = await requireAdminSession();
  if (auth.error) {
    return auth.error;
  }
  return handler(auth.session);
}
