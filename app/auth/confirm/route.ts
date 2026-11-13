import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { syncAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Handles Supabase email confirmation links (both PKCE `code` and `token_hash` styles).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  const supabase = await createClient();

  let error: unknown = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else {
    error = new Error("Missing confirmation parameters");
  }

  if (error) {
    return NextResponse.redirect(`${origin}/error`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await syncAppUser(user);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
