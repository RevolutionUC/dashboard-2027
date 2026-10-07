"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
type Project = {
  id: string;
  status: string;
  owner_email: string;
  project_id: string | null;
  warnings: string[];
  data: {
    name: string;
    description: string;
    memberEmails: string[];
    githubMembers: string[];
    devpostUrl: string;
    githubUrl: string;
    demoUrl: string;
    categories: string[];
    disclosures: string;
  };
  review: { devpostMembers?: string[]; githubMembers?: string[]; notes?: string };
};
type Result = { rows: Project[]; projects: { id: string; name: string }[]; total: number };
const list = (text: string) =>
  text
    .split(/[\n,]+/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
export default function ProjectReviews() {
  const [data, setData] = useState<Result>();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Project>();
  const [projectId, setProjectId] = useState("");
  const [devpost, setDevpost] = useState("");
  const [github, setGithub] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (selected) document.getElementById("project-review-heading")?.focus();
  }, [selected]);
  async function load(next = page) {
    try {
      const response = await fetch(`/api/registration/projects?page=${next}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
      setPage(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load projects.");
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !selected) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/registration/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          projectId,
          devpostMembers: list(devpost),
          githubMembers: list(github),
          notes,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage("Roster review saved. This does not disqualify or assign the project.");
      setSelected(undefined);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the review.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer font-medium">Project and team roster review</summary>
      <div className="mt-4 space-y-4">
        <p>
          Compare actual team members with verified check-ins, Devpost members, and GitHub
          contributors. Investigate differences before making judging decisions.
        </p>
        <Button variant="outline" onClick={() => load()}>
          Load projects
        </Button>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        {data && (
          <>
            <p>{data.total} project submissions</p>
            {data.rows.map((p) => (
              <div key={p.id} className="space-y-2 rounded border p-3">
                <h3 className="font-medium">
                  {p.data.name} · {p.status}
                </h3>
                <p>{p.owner_email}</p>
                <ul className="list-disc pl-5">
                  {p.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelected(p);
                    setProjectId(p.project_id ?? "");
                    setDevpost(p.review.devpostMembers?.join("\n") ?? "");
                    setGithub(p.review.githubMembers?.join("\n") ?? "");
                    setNotes(p.review.notes ?? "");
                  }}
                >
                  Review roster
                </Button>
              </div>
            ))}
            <div className="flex gap-3">
              <Button variant="outline" disabled={page === 1} onClick={() => load(page - 1)}>
                Previous projects
              </Button>
              <span>Page {page}</span>
              <Button
                variant="outline"
                disabled={page * 20 >= data.total}
                onClick={() => load(page + 1)}
              >
                Next projects
              </Button>
            </div>
          </>
        )}
        {selected && data && (
          <form className="space-y-4 rounded border p-4" onSubmit={save}>
            <h3 id="project-review-heading" tabIndex={-1} className="font-semibold">
              {selected.data.name}
            </h3>
            <p className="whitespace-pre-wrap">{selected.data.description}</p>
            <p>Actual roster: {selected.data.memberEmails.join("; ")}</p>
            <p>GitHub usernames supplied: {selected.data.githubMembers.join("; ") || "None"}</p>
            <p>
              Devpost:{" "}
              <a
                className="underline"
                href={selected.data.devpostUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open project
              </a>
            </p>
            {selected.data.githubUrl && (
              <p>
                GitHub:{" "}
                <a
                  className="underline"
                  href={selected.data.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open repository
                </a>
              </p>
            )}
            {selected.data.demoUrl && (
              <p>
                Demo:{" "}
                <a
                  className="underline"
                  href={selected.data.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open demo
                </a>
              </p>
            )}
            <p>Prize categories: {selected.data.categories.join("; ") || "None"}</p>
            <p>Disclosures: {selected.data.disclosures || "None supplied"}</p>
            <label className="grid gap-1">
              Matching imported Devpost project
              <select
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="min-h-10 rounded border bg-background p-2 text-base"
              >
                <option value="">Choose a project</option>
                {data.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              Observed Devpost member emails, one per line
              <Textarea
                value={devpost}
                maxLength={6000}
                onChange={(e) => setDevpost(e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              Observed GitHub member usernames, one per line
              <Textarea
                value={github}
                maxLength={2000}
                onChange={(e) => setGithub(e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              Review notes and resolution of flagged differences
              <Textarea value={notes} maxLength={4000} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <Button disabled={busy} type="submit">
              {busy ? "Saving…" : "Save completed review"}
            </Button>
            <Button variant="outline" type="button" onClick={() => setSelected(undefined)}>
              Close roster review
            </Button>
          </form>
        )}
      </div>
    </details>
  );
}
