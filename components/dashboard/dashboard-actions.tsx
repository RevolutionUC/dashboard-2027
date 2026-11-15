"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isTeam, TEAMS, teamLabel, type Team } from "@/lib/dashboard/team";


type DashboardRole = "admin" | "lead" | "organizer";

interface ActionItem {
  id: string;
  title: string;
  team: Team | null;
  forTeam: Team | null;
  details: string | null;
  status: string;
  creatorName: string | null;
  sourceSuggestionId: string | null;
}

interface Suggestion {
  id: string;
  content: string;
  team: Team | null;
  forTeam: Team | null;
  status: string;
  submitterName: string | null;
}

interface TeamSelectFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: Team | null;
  onChange: (value: Team | null) => void;
  required?: boolean;
}

function TeamSelectField({
  id,
  label,
  placeholder,
  value,
  onChange,
  required = false,
}: TeamSelectFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value ?? undefined}
        onValueChange={(selectedTeam) =>
          onChange(isTeam(selectedTeam) ? selectedTeam : null)
        }
        required={required}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {TEAMS.map((team) => (
            <SelectItem key={team} value={team}>
              {teamLabel(team)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

async function getError(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  return typeof data?.error === "string" ? data.error : fallback;
}

export function DashboardActions() {
  const [role, setRole] = useState<DashboardRole | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [suggestionText, setSuggestionText] = useState("");
  const [actionTeam, setActionTeam] = useState<Team | null>(null);
  const [actionForTeam, setActionForTeam] = useState<Team | null>(null);
  const [suggestionTeam, setSuggestionTeam] = useState<Team | null>(null);
  const [suggestionForTeam, setSuggestionForTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isManager = role === "admin" || role === "lead";

  async function loadLists(manager: boolean) {
    const actionsResponse = await fetch("/api/dashboard/actions");
    if (!actionsResponse.ok) {
      throw new Error(await getError(actionsResponse, "Could not load action items"));
    }
    const actionsData: { items: ActionItem[] } = await actionsResponse.json();
    setActionItems(actionsData.items);

    if (manager) {
      const suggestionsResponse = await fetch("/api/dashboard/suggestions");
      if (!suggestionsResponse.ok) {
        throw new Error(await getError(suggestionsResponse, "Could not load suggestions"));
      }
      const suggestionsData: { items: Suggestion[] } =
        await suggestionsResponse.json();
      setSuggestions(suggestionsData.items);
    }
  }

  useEffect(() => {
    async function loadDashboard() {
      try {
        const roleResponse = await fetch("/api/user/role");
        if (!roleResponse.ok) {
          throw new Error("Could not load your dashboard role");
        }

        const roleData: { dashboardRole: string } = await roleResponse.json();
        const currentRole: DashboardRole | null =
          roleData.dashboardRole === "admin" ||
          roleData.dashboardRole === "lead" ||
          roleData.dashboardRole === "organizer"
            ? roleData.dashboardRole
            : null;

        setRole(currentRole);
        await loadLists(
          currentRole === "admin" || currentRole === "lead",
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load dashboard items");
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  async function submitActionItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isTeam(actionTeam)) {
      setError("Choose your team.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/dashboard/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          details,
          team: actionTeam,
          forTeam: actionForTeam,
        }),
      });
      if (!response.ok) {
        throw new Error(await getError(response, "Could not create action item"));
      }

      setTitle("");
      setDetails("");
      setActionTeam(null);
      setActionForTeam(null);
      await loadLists(true);
      setMessage("Action item created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create action item");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitSuggestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isTeam(suggestionTeam)) {
      setError("Choose your team.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/dashboard/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: suggestionText,
          team: suggestionTeam,
          forTeam: suggestionForTeam,
        }),
      });
      if (!response.ok) {
        throw new Error(await getError(response, "Could not submit suggestion"));
      }

      setSuggestionText("");
      setSuggestionTeam(null);
      setSuggestionForTeam(null);
      setMessage("Suggestion submitted.");
      if (isManager) await loadLists(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit suggestion");
    } finally {
      setIsSaving(false);
    }
  }

  async function reviewSuggestion(
    suggestionId: string,
    decision: "accept" | "dismiss",
  ) {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/dashboard/suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId, decision }),
      });
      if (!response.ok) {
        throw new Error(await getError(response, "Could not review suggestion"));
      }

      await loadLists(true);
      setMessage(decision === "accept" ? "Suggestion accepted." : "Suggestion dismissed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not review suggestion");
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading action items...</p>;
  }

  return (
    <section className="mb-6 space-y-6" aria-labelledby="needs-attention-heading">
      <div>
        <h2 id="needs-attention-heading" className="mb-3 text-lg font-semibold">
          Needs attention
        </h2>

        {isManager && (
          <form onSubmit={submitActionItem} className="mb-4 space-y-3">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Action item title"
              maxLength={200}
              required
            />
            
            <TeamSelectField
              id="action-item-team"
              label="Your team"
              placeholder="Choose your team"
              value={actionTeam}
              onChange={setActionTeam}
              required
            />

            <TeamSelectField
              id="action-item-for-team"
              label="For team (optional)"
              placeholder="No specific team"
              value={actionForTeam}
              onChange={setActionForTeam}
            />

            <Textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Details (optional)"
              maxLength={2000}
            />

            <Button type="submit" disabled={isSaving}>
              Add action item
            </Button>
          </form>
        )}

        {actionItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No action items yet.</p>
        ) : (
          <div className="space-y-3">
            {actionItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {item.details && <p>{item.details}</p>}
                  <p className="text-sm text-muted-foreground">
                    Team: {item.team ? teamLabel(item.team) : "Not recorded"}
                    {item.forTeam && ` · For: ${teamLabel(item.forTeam)}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status: {item.status}
                    {item.creatorName && ` · Created by ${item.creatorName}`}
                    {item.sourceSuggestionId && " · From an accepted suggestion"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Suggestions</h2>
        <form onSubmit={submitSuggestion} className="mb-4 space-y-3">
          <Textarea
            value={suggestionText}
            onChange={(event) => setSuggestionText(event.target.value)}
            placeholder="Share a suggestion"
            maxLength={2000}
            required
          />

          <TeamSelectField
            id="suggestion-team"
            label="Your team"
            placeholder="Choose your team"
            value={suggestionTeam}
            onChange={setSuggestionTeam}
            required
          />

          <TeamSelectField
            id="suggestion-for-team"
            label="For team (optional)"
            placeholder="No specific team"
            value={suggestionForTeam}
            onChange={setSuggestionForTeam}
          />

          <Button type="submit" disabled={isSaving}>
            Submit suggestion
          </Button>
        </form>

        {isManager && (
          suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suggestions to review.</p>
          ) : (
            <div className="space-y-3">
              {suggestions
                .filter((suggestion) => suggestion.status === "pending")
                .map((suggestion) => (
                  <Card key={suggestion.id}>
                    <CardContent className="space-y-3 pt-6">
                      <p>{suggestion.content}</p>
                      <p className="text-sm text-muted-foreground">
                        Team: {suggestion.team ? teamLabel(suggestion.team) : "Not recorded"}
                        {suggestion.forTeam && ` · For: ${teamLabel(suggestion.forTeam)}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.submitterName
                          ? `Submitted by ${suggestion.submitterName}`
                          : "Submitter unavailable"}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => reviewSuggestion(suggestion.id, "accept")}
                        >
                          Accept
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => reviewSuggestion(suggestion.id, "dismiss")}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )
        )}
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}