import type { User as SupabaseUser } from "@supabase/supabase-js";
import { cache } from "react";
import { db, must } from "./db";
import { USER_COLUMNS } from "./db/columns";
import type { Enums } from "./db/types";
import { createClient } from "./supabase/server";

export interface AppSession {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

function profileFromSupabaseUser(supabaseUser: SupabaseUser) {
  const meta = (supabaseUser.user_metadata ?? {}) as Record<string, unknown>;
  const email = (supabaseUser.email ?? "").toLowerCase();
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    email.split("@")[0] ||
    "User";
  const image = (typeof meta.avatar_url === "string" && meta.avatar_url) || null;
  return { email, name, image, emailVerified: Boolean(supabaseUser.email_confirmed_at) };
}

/**
 * Runs once when a Supabase user is seen for the first time: creates a pending
 * access request, reviewed on the Admin → Approvals page. Roles are never granted here;
 * they only come from public.user_roles (see getAccessInfo).
 */
async function onUserCreated(newUser: { id: string; name: string; email: string; image: string | null }) {
  must(
    await db.from("access_requests").insert({
      user_id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      image: newUser.image,
      status: "pending",
    }),
  );
}

/**
 * Ensures a row exists in the app's `user` table for the Supabase user and returns it.
 * Existing rows are matched by email so users created before the Supabase migration
 * keep their roles and approvals.
 */
export async function syncAppUser(supabaseUser: SupabaseUser) {
  const profile = profileFromSupabaseUser(supabaseUser);

  const findUser = async () =>
    must(
      await db
        .from("user")
        .select(USER_COLUMNS)
        // Values are double-quoted so characters like "," or "." in emails can't break the filter.
        .or(`id.eq."${supabaseUser.id}",email.eq."${profile.email.replace(/["\\]/g, "")}"`)
        .limit(1)
        .maybeSingle(),
    );

  const existing = await findUser();
  if (existing) {
    return existing;
  }

  // ignoreDuplicates: if another request created the row concurrently, nothing is returned.
  const created = must(
    await db
      .from("user")
      .upsert(
        {
          id: supabaseUser.id,
          name: profile.name,
          email: profile.email,
          emailVerified: profile.emailVerified,
          image: profile.image,
        },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("id,name,email,image")
      .maybeSingle(),
  );

  if (created) {
    await onUserCreated(created);
  }

  return findUser();
}

/**
 * Returns the current authenticated session (verified with Supabase Auth),
 * or null if the request is not authenticated. Cached per request.
 */
export const getSession = cache(async (): Promise<AppSession | null> => {
  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) {
    return null;
  }

  const appUser = await syncAppUser(supabaseUser);
  if (!appUser) {
    return null;
  }

  return {
    user: {
      id: appUser.id,
      name: appUser.name,
      email: appUser.email,
      image: appUser.image,
    },
  };
});

export const APP_ROLES = ["admin", "lead", "organizer"] as const;
export type AppRole = Enums<"app_role">;

function parseRole(value: unknown): AppRole | null {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value) ? (value as AppRole) : null;
}

let warnedMissingHook = false;

export interface AccessInfo {
  session: AppSession;
  /** Role from the verified `user_role` JWT claim (Supabase RBAC). null = not approved. */
  dashboardRole: AppRole | null;
  isAdmin: boolean;
  isApproved: boolean;
}

/**
 * Returns the signed-in user's role and approval state, or null if not signed in.
 *
 * The role comes only from the `user_role` claim that the Supabase Custom Access Token Hook
 * (public.custom_access_token_hook) adds from public.user_roles. getClaims() verifies the
 * JWT signature, so the claim can't be forged. A role change applies when the user's
 * access token is next refreshed. Cached per request.
 */
export const getAccessInfo = cache(async (): Promise<AccessInfo | null> => {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (claims && !("user_role" in claims) && !warnedMissingHook) {
    warnedMissingHook = true;
    console.warn(
      "JWT has no user_role claim. Enable the Custom Access Token Hook (public.custom_access_token_hook) " +
        "in Supabase: Authentication -> Hooks.",
    );
  }

  const dashboardRole = parseRole(claims?.user_role);
  return {
    session,
    dashboardRole,
    isAdmin: dashboardRole === "admin",
    isApproved: dashboardRole !== null,
  };
});

/**
 * Assert that the current request comes from a signed-in user with an approved role.
 * Throws otherwise. Server actions must call this: the (protected) layout only guards page renders.
 */
export async function assertAuthorization(): Promise<void> {
  const access = await getAccessInfo();
  if (!access) {
    throw new Error("Unauthorized");
  }
  if (!access.isApproved) {
    throw new Error("Your access has not been approved yet");
  }
}
