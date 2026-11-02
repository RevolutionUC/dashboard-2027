"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardActions } from "@/components/dashboard/dashboard-actions";

interface DashboardStats {
  total: number;
  confirmed: number;
  waitlisted: number;
  checkedIn: number;
}

const POLL_INTERVAL = 5000; // 5 seconds

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
      console.error("Error fetching dashboard stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch immediately on mount
    fetchStats();

    // Set up polling interval
    const interval = setInterval(fetchStats, POLL_INTERVAL);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  const display = {
    total: stats?.total ?? 0,
    confirmed: stats?.confirmed ?? 0,
    waitlisted: stats?.waitlisted ?? 0,
    checkedIn: stats?.checkedIn ?? 0,
    isPlaceholder: !stats && !isLoading,
  };

  return (
    <main className="p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Participants overview {display.isPlaceholder ? "(placeholder data)" : ""}
          {isLoading && !stats && " (loading...)"}
          {error && ` (error: ${error})`}
        </p>
      </div>
      <DashboardActions />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card">
        <Card>
          <CardHeader>
            <CardTitle>Total participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{display.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{display.confirmed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waitlisted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{display.waitlisted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checked in</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{display.checkedIn}</div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
