"use server";

import { logAction } from "@/lib/audit";
import { syncAppUser } from "@/lib/auth";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthActionResult = { error?: string; message?: string; redirectTo?: string };

function safeRedirect(path: unknown, fallback = "/dashboard") {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

export async function signInWithPassword(formData: FormData): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirect(formData.get("callbackUrl"));

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: error?.message ?? "Sign in failed." };
  }

  const appUser = await syncAppUser(data.user);
  if (appUser) {
    await logAction({
      userId: appUser.id,
      name: appUser.name,
      email: appUser.email,
      action: "SIGNED_IN",
    });
  }

  return { redirectTo };
}

export async function signUpWithPassword(formData: FormData): Promise<AuthActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { error: "Name, email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${origin}/auth/confirm?next=/pending-approval`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Email confirmation enabled: no session until the user clicks the link.
  if (!data.session || !data.user) {
    return { message: "Check your email to confirm your account. An admin will then review your request." };
  }

  // Confirmation disabled: signed in immediately. Creates the pending access request and notifies admins.
  await syncAppUser(data.user);
  return { redirectTo: "/pending-approval" };
}

/**
 * Refreshes the session so the JWT picks up a role an admin just granted
 * (the user_role claim is only set when a token is issued). Returns whether the user is now approved.
 */
export async function refreshAccess(): Promise<{ approved: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) {
    return { approved: false };
  }
  const { data: claimsData } = await supabase.auth.getClaims();
  return { approved: typeof claimsData?.claims?.user_role === "string" };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
