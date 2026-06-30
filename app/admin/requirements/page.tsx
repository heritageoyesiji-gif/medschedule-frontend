"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useActiveFacilityId } from "@/hooks/useActiveFacility";
import { useFacilityStaff } from "@/hooks/useStaff";
import { useRequirements, useReplaceRequirements } from "@/hooks/useRequirements";
import { getApiErrorMessage } from "@/lib/apiError";
import type { ShiftType, StaffRoleType } from "@/types/api";

const SHIFT_TYPES: ShiftType[] = ["day", "evening", "night"];
const SHIFT_LABELS: Record<ShiftType, string> = {
  day: "Day", evening: "Evening", night: "Night",
  D12: "D12", N12: "N12", D8: "D8", N8: "N8",
};

const ROLE_TYPES: StaffRoleType[] = ["RN", "LPN", "PSW", "LTCA", "doctor", "technician"];
const ROLE_LABELS: Record<StaffRoleType, string> = {
  RN:          "RN",
  LPN:         "LPN",
  PSW:         "CCA/PSW",
  LTCA:        "LTCA",
  doctor:      "Doctor",
  technician:  "Tech",
};

// matrix[unit][shiftType][role] = minCount
type Matrix = Record<string, Record<string, Record<StaffRoleType, number>>>;

function emptyUnitRow(): Record<string, Record<StaffRoleType, number>> {
  const shifts: Record<string, Record<StaffRoleType, number>> = {};
  for (const s of SHIFT_TYPES) {
    shifts[s] = { RN: 0, LPN: 0, PSW: 0, LTCA: 0, doctor: 0, technician: 0 };
  }
  return shifts;
}

function matrixToFlat(
  matrix: Matrix,
): Array<{ unit: string; shiftType: string; requiredRole: StaffRoleType; minCount: number }> {
  const result: Array<{ unit: string; shiftType: string; requiredRole: StaffRoleType; minCount: number }> = [];
  for (const [unit, shifts] of Object.entries(matrix)) {
    for (const [shiftType, roles] of Object.entries(shifts) as [string, Record<StaffRoleType, number>][]) {
      for (const [role, count] of Object.entries(roles) as [StaffRoleType, number][]) {
        if (count > 0) {
          result.push({ unit, shiftType, requiredRole: role, minCount: count });
        }
      }
    }
  }
  return result;
}

function PageSkeleton() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="space-y-1">
        <div className="h-7 w-52 animate-pulse rounded bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted" />
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}

export default function RequirementsPage() {
  const { user } = useAuth();
  const facilityId = useActiveFacilityId();

  const { data: staffData, isLoading: isStaffLoading } = useFacilityStaff(facilityId);
  const { data: requirementsData, isLoading: isReqLoading } = useRequirements(facilityId);
  const replaceReqs = useReplaceRequirements(facilityId);

  const [matrix, setMatrix] = useState<Matrix>({});
  const [initialized, setInitialized] = useState(false);

  // Derive unique non-empty units from staff profiles
  const staffUnits = useMemo(() => {
    if (!staffData) return [];
    return [...new Set(staffData.staff.map((s) => s.unit).filter(Boolean))].sort();
  }, [staffData]);

  // Also include units from existing requirements that may not appear in staff
  const allUnits = useMemo(() => {
    if (!requirementsData) return staffUnits;
    const reqUnits = requirementsData.requirements.map((r) => r.unit);
    return [...new Set([...staffUnits, ...reqUnits])].sort();
  }, [staffUnits, requirementsData]);

  useEffect(() => {
    if (initialized || isStaffLoading || isReqLoading) return;

    const m: Matrix = {};
    for (const unit of allUnits) {
      m[unit] = emptyUnitRow();
    }
    for (const req of requirementsData?.requirements ?? []) {
      if (!m[req.unit]) m[req.unit] = emptyUnitRow();
      m[req.unit][req.shiftType][req.requiredRole] = req.minCount;
    }
    setMatrix(m);
    setInitialized(true);
  }, [allUnits, requirementsData, isStaffLoading, isReqLoading, initialized]);

  const setCount = (unit: string, shift: string, role: StaffRoleType, value: number) => {
    setMatrix((prev) => ({
      ...prev,
      [unit]: {
        ...prev[unit],
        [shift]: {
          ...prev[unit]?.[shift],
          [role]: Math.max(0, value),
        },
      },
    }));
  };

  const handleSave = async () => {
    try {
      await replaceReqs.mutateAsync(matrixToFlat(matrix));
      toast.success("Staffing requirements saved");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save requirements"));
    }
  };

  if (isStaffLoading || isReqLoading) return <PageSkeleton />;

  const units = Object.keys(matrix);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Staffing Requirements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the minimum number of staff required per role for each shift type in each unit.
          Leave at 0 to skip enforcement.
        </p>
      </div>

      {units.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No units found. Add staff with unit assignments to configure requirements.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {units.map((unit) => (
            <div key={unit} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-5 py-3">
                <h2 className="text-sm font-semibold text-foreground">{unit}</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground w-28">
                        Shift
                      </th>
                      {ROLE_TYPES.map((role) => (
                        <th
                          key={role}
                          className="px-3 py-3 text-center text-xs font-medium text-muted-foreground min-w-[72px]"
                        >
                          {ROLE_LABELS[role]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {SHIFT_TYPES.map((shift) => (
                      <tr key={shift} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-foreground">
                          {SHIFT_LABELS[shift]}
                        </td>
                        {ROLE_TYPES.map((role) => (
                          <td key={role} className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={99}
                              value={matrix[unit]?.[shift]?.[role] ?? 0}
                              onChange={(e) =>
                                setCount(unit, shift, role, parseInt(e.target.value, 10) || 0)
                              }
                              className="w-16 rounded-md border border-border bg-background px-2 py-1.5 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                              aria-label={`${unit} ${shift} ${role} minimum count`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={replaceReqs.isPending}
              className="gap-1.5"
            >
              <Save className="size-4" />
              {replaceReqs.isPending ? "Saving…" : "Save requirements"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
