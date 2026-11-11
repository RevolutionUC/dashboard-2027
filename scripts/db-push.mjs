// Applies supabase/migrations to the database in DATABASE_URL (read from .env).
// Runs the Supabase CLI without a shell, so special characters in the
// password (like "!") can't be misinterpreted.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

const dbUrl = process.env.DATABASE_URL?.trim();
if (!dbUrl) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

try {
  execFileSync("npx", ["supabase", "db", "push", "--db-url", dbUrl, ...process.argv.slice(2)], {
    stdio: "inherit",
  });
} catch {
  process.exit(1);
}
