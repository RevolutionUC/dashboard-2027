"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Item = { label: string; value: number };
type AccessRequest = { need: string; count: number };
type Stats = {
  totals: { total: number; confirmed: number; universities: number };
  approved: number;
  registrationsByWeek: Item[];
  resumesUploaded: number;
  accessibility: AccessRequest[];
  dietary: Item[];
  tshirts: Item[];
  levelOfStudy: Item[];
  experience: Item[];
  origin: Item[];
  location: Item[];
  byUniversity: Item[];
  byMajor: Item[];
  graduationYears: Item[];
  interests: Item[];
  languages: Item[];
  teamStatus: Item[];
  gender: Item[];
  ethnicity: Item[];
};

const CAPACITY = 400;

const PIE_COLORS = [
  "#6c9be6",
  "#8b5cf6",
  "#14b8a6",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#2b2eed",
  "#b01e1e",
  "#f59e0b",
  "#f48484",
  "#64748b",
  "#754e13",
];

const FAKE_STATS: Stats = {
  totals: { total: 250, confirmed: 95, universities: 18 },
  approved: 120,
  registrationsByWeek: [
    { label: "Week 1", value: 20 },
    { label: "Week 2", value: 45 },
    { label: "Week 3", value: 70 },
    { label: "Week 4", value: 65 },
    { label: "Week 5", value: 50 },
  ],
  resumesUploaded: 170,
  accessibility: [
    { need: "Wheelchair-accessible space", count: 2 },
    { need: "Quiet space / sensory accommodations", count: 3 },
    { need: "Sign language interpreter", count: 1 },
    { need: "Mobility assistance", count: 2 },
    { need: "Other", count: 1 },
  ],
  levelOfStudy: [
    { label: "Freshman", value: 60 },
    { label: "Sophomore", value: 70 },
    { label: "Junior", value: 55 },
    { label: "Senior", value: 40 },
    { label: "Graduate", value: 18 },
    { label: "Other", value: 7 },
  ],
  graduationYears: [
    { label: "2026", value: 30 },
    { label: "2027", value: 70 },
    { label: "2028", value: 65 },
    { label: "2029", value: 55 },
    { label: "2030+", value: 20 },
    { label: "Already graduated", value: 10 },
  ],

  experience: [
    { label: "First-time hackers", value: 140 },
    { label: "Returning hackers", value: 110 },
  ],

  origin: [
    { label: "Domestic", value: 215 },
    { label: "International", value: 35 },
  ],

  location: [
    { label: "Ohio", value: 150 },
    { label: "Other states", value: 65 },
    { label: "Other countries", value: 35 },
  ],

  byUniversity: [
    { label: "University of Cincinnati", value: 110 },
    { label: "Ohio State", value: 45 },
    { label: "Miami University", value: 30 },
    { label: "Xavier", value: 20 },
    { label: "Other", value: 45 },
  ],

  byMajor: [
    { label: "Computer science", value: 130 },
    { label: "Engineering", value: 50 },
    { label: "IT / Information systems", value: 35 },
    { label: "Business", value: 15 },
    { label: "Other", value: 20 },
  ],

  interests: [
    { label: "AI / Machine learning", value: 130 },
    { label: "Web development", value: 115 },
    { label: "Mobile development", value: 60 },
    { label: "Cybersecurity", value: 45 },
    { label: "Data science", value: 55 },
    { label: "Hardware", value: 30 },
    { label: "Game development", value: 40 },
  ],

  languages: [
    { label: "Python", value: 190 },
    { label: "JavaScript / TypeScript", value: 140 },
    { label: "Java", value: 120 },
    { label: "C / C++", value: 85 },
    { label: "Other", value: 40 },
  ],

  teamStatus: [
    { label: "Already have a team", value: 80 },
    { label: "Looking for teammates", value: 110 },
    { label: "Working solo", value: 60 },
  ],

  gender: [
    { label: "Woman", value: 75 },
    { label: "Man", value: 150 },
    { label: "Non-binary", value: 10 },
    { label: "Other", value: 5 },
    { label: "Prefer not to say", value: 10 },
  ],

  ethnicity: [
    { label: "White", value: 45 },
    { label: "Black or African American", value: 35 },
    { label: "Hispanic or Latino/a/x", value: 30 },
    { label: "Asian", value: 75 },
    { label: "Middle Eastern or North African", value: 20 },
    { label: "American Indian or Alaska Native", value: 5 },
    { label: "Native Hawaiian or Other Pacific Islander", value: 3 },
    { label: "Multiracial", value: 10 },
    { label: "Self-describe", value: 2 },
    { label: "Prefer not to say", value: 5 },
    { label: "Other", value: 5 },
  ],

  dietary: [
    { label: "None", value: 170 },
    { label: "Vegetarian", value: 40 },
    { label: "Vegan", value: 15 },
    { label: "Halal", value: 10 },
    { label: "Kosher", value: 5 },
    { label: "Gluten-free", value: 12 },
    { label: "Other", value: 13 },
  ],

  tshirts: [
    { label: "XS", value: 10 },
    { label: "S", value: 35 },
    { label: "M", value: 80 },
    { label: "L", value: 70 },
    { label: "XL", value: 35 },
    { label: "2XL", value: 15 },
    { label: "3XL", value: 5 },
  ],
};

// ---------- Reusable pieces ----------
function EmptyNote() {
  return <p className="text-xs text-muted-foreground">No data available.</p>;
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-card-foreground">
      {title && <h3 className="mb-2 text-sm font-semibold">{title}</h3>}
      {children}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <Panel>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold leading-tight">{value}</p>
    </Panel>
  );
}

function BarList({ title, items }: { title: string; items: Item[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <Panel title={title}>
      {items.length === 0 ? (
        <EmptyNote />
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-0.5 flex justify-between text-xs">
                <span>{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
              <div className="h-1.5 rounded bg-muted">
                <div
                  className="h-1.5 rounded bg-primary"
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function ColumnChart({ title, items }: { title: string; items: Item[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <Panel title={title}>
      {items.length === 0 ? (
        <EmptyNote />
      ) : (
        <div className="flex gap-2">
          {items.map((item) => (
            <div key={item.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-medium">{item.value}</span>
              <div className="flex h-24 w-full items-end">
                <div
                  className="w-full rounded-t bg-primary"
                  style={{ height: `${(item.value / max) * 100}%` }}
                />
              </div>
              <span className="text-center text-[10px] leading-tight text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function PieCard({ title, items }: { title: string; items: Item[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  let start = 0;
  const stops = items.map((item, index) => {
    const share = total === 0 ? 0 : (item.value / total) * 100;
    const stop = `${PIE_COLORS[index % PIE_COLORS.length]} ${start}% ${start + share}%`;
    start += share;
    return stop;
  });

  return (
    <Panel title={title}>
      {total === 0 ? (
        <EmptyNote />
      ) : (
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <div
            className="h-24 w-24 shrink-0 rounded-full"
            style={{ background: `conic-gradient(${stops.join(", ")})` }}
            role="img"
            aria-label={title}
          />
          <ul className="w-full space-y-0.5 text-xs">
            {items.map((item, index) => (
              <li key={item.label} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                    }}
                  />
                  {item.label}
                </span>
                <span className="font-medium">
                  {item.value} ({Math.round((item.value / total) * 100)}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

function LineChart({ title, items }: { title: string; items: Item[] }) {
  const width = 640;
  const height = 240;
  const padX = 40;
  const padTop = 24;
  const padBottom = 36;

  const max = Math.max(1, ...items.map((item) => item.value));
  const stepX = items.length > 1 ? (width - padX * 2) / (items.length - 1) : 0;

  const points = items.map((item, index) => ({
    ...item,
    x: padX + index * stepX,
    y: padTop + (1 - item.value / max) * (height - padTop - padBottom),
  }));

  return (
    <Panel title={title}>
      {items.length === 0 ? (
        <EmptyNote />
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full text-primary"
          role="img"
          aria-label={title}
        >
          <line
            x1={padX}
            y1={height - padBottom}
            x2={width - padX}
            y2={height - padBottom}
            stroke="currentColor"
            strokeOpacity={0.2}
          />
          <polyline
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p) => (
            <g key={p.label}>
              <circle cx={p.x} cy={p.y} r={4} fill="currentColor" />
              <text
                x={p.x}
                y={p.y - 8}
                textAnchor="middle"
                fontSize={12}
                className="fill-foreground"
              >
                {p.value}
              </text>
              <text
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                fontSize={12}
                className="fill-muted-foreground"
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      )}
    </Panel>
  );
}

function ProgressCard({
  title,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  percent,
  caption,
  warning,
}: {
  title: string;
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
  percent: number;
  caption: string;
  warning?: string;
}) {
  return (
    <Panel title={title}>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{leftLabel}</p>
          <p className="text-2xl font-bold leading-tight">{leftValue}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{rightLabel}</p>
          <p className="text-2xl font-bold leading-tight">{rightValue}</p>
        </div>
      </div>
      <div className="mt-2 h-2 rounded bg-muted">
        <div className="h-2 rounded bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
      {warning && <p className="mt-1 text-xs text-red-600">{warning}</p>}
    </Panel>
  );
}

function CapacityCard({ approved }: { approved: number }) {
  const shown = Math.min(approved, CAPACITY);
  const percent = Math.round((shown / CAPACITY) * 100);

  return (
    <ProgressCard
      title="Capacity"
      leftLabel="Approved"
      leftValue={String(shown)}
      rightLabel="Spots left"
      rightValue={String(CAPACITY - shown)}
      percent={percent}
      caption={`${percent}% of ${CAPACITY} spots filled`}
      warning={
        approved > CAPACITY
          ? `Check: ${approved} approved is above the ${CAPACITY} limit. The bar is capped.`
          : undefined
      }
    />
  );
}

function ResumeCard({ uploaded, total }: { uploaded: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((uploaded / total) * 100);

  return (
    <ProgressCard
      title="Resumes"
      leftLabel="Uploaded"
      leftValue={`${percent}%`}
      rightLabel="No resume"
      rightValue={`${100 - percent}%`}
      percent={percent}
      caption={`${uploaded} of ${total} registrants uploaded a resume`}
      warning={uploaded > total ? "Check: more resumes than registrations." : undefined}
    />
  );
}

function AccessibilityCard({ requests }: { requests: AccessRequest[] }) {
  const [open, setOpen] = useState(false);
  const total = requests.reduce((sum, request) => sum + request.count, 0);

  return (
    <Panel>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="text-xs text-muted-foreground">Accessibility requests</p>
          <p className="text-2xl font-bold leading-tight">{total}</p>
        </div>
        <p className="text-xs text-muted-foreground">{open ? "Hide needs ▲" : "See needs ▼"}</p>
      </button>

      {open && (
        <ul className="mt-2 space-y-1 border-t pt-2">
          {requests.length === 0 && <EmptyNote />}
          {requests.map((request) => (
            <li key={request.need} className="flex items-start justify-between gap-3 text-xs">
              <span>{request.need}</span>
              <span className="font-medium">{request.count}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ---------- The page itself ----------
export default function StatsPage() {
  const [stats, setStats] = useState<Stats>(FAKE_STATS);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setIsRefreshing(true);
    setError(null);
    try {
      setStats(FAKE_STATS);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Registration Statistics</h1>
          <p className="text-xs text-muted-foreground">
            Placeholder data. Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "-"}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Could not load stats: {error}
        </div>
      )}

      {/* TOP/MOST IMPORTANT STATS */}
      <Section title="Registrations" note="Source: registration form (placeholder)">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <LineChart title="Registrations over time (weekly)" items={stats.registrationsByWeek} />
            <CapacityCard approved={stats.approved} />
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Total registrations" value={stats.totals.total} />
              <StatBox label="Confirmed registrations" value={stats.totals.confirmed} />
              <StatBox label="Universities represented" value={stats.totals.universities} />
            </div>
            <ResumeCard uploaded={stats.resumesUploaded} total={stats.totals.total} />
            <AccessibilityCard requests={stats.accessibility} />
          </div>
        </div>
      </Section>

      <Section title="Event logistics" note="Source: registration form (placeholder)">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <BarList title="Dietary restrictions" items={stats.dietary} />
          <ColumnChart title="T-shirt sizes" items={stats.tshirts} />
        </div>
      </Section>

      {/* BOTTOM/LESS IMPORTANT STATS */}
      <Section title="Who is coming?" note="Source: registration form (placeholder)">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          <PieCard title="Level of study" items={stats.levelOfStudy} />
          <PieCard title="First-time vs. returning" items={stats.experience} />
          <PieCard title="Domestic vs. international" items={stats.origin} />
          <PieCard title="By location" items={stats.location} />
          <PieCard title="By university" items={stats.byUniversity} />
          <PieCard title="By major" items={stats.byMajor} />
          <PieCard title="Expected graduation year" items={stats.graduationYears} />
          <PieCard title="Gender" items={stats.gender} />
          <PieCard title="Ethnicity" items={stats.ethnicity} />
        </div>
      </Section>

      <Section
        title="Skills, interests and teams"
        note="Unsure if needed. Delete this section if not."
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <BarList title="Areas of interest" items={stats.interests} />
          <BarList title="Programming languages" items={stats.languages} />
          <BarList title="Team status" items={stats.teamStatus} />
        </div>
      </Section>
    </main>
  );
}
