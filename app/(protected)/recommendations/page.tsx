import { DashboardActions } from "@/components/dashboard/dashboard-actions";

export default function RecommendationsPage() {
  return (
    <main className="p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Suggestions & Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Submit suggestions, review recommendations, and track action items.
        </p>
      </div>

      <DashboardActions />
    </main>
  );
}