"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ProjectReviews from "./project-reviews";
const kinds = [
  "interest",
  "hacker",
  "judge-mentor",
  "sponsor",
  "volunteer",
  "speaker",
  "sponsor-representative",
];
const statuses = [
  "INTEREST",
  "RECEIVED",
  "REGISTERED",
  "CONFIRMED",
  "WAITLISTED",
  "CHECKED_IN",
  "APPROVED",
  "ASSIGNED",
  "DECLINED",
  "WITHDRAWN",
];
type Answer = string | number | boolean | string[];
type Application = {
  id: string;
  kind: string;
  email: string;
  data: Record<string, Answer>;
  status: string;
  email_verified_at: string | null;
  participant_id: string | null;
  assignment: string | null;
  internal_notes: string | null;
  follow_up_at: string | null;
  has_resume: boolean;
  checked_in_at: string | null;
};
type Slot = { id: string; label: string; roles: string[] };
type Event = {
  registration_open: boolean;
  capacity: number | null;
  starts_at: string | null;
  ends_at: string | null;
  confirmation_deadline: string | null;
  timezone: string;
  slots: Slot[];
  details: Record<string, string | boolean | string[] | number>;
};
type Overview = {
  rows: Application[];
  total: number;
  event: Event;
  categories: { id: string; name: string }[];
  sponsors: { id: string; name: string }[];
  notifications: { state: string; count: number }[];
  summary: { kind: string; status: string; count: number }[];
};
const selectClass =
  "min-h-10 rounded-md border bg-background px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-ring";
const formatName = (key: string) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (x) => x.toUpperCase());
function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export default function RegistrationPanel() {
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [overview, setOverview] = useState<Overview>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const [selected, setSelected] = useState<Application>();
  const [categoryId, setCategoryId] = useState("");
  const [sponsorId, setSponsorId] = useState("");
  const [notes, setNotes] = useState("");
  const [assignment, setAssignment] = useState("");
  const [followUp, setFollowUp] = useState("");
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(
        `/api/registration?kind=${encodeURIComponent(kind)}&status=${status}&page=${page}`,
        { signal },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setOverview(data);
    },
    [kind, status, page],
  );
  useEffect(() => {
    const controller = new AbortController();
    reload(controller.signal).catch((e) => {
      if (e.name !== "AbortError") setError(e.message);
    });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => {
    setNotes(selected?.internal_notes ?? "");
    setAssignment(selected?.assignment ?? "");
    setFollowUp(localDate(selected?.follow_up_at ?? null));
    setCategoryId("");
    setSponsorId("");
  }, [selected]);
  useEffect(() => {
    if (selected) document.getElementById("application-heading")?.focus();
  }, [selected]);
  async function review(action: string) {
    if (!selected || guard.current) return;
    if (action === "decline" && !window.confirm("Decline this application?")) return;
    guard.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/registration/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          categoryId,
          sponsorId,
          notes,
          assignment,
          followUpAt: followUp ? new Date(followUp).toISOString() : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await reload();
      setMessage("Saved. Any notification is queued for delivery.");
      setSelected(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this change.");
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="min-w-0 [contain:inline-size_layout] space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">2027 registration</h1>
        <p className="text-muted-foreground">
          Applications, attendance, availability, and organizer follow-ups.
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded border border-destructive p-3 text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded border p-3">
          {message}
        </p>
      )}
      {!overview ? (
        <p role="status">Loading applications…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {overview.notifications.map((n) => (
              <span key={n.state} className="rounded border px-3 py-2">
                Emails {n.state}: {n.count}
              </span>
            ))}
          </div>
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">Counts by form and status</summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {overview.summary.map((s) => (
                <span key={`${s.kind}-${s.status}`} className="rounded bg-muted px-3 py-2">
                  {s.kind}: {s.status.toLowerCase().replaceAll("_", " ")} ({s.count})
                </span>
              ))}
            </div>
          </details>
          <EventEditor
            initial={overview.event}
            saved={async () => {
              await reload();
              setMessage("2027 event settings saved.");
            }}
          />
          <ProjectReviews />
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1">
              Form
              <select
                className={selectClass}
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value);
                  setPage(1);
                  setSelected(undefined);
                }}
              >
                <option value="">All forms</option>
                {kinds.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              Status
              <select
                className={selectClass}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                  setSelected(undefined);
                }}
              >
                <option value="">All statuses</option>
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <Button variant="outline" onClick={() => reload().catch((e) => setError(e.message))}>
              Refresh
            </Button>
            {["mlh", "logistics", "roles"].map((mode) => (
              <a
                key={mode}
                className="rounded border px-3 py-2 underline"
                href={`/api/registration/export?mode=${mode}`}
              >
                Export {mode}
              </a>
            ))}
          </div>
          <p>{overview.total} matching applications</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">2027 applications</caption>
              <thead>
                <tr className="border-b">
                  {["Applicant", "Form", "Status", "Email verified", "Assignment", "Review"].map(
                    (h) => (
                      <th key={h} scope="col" className="p-3">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {overview.rows.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="p-3">
                      <p>
                        {String(
                          s.data.fullName ??
                            s.data.contactName ??
                            `${s.data.firstName ?? ""} ${s.data.lastName ?? ""}`,
                        )}
                      </p>
                      <p className="text-muted-foreground">{s.email}</p>
                    </td>
                    <td className="p-3">{s.kind}</td>
                    <td className="p-3">{s.status}</td>
                    <td className="p-3">{s.email_verified_at ? "Yes" : "Pending"}</td>
                    <td className="p-3">
                      {s.assignment ?? "Unassigned"}
                      {s.follow_up_at && (
                        <p>Follow up {new Date(s.follow_up_at).toLocaleString()}</p>
                      )}
                    </td>
                    <td className="p-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelected(s);
                          setError("");
                        }}
                      >
                        Review<span className="sr-only"> {s.email}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!overview.rows.length && <p>No applications match these filters.</p>}
          <div className="flex items-center gap-3">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span>Page {page}</span>
            <Button
              variant="outline"
              disabled={page * 20 >= overview.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
          {selected && (
            <section
              aria-labelledby="application-heading"
              className="space-y-4 rounded-lg border p-4"
            >
              <div className="flex justify-between gap-3">
                <h2 tabIndex={-1} id="application-heading" className="text-xl font-medium">
                  {selected.email}
                </h2>
                <Button variant="outline" onClick={() => setSelected(undefined)}>
                  Close review
                </Button>
              </div>
              <p>
                {selected.kind} · {selected.status} ·{" "}
                {selected.email_verified_at ? "Email verified" : "Email verification pending"}
              </p>
              <dl className="grid gap-3 sm:grid-cols-2">
                {Object.entries(selected.data)
                  .filter(([, v]) => v !== "" && v !== undefined)
                  .map(([k, v]) => (
                    <div key={k} className="min-w-0">
                      <dt className="font-medium">{formatName(k)}</dt>
                      <dd className="break-words whitespace-pre-wrap text-muted-foreground">
                        {typeof v === "boolean"
                          ? v
                            ? "Yes"
                            : "No"
                          : Array.isArray(v)
                            ? v.join("; ")
                            : String(v)}
                      </dd>
                    </div>
                  ))}
              </dl>
              {selected.checked_in_at && (
                <p>Role check-in: {new Date(selected.checked_in_at).toLocaleString()}</p>
              )}
              <p>Resume uploaded: {selected.has_resume ? "Yes" : "No"}</p>
              <label className="grid gap-1">
                Organizer / shift assignment
                <Input
                  value={assignment}
                  maxLength={4000}
                  onChange={(e) => setAssignment(e.target.value)}
                />
              </label>
              <label className="grid gap-1">
                Private review notes
                <Textarea
                  value={notes}
                  maxLength={4000}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
              <label className="grid gap-1">
                Follow-up time (your local timezone)
                <Input
                  type="datetime-local"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                />
              </label>
              {selected.kind === "judge-mentor" &&
                Array.isArray(selected.data.roles) &&
                selected.data.roles.includes("Judge") && (
                  <label className="grid gap-1">
                    Judge category
                    <select
                      className={selectClass}
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      <option value="">Choose a category</option>
                      {overview.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              {selected.kind === "sponsor-representative" && (
                <label className="grid gap-1">
                  Approved sponsor company
                  <select
                    className={selectClass}
                    value={sponsorId}
                    onChange={(e) => setSponsorId(e.target.value)}
                  >
                    <option value="">Choose a company</option>
                    {overview.sponsors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy} onClick={() => review("notes")}>
                  Save notes
                </Button>
                {!["hacker", "interest"].includes(selected.kind) && (
                  <>
                    <Button disabled={busy} onClick={() => review("approve")}>
                      Approve
                    </Button>
                    <Button disabled={busy} variant="outline" onClick={() => review("assign")}>
                      Assign
                    </Button>
                    <Button
                      disabled={busy || Boolean(selected.checked_in_at)}
                      variant="outline"
                      onClick={() => review("check-in-role")}
                    >
                      Check in role applicant
                    </Button>
                    <Button disabled={busy} variant="destructive" onClick={() => review("decline")}>
                      Decline
                    </Button>
                  </>
                )}
                {selected.kind === "hacker" && selected.status === "WAITLISTED" && (
                  <Button disabled={busy} onClick={() => review("offer")}>
                    Offer available place
                  </Button>
                )}
                {selected.kind === "hacker" && !selected.participant_id && (
                  <Button
                    disabled={busy}
                    variant="outline"
                    onClick={() => review("link-participant")}
                  >
                    Link existing participant
                  </Button>
                )}
                <Button disabled={busy} variant="outline" onClick={() => review("remind")}>
                  Send reminder
                </Button>
                <Button disabled={busy} variant="outline" onClick={() => review("retry-email")}>
                  Retry failed emails
                </Button>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
function EventEditor({ initial, saved }: { initial: Event; saved: () => Promise<void> }) {
  const [event, setEvent] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const guard = useRef(false);
  useEffect(() => {
    if (!dirty) setEvent(initial);
  }, [initial, dirty]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(key: keyof Event, value: Event[keyof Event]) {
    setEvent((p) => ({ ...p, [key]: value }));
    setDirty(true);
  }
  function detail(key: string, value: string | boolean | string[] | number) {
    change("details", { ...event.details, [key]: value });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/registration/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationOpen: event.registration_open,
          capacity: event.capacity,
          startsAt: event.starts_at,
          endsAt: event.ends_at,
          confirmationDeadline: event.confirmation_deadline,
          timezone: event.timezone,
          slots: event.slots,
          details: event.details,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDirty(false);
      await saved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings.");
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer font-medium">
        2027 event settings · Registration {initial.registration_open ? "open" : "closed"}
      </summary>
      <form onSubmit={submit} className="mt-4 grid gap-4">
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={event.details.mlhPartnerConfirmed === true}
            onChange={(e) => detail("mlhPartnerConfirmed", e.target.checked)}
          />
          MLH partnership confirmed for 2027 (enables MLH export)
        </label>
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={event.registration_open}
            onChange={(e) => change("registration_open", e.target.checked)}
          />
          Open hacker registration
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            Attendance capacity
            <Input
              type="number"
              min={1}
              max={100000}
              value={event.capacity ?? ""}
              onChange={(e) => change("capacity", e.target.value ? Number(e.target.value) : null)}
            />
          </label>
          <label className="grid gap-1">
            Display timezone
            <Input
              required
              value={event.timezone}
              onChange={(e) => change("timezone", e.target.value)}
            />
          </label>
          {(
            [
              ["starts_at", "Event starts"],
              ["ends_at", "Event ends"],
              ["confirmation_deadline", "Confirmation deadline"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="grid gap-1">
              {label} (your local timezone)
              <Input
                type="datetime-local"
                value={localDate(event[key])}
                onChange={(e) =>
                  change(key, e.target.value ? new Date(e.target.value).toISOString() : null)
                }
              />
            </label>
          ))}
        </div>
        <fieldset className="space-y-3">
          <legend className="font-medium">Availability slots</legend>
          <p className="text-sm text-muted-foreground">
            Include the date and time in each label. Displayed with the timezone above.
          </p>
          {event.slots.map((slot, i) => (
            <div key={i} className="grid gap-2 rounded border p-3">
              <label>
                Slot ID
                <Input
                  value={slot.id}
                  maxLength={80}
                  onChange={(e) =>
                    change(
                      "slots",
                      event.slots.map((s, j) => (j === i ? { ...s, id: e.target.value } : s)),
                    )
                  }
                />
              </label>
              <label>
                Date and time label
                <Input
                  value={slot.label}
                  maxLength={300}
                  onChange={(e) =>
                    change(
                      "slots",
                      event.slots.map((s, j) => (j === i ? { ...s, label: e.target.value } : s)),
                    )
                  }
                />
              </label>
              <div className="flex flex-wrap gap-3">
                {["Judge", "Mentor", "Other", "volunteer", "speaker", "sponsor-representative"].map(
                  (role) => (
                    <label key={role} className="flex gap-2">
                      <input
                        type="checkbox"
                        checked={slot.roles.includes(role)}
                        onChange={(e) =>
                          change(
                            "slots",
                            event.slots.map((s, j) =>
                              j === i
                                ? {
                                    ...s,
                                    roles: e.target.checked
                                      ? [...s.roles, role]
                                      : s.roles.filter((r) => r !== role),
                                  }
                                : s,
                            ),
                          )
                        }
                      />
                      {role}
                    </label>
                  ),
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  change(
                    "slots",
                    event.slots.filter((_, j) => j !== i),
                  )
                }
              >
                Remove slot
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              change("slots", [
                ...event.slots,
                { id: `shift-${crypto.randomUUID().slice(0, 8)}`, label: "", roles: [] },
              ])
            }
          >
            Add slot
          </Button>
        </fieldset>
        {(
          [
            ["accessibilityContact", "Accommodation contact"],
            ["waiverUrl", "Approved waiver link"],
            ["venue", "Event venue"],
            ["scheduleUrl", "Schedule link"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="grid gap-1">
            {label}
            <Input
              value={String(event.details[key] ?? "")}
              maxLength={4000}
              onChange={(e) => detail(key, e.target.value)}
            />
          </label>
        ))}
        {(
          [
            ["privacyNotice", "Privacy notice"],
            ["retentionNotice", "Retention notice"],
            ["expensePolicy", "Travel / expense policy"],
            ["mediaNotice", "Optional media permission wording"],
            ["checkInInfo", "Check-in instructions"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="grid gap-1">
            {label}
            <Textarea
              value={String(event.details[key] ?? "")}
              maxLength={4000}
              onChange={(e) => detail(key, e.target.value)}
            />
          </label>
        ))}
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={event.details.emergencyContact === true}
            onChange={(e) => detail("emergencyContact", e.target.checked)}
          />
          Collect optional emergency contact
        </label>
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={event.details.travelQuestions === true}
            onChange={(e) => detail("travelQuestions", e.target.checked)}
          />
          Collect optional travel needs
        </label>
        <fieldset>
          <legend>Available shirt sizes (leave empty for the full size list)</legend>
          <div className="flex flex-wrap gap-3">
            {["XS", "S", "M", "L", "XL", "2XL", "3XL"].map((size) => (
              <label key={size} className="flex gap-2">
                <input
                  type="checkbox"
                  checked={
                    Array.isArray(event.details.shirtSizes) &&
                    event.details.shirtSizes.includes(size)
                  }
                  onChange={(e) =>
                    detail(
                      "shirtSizes",
                      e.target.checked
                        ? [
                            ...(Array.isArray(event.details.shirtSizes)
                              ? event.details.shirtSizes
                              : []),
                            size,
                          ]
                        : (Array.isArray(event.details.shirtSizes)
                            ? event.details.shirtSizes
                            : []
                          ).filter((s) => s !== size),
                    )
                  }
                />
                {size}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="font-medium">Project submissions later in the event</legend>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={event.details.projectSubmissionOpen === true}
              onChange={(e) => detail("projectSubmissionOpen", e.target.checked)}
            />
            Open submissions for checked-in hackers
          </label>
          <label className="grid gap-1">
            Approved maximum team size
            <Input
              type="number"
              min={1}
              max={20}
              value={String(event.details.maxTeamSize ?? "")}
              onChange={(e) => {
                if (e.target.value) detail("maxTeamSize", Number(e.target.value));
                else {
                  const details = { ...event.details };
                  delete details.maxTeamSize;
                  change("details", details);
                }
              }}
            />
          </label>
          <label className="grid gap-1">
            Approved project rules and required disclosures
            <Textarea
              maxLength={4000}
              value={String(event.details.projectRules ?? "")}
              onChange={(e) => detail("projectRules", e.target.value)}
            />
          </label>
        </fieldset>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save event settings"}
        </Button>
      </form>
    </details>
  );
}
