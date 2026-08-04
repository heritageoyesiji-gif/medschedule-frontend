"use client";

import { useMemo } from "react";
import { getPeriodDays, sumHoursByStaff } from "@/lib/biweekly";
import { getShiftColor, getShiftTypeLabel } from "@/lib/schedule";
import { getUnitColor } from "@/lib/units";
import { getEmploymentLabel, getRoleColors, getRoleLabel, ROLE_ORDER } from "@/lib/roles";
import type {
  OvertimeConfig,
  Shift,
  ShiftTypeConfig,
  StaffProfile,
  TimeOffRequest,
} from "@/types/api";

type DragPayload =
  | { kind: "shift"; shiftId: string }
  | { kind: "staff"; staffId: string };

type PreviewShift = {
  staffId: string;
  date: string;
  type: string;
  unit: string;
  startTime: string;
  endTime: string;
};

type Props = {
  staff: StaffProfile[];
  shifts: Shift[];
  /** AI-generated preview shifts, not yet saved. Rendered as grey, non-interactive chips. */
  previewShifts?: PreviewShift[];
  periodStart: string;
  overtimeConfig: OvertimeConfig[];
  timeOff: TimeOffRequest[];
  selectedUnit: string;
  configs: ShiftTypeConfig[];
  dragOverCell: string | null;
  setDragOverCell: (key: string | null) => void;
  onCellClick: (staffId: string, date: string) => void;
  onShiftClick: (shift: Shift) => void;
  onShiftDrop: (shift: Shift, toStaffId: string, toDate: string) => void;
  onStaffDrop: (staffId: string, date: string) => void;
  onStaffNameClick: (staff: StaffProfile) => void;
};

const todayStr = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};

// "07:00" -> "7a", "19:30" -> "7:30p"
function compactTime(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const ampm = h < 12 ? "a" : "p";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${mStr}` : ""}${ampm}`;
}

function cellKey(staffId: string, date: string) {
  return `${staffId}|${date}`;
}

export function BiweeklyGrid({
  staff,
  shifts,
  previewShifts = [],
  periodStart,
  overtimeConfig,
  timeOff,
  selectedUnit,
  configs,
  dragOverCell,
  setDragOverCell,
  onCellClick,
  onShiftClick,
  onShiftDrop,
  onStaffDrop,
  onStaffNameClick,
}: Props) {
  const days = useMemo(() => getPeriodDays(periodStart), [periodStart]);
  const today = todayStr();

  const sortedStaff = useMemo(
    () =>
      [...staff].sort((a, b) => {
        const ra = ROLE_ORDER.indexOf(a.roleType);
        const rb = ROLE_ORDER.indexOf(b.roleType);
        const oa = ra < 0 ? 99 : ra;
        const ob = rb < 0 ? 99 : rb;
        if (oa !== ob) return oa - ob;
        return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`);
      }),
    [staff],
  );

  // Cells show unit-filtered shifts; totals count ALL of a person's period hours
  // (overtime is a per-person property, independent of the unit filter).
  const visibleShifts = useMemo(
    () => (selectedUnit === "all" ? shifts : shifts.filter((s) => s.unit === selectedUnit)),
    [shifts, selectedUnit],
  );

  const shiftsByCell = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of visibleShifts) {
      if (!s.staff?.userId) continue;
      const k = cellKey(s.staff.userId, s.date);
      const arr = map.get(k);
      if (arr) arr.push(s);
      else map.set(k, [s]);
    }
    return map;
  }, [visibleShifts]);

  const previewByCell = useMemo(() => {
    const map = new Map<string, PreviewShift[]>();
    const filtered =
      selectedUnit === "all" ? previewShifts : previewShifts.filter((s) => s.unit === selectedUnit);
    for (const s of filtered) {
      const k = cellKey(s.staffId, s.date);
      const arr = map.get(k);
      if (arr) arr.push(s);
      else map.set(k, [s]);
    }
    return map;
  }, [previewShifts, selectedUnit]);

  const totals = useMemo(() => sumHoursByStaff(shifts), [shifts]);

  const thresholdByType = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const c of overtimeConfig) m.set(c.employmentType, c.biweeklyHours);
    return m;
  }, [overtimeConfig]);

  // (staffId|date) covered by an approved time-off request.
  const offCells = useMemo(() => {
    const set = new Set<string>();
    const periodDays = getPeriodDays(periodStart);
    for (const req of timeOff) {
      if (req.status !== "approved" || !req.staff?.userId) continue;
      for (const d of periodDays) {
        if (d >= req.startDate && d <= req.endDate) set.add(cellKey(req.staff.userId, d));
      }
    }
    return set;
  }, [timeOff, periodStart]);

  const readPayload = (e: React.DragEvent): DragPayload | null => {
    try {
      return JSON.parse(e.dataTransfer.getData("text/plain")) as DragPayload;
    } catch {
      return null;
    }
  };

  const handleDrop = (e: React.DragEvent, staffId: string, date: string) => {
    e.preventDefault();
    setDragOverCell(null);
    const payload = readPayload(e);
    if (!payload) return;
    if (payload.kind === "staff") {
      onStaffDrop(payload.staffId, date);
    } else {
      const shift = shifts.find((s) => s.shiftId === payload.shiftId);
      if (shift) onShiftDrop(shift, staffId, date);
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="sticky left-0 z-20 bg-card px-3 py-2.5 text-left font-semibold text-muted-foreground min-w-50 border-r border-border">
              Staff
            </th>
            {days.map((d) => {
              const dt = new Date(`${d}T00:00:00Z`);
              const dow = dt.getUTCDay();
              const isWeekend = dow === 0 || dow === 6;
              const isToday = d === today;
              return (
                <th
                  key={d}
                  className={`px-1.5 py-2.5 text-center font-semibold min-w-21 ${
                    isWeekend ? "bg-muted/40" : ""
                  } ${isToday ? "text-accent" : "text-muted-foreground"}`}
                >
                  <div className="text-[11px] uppercase tracking-wide">
                    {dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
                  </div>
                  <div className="text-xs font-bold text-foreground">
                    {dt.getUTCMonth() + 1}/{dt.getUTCDate()}
                  </div>
                </th>
              );
            })}
            <th className="px-2 py-2.5 text-center font-semibold text-muted-foreground min-w-21 border-l border-border">
              Hours
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sortedStaff.map((member) => {
            const roleColors = getRoleColors(member.roleType);
            const total = totals[member.userId] ?? 0;
            const threshold = thresholdByType.get(member.employmentType) ?? null;
            let totalClass = "text-foreground";
            if (threshold !== null) {
              if (total > threshold) totalClass = "bg-red-100 text-red-800 font-bold";
              else if (total >= threshold * 0.9) totalClass = "bg-amber-100 text-amber-800 font-bold";
            }
            return (
              <tr key={member.userId} className="hover:bg-muted/20">
                <th className="sticky left-0 z-10 bg-card px-3 py-2.5 text-left align-top min-w-50 border-r border-border">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onStaffNameClick(member)}
                      className="text-sm font-semibold text-foreground truncate hover:text-accent hover:underline underline-offset-2"
                      title={`View details for ${member.firstName} ${member.lastName}`}
                    >
                      {member.firstName} {member.lastName}
                    </button>
                    <span
                      className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${roleColors.bg} ${roleColors.text} ${roleColors.border}`}
                    >
                      {getRoleLabel(member.roleType)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: getUnitColor(member.unit) }}
                      />
                      {member.unit || "No unit"}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="truncate">{getEmploymentLabel(member.employmentType)}</span>
                  </div>
                  {member.phone?.trim() && (
                    <div className="text-[11px] text-muted-foreground truncate">{member.phone}</div>
                  )}
                </th>

                {days.map((d) => {
                  const key = cellKey(member.userId, d);
                  const cellShifts = shiftsByCell.get(key) ?? [];
                  const cellPreview = previewByCell.get(key) ?? [];
                  const isOff = offCells.has(key);
                  const isDragOver = dragOverCell === key;
                  return (
                    <td
                      key={d}
                      className={`p-0.5 align-top ${isDragOver ? "bg-accent/15 outline outline-2 outline-accent" : ""}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverCell !== key) setDragOverCell(key);
                      }}
                      onDragLeave={() => {
                        if (dragOverCell === key) setDragOverCell(null);
                      }}
                      onDrop={(e) => handleDrop(e, member.userId, d)}
                    >
                      <div className="flex flex-col gap-0.5">
                        {cellShifts.map((s) => {
                          const unitColor = getUnitColor(s.unit);
                          const typeColor = getShiftColor(s.type);
                          return (
                            <button
                              key={s.shiftId}
                              type="button"
                              draggable
                              onDragStart={(e) =>
                                e.dataTransfer.setData(
                                  "text/plain",
                                  JSON.stringify({ kind: "shift", shiftId: s.shiftId } satisfies DragPayload),
                                )
                              }
                              onClick={() => onShiftClick(s)}
                              title={`${s.unit} · ${getShiftTypeLabel(s.type, configs)} · ${s.startTime}–${s.endTime}`}
                              className="w-full rounded px-1 py-1 text-left text-[11px] font-semibold text-white leading-tight cursor-grab active:cursor-grabbing"
                              style={{ backgroundColor: unitColor, borderLeft: `4px solid ${typeColor}` }}
                            >
                              <span className="block truncate">{s.unit}</span>
                              <span className="block truncate opacity-90">
                                {compactTime(s.startTime)}–{compactTime(s.endTime)}
                              </span>
                            </button>
                          );
                        })}
                        {cellPreview.map((s, idx) => (
                          <div
                            key={`preview-${idx}`}
                            title={`[AI preview — not yet saved] ${s.unit} · ${s.startTime}–${s.endTime}`}
                            className="w-full rounded px-1 py-1 text-left text-[11px] font-semibold text-white leading-tight opacity-70 border border-dashed border-white/60"
                            style={{ backgroundColor: "#9CA3AF" }}
                          >
                            <span className="block truncate">AI · {s.unit}</span>
                            <span className="block truncate opacity-90">
                              {compactTime(s.startTime)}–{compactTime(s.endTime)}
                            </span>
                          </div>
                        ))}
                        {cellShifts.length === 0 && cellPreview.length === 0 && (
                          <button
                            type="button"
                            onClick={() => onCellClick(member.userId, d)}
                            aria-label={`Add shift for ${member.firstName} ${member.lastName} on ${d}`}
                            className={`group flex h-11 w-full items-center justify-center rounded ${
                              isOff ? "bg-muted/60" : "hover:bg-accent/10"
                            }`}
                          >
                            {isOff ? (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Off
                              </span>
                            ) : (
                              <span className="text-base leading-none text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                                +
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}

                <td className="border-l border-border p-1 text-center align-middle">
                  <span className={`inline-block rounded px-2 py-1 text-xs ${totalClass}`}>
                    {total}
                    {threshold !== null && (
                      <span className="text-muted-foreground font-normal"> / {threshold}</span>
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
