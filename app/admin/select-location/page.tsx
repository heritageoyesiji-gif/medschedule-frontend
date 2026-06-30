"use client";

import { useRouter } from "next/navigation";
import { Building2, ChevronRight, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { setStoredFacilityId, useMyFacilities } from "@/hooks/useActiveFacility";
import type { FacilitySummary } from "@/types/api";

function FacilityCard({
  facility,
  onSelect,
}: {
  facility: FacilitySummary;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(facility.facilityId)}
      className="group w-full rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-accent hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{facility.name}</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span>{facility.address}</span>
            </div>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-accent transition-colors mt-1" />
      </div>
    </button>
  );
}

export default function SelectLocationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: facilities = [], isLoading } = useMyFacilities();

  const handleSelect = (facilityId: string) => {
    setStoredFacilityId(facilityId);
    router.push("/admin");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent/10">
            <Building2 className="size-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Select a Location</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome back, {user?.firstName}. Choose which facility you are working in today.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : facilities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No facilities found. Set up your first facility to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {facilities.map((facility) => (
              <FacilityCard
                key={facility.facilityId}
                facility={facility}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
