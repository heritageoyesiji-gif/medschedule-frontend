"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthNavigator } from "@/components/schedule/MonthNavigator";
import { ShiftCalendar } from "@/components/schedule/ShiftCalendar";
import { ShiftCard } from "@/components/schedule/ShiftCard";
import { AnnouncementsPanel } from "@/components/shared/AnnouncementsPanel";
import { StaffHeader } from "@/components/shared/StaffHeader";
import { QrAccessCard } from "@/components/staff/QrAccessCard";
import { StaffNav } from "@/components/staff/StaffNav";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { getRoleRedirectPath, useAuth } from "@/hooks/useAuth";
import { useStaffShifts } from "@/hooks/useShifts";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  getCurrentMonth,
  getUpcomingShifts,
  shiftMonth,
} from "@/lib/schedule";
import type { Shift } from "@/types/api";

function ShiftCardSkeleton() {
  return (
    <div className="status-card p-4" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="h-3 w-44 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-3 w-14 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-2 h-3 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-1" aria-hidden="true">
      <div className="grid grid-cols-7 gap-1 pb-1">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-3 animate-pulse rounded bg-muted/70" />
        ))}
      </div>
      {Array.from({ length: 5 }, (_, row) => (
        <div key={row} className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, col) => (
            <div key={col} className="h-20 animate-pulse rounded-md bg-muted/50" />
          ))}
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="size-8 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {/* Nav tabs skeleton */}
        <div className="mb-6 flex gap-4 border-b border-border pb-1">
          <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          <div className="h-8 w-20 animate-pulse rounded bg-muted" />
        </div>

        {/* Month navigator skeleton */}
        <div className="mb-6 flex items-center gap-3">
          <div className="size-8 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="size-8 animate-pulse rounded-lg bg-muted" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 animate-pulse rounded-lg bg-muted" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                      <div className="h-6 w-12 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Calendar */}
            <div className="rounded-xl border border-border bg-card p-4">
              <CalendarSkeleton />
            </div>
          </div>

          {/* Aside */}
          <aside className="space-y-8">
            <section>
              <div className="mb-4 h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="space-y-3">
                <ShiftCardSkeleton />
                <ShiftCardSkeleton />
                <ShiftCardSkeleton />
              </div>
            </section>
            <section>
              <div className="mb-4 h-4 w-28 animate-pulse rounded bg-muted" />
              <ul className="space-y-3" aria-hidden="true">
                {[1, 2].map((i) => (
                  <li key={i} className="status-card p-4">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="mt-2.5 space-y-1.5">
                      <div className="h-3 w-full animate-pulse rounded bg-muted" />
                      <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

export function StaffDashboard() {
  const router = useRouter();
  const { user, role, isLoading: isAuthLoading } = useAuth();
  const [month, setMonth] = useState(getCurrentMonth);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const {
    data: schedule,
    isLoading: isScheduleLoading,
    isError: isScheduleError,
    error: scheduleError,
    refetch: refetchSchedule,
  } = useStaffShifts(user?.userId ?? null, month);

  const {
    data: announcementsData,
    isLoading: isAnnouncementsLoading,
    isError: isAnnouncementsError,
    refetch: refetchAnnouncements,
  } = useAnnouncements(user?.facilityId ?? null);

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
    return <DashboardSkeleton />;
  }

  const shifts = schedule?.shifts ?? [];
  const upcomingShifts = getUpcomingShifts(shifts);

  return (
    <div className="min-h-screen bg-background">
      <StaffHeader user={user} />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <StaffNav />
        <div className="mb-6">
          <MonthNavigator
            month={month}
            onPrevious={() => setMonth((current) => shiftMonth(current, -1))}
            onNext={() => setMonth((current) => shiftMonth(current, 1))}
            onToday={() => setMonth(getCurrentMonth())}
          />
        </div>

        {isScheduleLoading ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 animate-pulse rounded-lg bg-muted" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                        <div className="h-6 w-12 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <CalendarSkeleton />
              </div>
            </div>
            <aside className="space-y-8">
              <section>
                <div className="mb-4 h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="space-y-3">
                  <ShiftCardSkeleton />
                  <ShiftCardSkeleton />
                  <ShiftCardSkeleton />
                </div>
              </section>
            </aside>
          </div>
        ) : isScheduleError ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {getApiErrorMessage(scheduleError, "Failed to load your schedule")}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => void refetchSchedule()}
            >
              Try again
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                      <CalendarDays className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Shifts this month
                      </p>
                      <p className="text-2xl font-semibold text-foreground">
                        {schedule?.totalShifts ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                      <Clock className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Hours scheduled
                      </p>
                      <p className="text-2xl font-semibold text-foreground">
                        {schedule?.totalHours ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <ShiftCalendar
                shifts={shifts}
                month={month}
                onShiftClick={setSelectedShift}
              />

              {selectedShift ? (
                <div>
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                    Selected shift
                  </h3>
                  <ShiftCard shift={selectedShift} />
                </div>
              ) : null}

              {shifts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                  <p className="font-medium text-foreground">
                    No shifts scheduled
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your schedule for this month hasn&apos;t been published yet.
                  </p>
                </div>
              ) : null}
            </div>

            <aside className="space-y-8">
              <section>
                <h3 className="mb-4 text-sm font-medium text-foreground">
                  Upcoming shifts
                </h3>
                {upcomingShifts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No upcoming shifts this month.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {upcomingShifts.map((shift) => (
                      <li key={shift.shiftId}>
                        <ShiftCard
                          shift={shift}
                          onClick={() => setSelectedShift(shift)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="mb-4 text-sm font-medium text-foreground">
                  Announcements
                </h3>
                <AnnouncementsPanel
                  announcements={announcementsData?.announcements ?? []}
                  isLoading={isAnnouncementsLoading}
                  isError={isAnnouncementsError}
                  onRetry={() => void refetchAnnouncements()}
                />
              </section>

              <QrAccessCard enabled />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
