"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StaffHeader } from "@/components/shared/StaffHeader";
import { StaffNav } from "@/components/staff/StaffNav";
import { getRoleRedirectPath, useAuth } from "@/hooks/useAuth";
import { useStaffProfile, useUpdateAvailability } from "@/hooks/useStaff";
import { getApiErrorMessage } from "@/lib/apiError";
import type { ShiftType } from "@/types/api";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type Day = (typeof DAYS)[number];

const DAY_LABELS: Record<Day, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const SHIFT_TYPES: ShiftType[] = ["day", "evening", "night"];
const SHIFT_LABELS: Record<ShiftType, string> = {
  day: "Day",
  evening: "Evening",
  night: "Night",
};

function normalizeAvailability(
  raw: Record<string, ShiftType[]>,
): Record<string, ShiftType[]> {
  const normalized: Record<string, ShiftType[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 border-b border-border bg-card" />
      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <div className="flex-1 h-9 animate-pulse rounded-md bg-muted" />
          <div className="flex-1 h-9 animate-pulse rounded-md bg-muted" />
          <div className="flex-1 h-9 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="mb-6 space-y-2">
          <div className="h-6 w-28 animate-pulse rounded bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 md:p-6 space-y-3">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </main>
    </div>
  );
}

export default function AvailabilityPage() {
  const router = useRouter();
  const { user, role, isLoading: isAuthLoading } = useAuth();

  const { data: profile, isLoading: isProfileLoading } = useStaffProfile(
    user?.userId ?? null,
  );

  const updateAvailability = useUpdateAvailability(user?.userId ?? null);

  const [availability, setAvailability] = useState<Record<string, ShiftType[]>>(
    {},
  );
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    if (role === "admin") {
      router.replace(getRoleRedirectPath("admin"));
    }
  }, [isAuthLoading, user, role, router]);

  useEffect(() => {
    if (profile && !initialized) {
      setAvailability(normalizeAvailability(profile.availability ?? {}));
      setInitialized(true);
    }
  }, [profile, initialized]);

  if (isAuthLoading || !user || role === "admin") {
    return <PageSkeleton />;
  }

  const toggleShift = (day: string, shift: ShiftType) => {
    setAvailability((prev) => {
      const current = prev[day] ?? [];
      const updated = current.includes(shift)
        ? current.filter((s) => s !== shift)
        : [...current, shift];
      return { ...prev, [day]: updated };
    });
  };

  const handleSave = async () => {
    try {
      await updateAvailability.mutateAsync(availability);
      toast.success("Availability updated");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update availability"));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <StaffHeader user={user} />

      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <StaffNav />

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Availability</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set which days and shift types you&apos;re available to work.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 md:p-6">
          {isProfileLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="grid grid-cols-4 gap-3 px-2 pb-2 border-b border-border mb-1">
                <div />
                {SHIFT_TYPES.map((type) => (
                  <p
                    key={type}
                    className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {SHIFT_LABELS[type]}
                  </p>
                ))}
              </div>

              {/* Day rows */}
              <div className="divide-y divide-border">
                {DAYS.map((day) => {
                  const dayShifts = availability[day] ?? [];
                  return (
                    <div
                      key={day}
                      className="grid grid-cols-4 gap-3 items-center px-2 py-3"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {DAY_LABELS[day]}
                      </span>
                      {SHIFT_TYPES.map((shift) => (
                        <div key={shift} className="flex justify-center">
                          <input
                            type="checkbox"
                            id={`${day}-${shift}`}
                            checked={dayShifts.includes(shift)}
                            onChange={() => toggleShift(day, shift)}
                            className="size-4 accent-primary cursor-pointer"
                            aria-label={`${DAY_LABELS[day]} ${SHIFT_LABELS[shift]} shift`}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end border-t border-border pt-4">
                <Button
                  onClick={handleSave}
                  disabled={updateAvailability.isPending}
                  className="gap-1.5"
                >
                  <Save className="size-4" />
                  {updateAvailability.isPending ? "Saving…" : "Save availability"}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
