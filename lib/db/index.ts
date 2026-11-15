import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "./types";

/**
 * Server-side database client (supabase-js with the secret key).
 * Lazily initialized on first property access.
 */
export const db = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export class DatabaseError extends Error {
  constructor(public readonly cause: PostgrestError) {
    super(cause.message);
    this.name = "DatabaseError";
  }
}

// The failure branch deliberately omits `data` so T is inferred from the success branch only.
type QueryResult<T> = { data: T; error: null } | { error: PostgrestError };

/** Unwraps a supabase-js result, throwing on error (like Drizzle did). */
export function must<T>(result: QueryResult<T>): T {
  if (result.error) {
    throw new DatabaseError(result.error);
  }
  return result.data;
}

/** Converts a Date (or null/undefined) to the ISO string supabase-js expects. */
export function toTimestamp(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/** Current time as an ISO timestamp. */
export function now(): string {
  return new Date().toISOString();
}

const PAGE_SIZE = 1000;

/**
 * Fetches every row of a query. Supabase caps responses at 1000 rows by
 * default, so unbounded list queries must page through results.
 * `build` must return a fresh, deterministically ordered query each call.
 */
export async function fetchAll<T>(
  build: () => { range: (from: number, to: number) => PromiseLike<QueryResult<T[]>> },
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = must(await build().range(from, from + PAGE_SIZE - 1));
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

/**
 * Splits a list into chunks. `.in()` filters are sent in the URL, so long
 * ID lists must be chunked to stay under URL length limits.
 */
export function chunk<T>(items: T[], size = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Quotes a user-supplied value for use inside a PostgREST `.or()` filter
 * string, so characters like `,` `(` `)` can't alter the filter.
 */
export function quoteFilterValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Counts rows in a table matching optional equality filters. */
export async function countRows<Table extends keyof Database["public"]["Tables"]>(
  table: Table,
  filters: Partial<Record<keyof Database["public"]["Tables"][Table]["Row"] & string, string | number | boolean>> = {},
): Promise<number> {
  let query = db.from(table).select("*", { count: "exact", head: true });
  for (const [column, value] of Object.entries(filters)) {
    // biome-ignore lint/suspicious/noExplicitAny: generic column filter
    query = query.eq(column as any, value as any);
  }
  const { count, error } = await query;
  if (error) throw new DatabaseError(error);
  return count ?? 0;
}
