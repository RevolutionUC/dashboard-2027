import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { getSupabaseEnv } from "./env";

let client: SupabaseClient<Database> | undefined;

/**
 * Server-only Supabase client using the secret key. It bypasses row-level
 * security, so it must never be imported into client components. Every
 * caller is responsible for checking the user's permissions first.
 * Created on first use so builds don't require the secret key.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!client) {
    const { url } = getSupabaseEnv();
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("SUPABASE_SECRET_KEY environment variable is required");
    }
    client = createClient<Database>(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
