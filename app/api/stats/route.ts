import { NextResponse } from "next/server";
import { db, fetchAll } from "@/lib/db";
import { requireNonOrganizerSession } from "@/lib/api/route-utils";

export const dynamic = "force-dynamic";

type Item = { label: string; value: number };

const COLUMNS =
  "status,created_at,school,major,gender,level_of_study,country,shirt_size,hackathons,diet_restrictions,race_ethnicity,resume_url";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
const US_NAMES = new Set(["us", "usa", "u.s.", "u.s.a.", "united states", "united states of america"]);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function tally(values: (string | null | undefined)[], top = 6): Item[] {
  const counts = new Map<string, Item>();
  for (const raw of values) {
    const label = raw?.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    const existing = counts.get(key);
    if (existing) existing.value += 1;
    else counts.set(key, { label, value: 1 });
  }

  const sorted = [...counts.values()].sort((a, b) => b.value - a.value);
  if (sorted.length <= top) return sorted;

  const other = sorted.slice(top).reduce((sum, item) => sum + item.value, 0);
  return [...sorted.slice(0, top), { label: "Other", value: other }];
}

function sizeRank(label: string): number {
  const index = SIZE_ORDER.indexOf(label.toUpperCase());
  return index === -1 ? SIZE_ORDER.length : index;
}

function dietItems(raw: string | null): string[] {
  const text = raw?.trim() ?? "";
  if (!text || /^(none|no|n\/a|na|nope)$/i.test(text)) return ["None"];
  return text
    .split(/[,;/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function byWeek(dates: string[]): Item[] {
  const times = dates.map((d) => new Date(d).getTime()).filter((t) => Number.isFinite(t));
  if (times.length === 0) return [];

  const start = times.reduce((min, t) => Math.min(min, t), Infinity);
  const end = times.reduce((max, t) => Math.max(max, t), -Infinity);
  const counts = Array.from({ length: Math.floor((end - start) / WEEK_MS) + 1 }, () => 0);
  for (const t of times) counts[Math.floor((t - start) / WEEK_MS)] += 1;

  return counts.map((value, index) => ({
    label: new Date(start + index * WEEK_MS).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "America/New_York",
    }),
    value,
  }));
}

export async function GET() {
  // Admins and leads only (same check the events routes use)
  const auth = await requireNonOrganizerSession();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    // READ ONLY: this file only ever calls .select(). Never add insert, update, delete or upsert here.
    const rows = await fetchAll(() =>
      db.from("participants").select(COLUMNS).order("user_id"),
    );

    const total = rows.length;
    const waitlisted = rows.filter((r) => r.status === "WAITLISTED").length;
    const confirmed = rows.filter((r) => r.status === "CONFIRMED" || r.status === "CHECKED_IN").length;

    let firstTime = 0;
    let returning = 0;
    let notGiven = 0;
    for (const r of rows) {
      const text = (r.hackathons ?? "").trim();
      const count = Number.parseInt(text, 10);
      if (!Number.isNaN(count)) {
        if (count === 0) firstTime += 1;
        else returning += 1;
      } else if (/^(no|none|zero|never)/i.test(text)) {
        firstTime += 1;
      } else {
        notGiven += 1;
      }
    }

    const domestic = rows.filter((r) => US_NAMES.has(r.country.trim().toLowerCase())).length;

    // Only counts and groups leave this file. No names, emails or other personal details.
    return NextResponse.json({
      totals: {
        total,
        confirmed,
        universities: new Set(rows.map((r) => r.school.trim().toLowerCase()).filter(Boolean)).size,
      },
      approved: total - waitlisted,
      registrationsByWeek: byWeek(rows.map((r) => r.created_at)),
      resumesUploaded: rows.filter((r) => r.resume_url).length,
      accessibility: [],
      dietary: tally(rows.flatMap((r) => dietItems(r.diet_restrictions)), 7),
      tshirts: tally(rows.map((r) => r.shirt_size), 20).sort(
        (a, b) => sizeRank(a.label) - sizeRank(b.label),
      ),
      levelOfStudy: tally(rows.map((r) => r.level_of_study), 7),
      experience: [
        { label: "First-time hackers", value: firstTime },
        { label: "Returning hackers", value: returning },
        ...(notGiven > 0 ? [{ label: "Not specified", value: notGiven }] : []),
      ],
      origin: [
        { label: "Domestic", value: domestic },
        { label: "International", value: total - domestic },
      ],
      location: [],
      byUniversity: tally(rows.map((r) => r.school), 5),
      byMajor: tally(rows.map((r) => r.major), 5),
      graduationYears: [],
      interests: [],
      languages: [],
      teamStatus: [],
      gender: tally(rows.map((r) => r.gender), 6),
      ethnicity: tally(rows.flatMap((r) => r.race_ethnicity ?? []), 10),
    });
  } catch (err: unknown) {
    console.error("GET /api/stats failed:", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
