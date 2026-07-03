"use client";

import { useState } from "react";
import { Building2, Users, CalendarDays, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSuperStats, useSuperFacilities, useDeactivateFacility, useReactivateFacility } from "@/hooks/useSuper";
import { ChangePasswordForm } from "@/components/shared/ChangePasswordForm";
import type { SuperFacility } from "@/types/api";

function StatCard({ label, value, icon: Icon }: { label: string; value: number | undefined; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-3xl font-bold text-foreground">
        {value === undefined ? <span className="text-muted-foreground text-xl">—</span> : value.toLocaleString()}
      </p>
    </div>
  );
}

function FacilityRow({ facility }: { facility: SuperFacility }) {
  const [expanded, setExpanded] = useState(false);
  const deactivate = useDeactivateFacility();
  const reactivate = useReactivateFacility();

  const handleDeactivate = async () => {
    try {
      await deactivate.mutateAsync(facility.facilityId);
      toast.success(`${facility.name} deactivated`);
    } catch {
      toast.error("Failed to deactivate facility");
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivate.mutateAsync(facility.facilityId);
      toast.success(`${facility.name} reactivated`);
    } catch {
      toast.error("Failed to reactivate facility");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{facility.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{facility.facilityId}</p>
          </div>
        </div>
        <div className="flex items-center gap-6 ml-4 shrink-0">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-foreground">{facility.staffCount}</p>
            <p className="text-xs text-muted-foreground">staff</p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-sm text-foreground truncate max-w-[180px]">{facility.adminName}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{facility.adminEmail}</p>
          </div>
          {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 bg-muted/20 space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-muted-foreground">Address</p>
              <p className="text-foreground">{facility.address || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Contact email</p>
              <p className="text-foreground">{facility.contactEmail || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Contact phone</p>
              <p className="text-foreground">{facility.contactPhone || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="text-foreground">
                {new Date(facility.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeactivate}
              disabled={deactivate.isPending}
            >
              Deactivate all users
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReactivate}
              disabled={reactivate.isPending}
            >
              Reactivate all users
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuperDashboard() {
  const stats = useSuperStats();
  const facilities = useSuperFacilities();

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">All facilities and users across MedSchedule</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Facilities" value={stats.data?.facilityCount} icon={Building2} />
        <StatCard label="Users" value={stats.data?.userCount} icon={Users} />
        <StatCard label="Staff profiles" value={stats.data?.staffCount} icon={Activity} />
        <StatCard label="Total shifts" value={stats.data?.shiftCount} icon={CalendarDays} />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Facilities{" "}
          {facilities.data && (
            <span className="text-sm font-normal text-muted-foreground">({facilities.data.total})</span>
          )}
        </h2>

        {facilities.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : facilities.data?.facilities.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Building2 className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No facilities yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {facilities.data?.facilities.map((f) => (
              <FacilityRow key={f.facilityId} facility={f} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Account</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
