
import { db, must, quoteFilterValue } from "@/lib/db";
import { ParticipantsSearchBox } from "@/components/participants-search-box";
import { ParticipantStatusMenu } from "@/components/participant-status-menu";
import { isParticipantStatus } from "@/lib/participant-status";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 20;

function toPositiveInt(value: string | string[] | undefined, fallback: number) {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default async function Search({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const page = toPositiveInt(sp.page, 1);
  const qRaw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (qRaw ?? "").trim();
  const offset = (page - 1) * PAGE_SIZE;

  let query = db
    .from("participants")
    .select(
      "user_id,firstName:first_name,lastName:last_name,email,phone,age,gender,school,levelOfStudy:level_of_study,country,major,dietRestrictions:diet_restrictions,linkedinUrl:linkedin_url,githubUrl:github_url,resumeUrl:resume_url,shirtSize:shirt_size,hackathons,status,checkedIn:checked_in,createdAt:created_at",
      { count: "exact" },
    );

  if (q.length > 0) {
    const pattern = quoteFilterValue(`%${q}%`);
    query = query.or(`first_name.ilike.${pattern},last_name.ilike.${pattern}`);
  }

  const result = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  // Requesting a page past the end returns an error (416) rather than an empty list
  const rows = result.error?.code === "PGRST103" ? [] : must(result);
  const totalRow = result.count ?? 0;

  const total = Number(totalRow) || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const hasPrev = safePage > 1;
  const hasNext = safePage < totalPages;

  function pageHrefWithQuery(nextPage: number) {
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    if (q.length > 0) params.set("q", q);
    return `/search?${params.toString()}`;
  }

  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Participants</h1>
          <p className="text-sm text-muted-foreground">
            Showing {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, total)} of{" "}
            {total}
          </p>
        </div>

        <ParticipantsSearchBox initialQuery={q} />
      </div>
      <div className="mt-6 mb-6">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={hasPrev ? pageHrefWithQuery(safePage - 1) : "#"}
                className={!hasPrev ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>

            <PaginationItem>
              <PaginationLink isActive href={pageHrefWithQuery(safePage)}>
                {safePage}
              </PaginationLink>
            </PaginationItem>

            {safePage + 1 <= totalPages ? (
              <PaginationItem>
                <PaginationLink href={pageHrefWithQuery(safePage + 1)}>
                  {safePage + 1}
                </PaginationLink>
              </PaginationItem>
            ) : null}

            <PaginationItem>
              <PaginationNext
                href={hasNext ? pageHrefWithQuery(safePage + 1) : "#"}
                className={!hasNext ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
      {/* Responsive list with dropdown details (mobile + web) */}
      <div className="grid gap-3 md:grid-cols-2">
        {rows.length === 0 ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground md:col-span-2">
            No participants found.
          </div>
        ) : (
          rows.map((p) => (
            <details key={p.user_id} className="group overflow-hidden rounded-lg border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                  <div className="mt-1 hidden truncate text-xs text-muted-foreground sm:block">
                    {p.phone} · {p.school}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {(p.checkedIn ? "Checked in" : "Not checked in") + " ·"}
                  </span>
                  <ParticipantStatusMenu
                    participantId={p.user_id}
                    currentStatus={isParticipantStatus(p.status) ? p.status : "REGISTERED"}
                  />
                </div>
              </summary>

              <div className="border-t px-4 py-3 text-sm">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Phone</div>
                    <div className="wrap-break-word">{p.phone}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">School</div>
                    <div className="wrap-break-word">{p.school}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Age</div>
                    <div>{p.age}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Gender</div>
                    <div className="wrap-break-word">{p.gender}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Level</div>
                    <div className="wrap-break-word">{p.levelOfStudy}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Major</div>
                    <div className="wrap-break-word">{p.major}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Country</div>
                    <div className="wrap-break-word">{p.country}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Shirt size</div>
                    <div className="wrap-break-word">{p.shirtSize}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Diet restrictions</div>
                    <div className="wrap-break-word">{p.dietRestrictions ?? "-"}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs text-muted-foreground">Hackathons</div>
                    <div className="wrap-break-word">{p.hackathons}</div>
                  </div>
                  <div className="grid gap-2 sm:col-span-2 sm:grid-cols-3">
                    <div>
                      <div className="text-xs text-muted-foreground">LinkedIn</div>
                      {p.linkedinUrl ? (
                        <a className="break-all underline" href={p.linkedinUrl}>
                          {p.linkedinUrl}
                        </a>
                      ) : (
                        <div>-</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">GitHub</div>
                      {p.githubUrl ? (
                        <a className="break-all underline" href={p.githubUrl}>
                          {p.githubUrl}
                        </a>
                      ) : (
                        <div>-</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Resume</div>
                      {p.resumeUrl ? (
                        <a className="break-all underline" href={p.resumeUrl}>
                          {p.resumeUrl}
                        </a>
                      ) : (
                        <div>-</div>
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs text-muted-foreground">Created</div>
                    <div>{p.createdAt ? new Date(p.createdAt).toLocaleString() : "-"}</div>
                  </div>
                </div>
              </div>
            </details>
          ))
        )}
      </div>
    </main>
  );
}
