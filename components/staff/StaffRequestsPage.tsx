"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StaffHeader } from "@/components/shared/StaffHeader";
import { StaffNav } from "@/components/staff/StaffNav";
import { SwapRequestForm } from "@/components/staff/SwapRequestForm";
import { TimeOffRequestForm } from "@/components/staff/TimeOffRequestForm";
import { TimeOffRequestsList } from "@/components/staff/TimeOffRequestsList";
import { getRoleRedirectPath, useAuth } from "@/hooks/useAuth";
import { useStaffTimeOffRequests } from "@/hooks/useRequests";
import { useStaffShifts } from "@/hooks/useShifts";
import { getCurrentMonth } from "@/lib/schedule";

type RequestsTab = "time-off" | "swap";

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* StaffHeader shape */}
      <div className="h-16 border-b border-border bg-card" />
      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
        {/* StaffNav shape */}
        <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <div className="flex-1 h-9 animate-pulse rounded-md bg-muted" />
          <div className="flex-1 h-9 animate-pulse rounded-md bg-muted" />
          <div className="flex-1 h-9 animate-pulse rounded-md bg-muted" />
        </div>
        {/* Heading */}
        <div className="mb-6 space-y-2">
          <div className="h-6 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
        {/* Tab switcher */}
        <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <div className="flex-1 h-9 animate-pulse rounded-md bg-muted" />
          <div className="flex-1 h-9 animate-pulse rounded-md bg-muted" />
        </div>
        {/* Form card */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4 md:p-6">
          <div className="space-y-1">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-64 animate-pulse rounded bg-muted" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-8 animate-pulse rounded-md bg-muted" />
            </div>
          ))}
          <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
        </div>
      </main>
    </div>
  );
}

export function StaffRequestsPage() {
  const router = useRouter();
  const { user, role, isLoading: isAuthLoading } = useAuth();
  const [tab, setTab] = useState<RequestsTab>("time-off");
  const month = getCurrentMonth();

  const { data: schedule } = useStaffShifts(user?.userId ?? null, month);
  const {
    data: timeOffData,
    isLoading: isTimeOffLoading,
    isError: isTimeOffError,
    refetch: refetchTimeOff,
  } = useStaffTimeOffRequests(user?.userId ?? null);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    if (role === "admin") {
      router.replace(getRoleRedirectPath("admin"));
    }
  }, [isAuthLoading, user, role, router]);

  if (isAuthLoading || !user || role === "admin") {
    return <PageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <StaffHeader user={user} />

      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <StaffNav />

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit time-off or shift swap requests for admin review.
          </p>
        </div>

        <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setTab("time-off")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
              tab === "time-off"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Time off
          </button>
          <button
            type="button"
            onClick={() => setTab("swap")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
              tab === "swap"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Shift swap
          </button>
        </div>

        {tab === "time-off" ? (
          <div className="space-y-8">
            <TimeOffRequestForm
              staffId={user.userId}
              onSuccess={() => void refetchTimeOff()}
            />
            <section>
              <h2 className="mb-4 text-sm font-medium text-foreground">
                Your requests
              </h2>
              <TimeOffRequestsList
                requests={timeOffData?.requests ?? []}
                isLoading={isTimeOffLoading}
                isError={isTimeOffError}
                onRetry={() => void refetchTimeOff()}
              />
            </section>
          </div>
        ) : (
          <SwapRequestForm user={user} myShifts={schedule?.shifts ?? []} />
        )}
      </main>
    </div>
  );
}
