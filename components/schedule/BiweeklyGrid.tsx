"use client";

import { useMemo } from "react";
import { GripVertical } from "lucide-react";
import { getPeriodDays, sumHoursByStaff } from "@/lib/biweekly";
import { getShiftColor, getShiftTypeLabel } from "@/lib/schedule";
import { getUnitColor } from "@/lib/units";
import { getRoleColors, getRoleLabel, ROLE_ORDER } from "@/lib/roles";
import { getGridOffLabel } from "@/lib/leaveTypes";
import type {
  LeaveType,
  OvertimeConfig,
  Shift,
  ShiftTypeConfig,
  StaffProfile,
  TimeOffRequest,
} from "@/types/api";

type DragPayload =
  | { kind: "shift"; shiftId: string }
  | { kind: "staff"; staffId: string }
  | { kind: "reorder"; staffId: string };

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
  /** Persist a manual drag-to-reorder — called with the full new order (staff userIds) for the currently-displayed list. */
  onReorderStaff: (orderedStaffIds: string[]) => void;
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
  onReorderStaff,
}: Props) {
  const days = useMemo(() => getPeriodDays(periodStart), [periodStart]);
  const today = todayStr();

  // Primary sort: role group (mainly matters for the Casual tab, which mixes
  // staff across roles — everywhere else, staff arrives already
  // role-filtered so this is a no-op). Within a role, sort by the persisted
  // manual sortOrder (drag-to-reorder), falling back to name for staff that
  // share the same order (e.g. everyone still at the default before any
  // manual reordering has happened).
  const sortedStaff = useMemo(
    () =>
      [...staff].sort((a, b) => {
        const ra = ROLE_ORDER.indexOf(a.roleType);
        const rb = ROLE_ORDER.indexOf(b.roleType);
        const oa = ra < 0 ? 99 : ra;
        const ob = rb < 0 ? 99 : rb;
        if (oa !== ob) return oa - ob;
        const soa = a.sortOrder ?? 0;
        const sob = b.sortOrder ?? 0;
        if (soa !== sob) return soa - sob;
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

  // (staffId|date) -> the leave type on the approved time-off request
  // covering that day, or "off" as a fallback for older requests recorded
  // before leaveType existed. Shows the actual type (Sick/Vacation/Lieu)
  // in the cell instead of a generic "OFF".
  const offCells = useMemo(() => {
    const map = new Map<string, string>();
    const periodDays = getPeriodDays(periodStart);
    for (const req of timeOff) {
      if (req.status !== "approved" || !req.staff?.userId) continue;
      for (const d of periodDays) {
        if (d >= req.startDate && d <= req.endDate) {
          map.set(cellKey(req.staff.userId, d), req.leaveType ?? "off");
        }
      }
    }
    return map;
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
    } else if (payload.kind === "shift") {
      const shift = shifts.find((s) => s.shiftId === payload.shiftId);
      if (shift) onShiftDrop(shift, staffId, date);
    }
  };

  // Dropping a dragged staff row onto another row reorders them — the
  // dragged person is inserted right before whoever they were dropped on.
  // Sends the FULL new order for the currently-displayed list; the backend
  // only updates sortOrder for the staffIds it's given, so this can't
  // disturb anyone in a different role tab.
  const handleReorderDrop = (e: React.DragEvent, targetStaffId: string) => {
    e.preventDefault();
    setDragOverCell(null);
    const payload = readPayload(e);
    if (!payload || payload.kind !== "reorder") return;
    if (payload.staffId === targetStaffId) return;
    const ids = sortedStaff.map((s) => s.userId);
    const fromIndex = ids.indexOf(payload.staffId);
    const toIndex = ids.indexOf(targetStaffId);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...ids];
    next.splice(fromIndex, 1);
    next.splice(next.indexOf(targetStaffId), 0, payload.staffId);
    onReorderStaff(next);
  };

  const formatDayHeader = (d: string) => {
    const dt = new Date(`${d}T00:00:00Z`);
    return {
      weekday: dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      md: `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}`,
      isWeekend: dt.getUTCDay() === 0 || dt.getUTCDay() === 6,
    };
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="sticky left-0 z-20 bg-card px-2 py-2 text-left font-semibold text-muted-foreground min-w-36 border-r border-border">
              Staff
            </th>
            {days.map((d, i) => {
              const { weekday, md, isWeekend } = formatDayHeader(d);
              const isToday = d === today;
              // Faint divider between week 1 (days 0-6) and week 2 (7-13) so
              // the two weeks are still visually distinguishable in one row.
              const isWeekBoundary = i === 7;
              return (
                <th
                  key={d}
                  className={`px-0.5 py-2 text-center font-semibold min-w-14 border-l border-border ${
                    isWeekend ? "bg-muted/40" : ""
                  } ${isToday ? "text-accent" : "text-muted-foreground"} ${
                    isWeekBoundary ? "border-l-2 border-l-foreground/20" : ""
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wide">{weekday}</div>
                  <div className="text-[11px] font-bold text-foreground">{md}</div>
                </th>
              );
            })}
            <th className="px-1.5 py-2 text-center font-semibold text-muted-foreground min-w-14 border-l border-border">
              Hrs
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sortedStaff.map((member, rowIndex) => {
            const roleColors = getRoleColors(member.roleType);
            const total = totals[member.userId] ?? 0;
            const threshold = thresholdByType.get(member.employmentType) ?? null;
            let totalClass = "text-foreground";
            if (threshold !== null) {
              if (total > threshold) totalClass = "bg-red-100 text-red-800 font-bold";
              else if (total >= threshold * 0.9) totalClass = "bg-amber-100 text-amber-800 font-bold";
            }
            // Alternating row shading. The sticky staff cell needs the same
            // background applied explicitly (its own bg-card would otherwise
            // override the row's stripe, since sticky cells paint themselves).
            const rowBg = rowIndex % 2 === 1 ? "bg-muted/25" : "bg-card";
            return (
              <tr key={member.userId} className={`${rowBg} hover:bg-accent/10`}>
                <th
                  className={`sticky left-0 z-10 ${rowBg} px-1 py-1.5 text-left align-middle min-w-36 border-r border-border ${
                    dragOverCell === `reorder|${member.userId}` ? "bg-accent/15 outline outline-2 outline-accent" : ""
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    const key = `reorder|${member.userId}`;
                    if (dragOverCell !== key) setDragOverCell(key);
                  }}
                  onDragLeave={() => {
                    if (dragOverCell === `reorder|${member.userId}`) setDragOverCell(null);
                  }}
                  onDrop={(e) => handleReorderDrop(e, member.userId)}
                >
                  <div className="flex items-start gap-0.5">
                    <span
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData(
                          "text/plain",
                          JSON.stringify({ kind: "reorder", staffId: member.userId } satisfies DragPayload),
                        )
                      }
                      title="Drag to reorder"
                      className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground"
                    >
                      <GripVertical className="size-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onStaffNameClick(member)}
                        className="text-xs font-semibold text-foreground truncate hover:text-accent hover:underline underline-offset-2 block max-w-full"
                        title={`View details for ${member.firstName} ${member.lastName}`}
                      >
                        {member.firstName} {member.lastName}
                      </button>
                      <span
                        className={`inline-block mt-0.5 text-[9px] font-semibold px-1 py-0 rounded border ${roleColors.bg} ${roleColors.text} ${roleColors.border}`}
                      >
                        {getRoleLabel(member.roleType)}
                      </span>
                    </div>
                  </div>
                </th>

                {days.map((d, i) => {
                  const key = cellKey(member.userId, d);
                  const cellShifts = shiftsByCell.get(key) ?? [];
                  const cellPreview = previewByCell.get(key) ?? [];
                  const leaveType = offCells.get(key);
                  const isOff = leaveType !== undefined;
                  const isDragOver = dragOverCell === key;
                  const isWeekBoundary = i === 7;
                  return (
                    <td
                      key={d}
                      className={`p-0.5 align-top border-l border-border ${isDragOver ? "bg-accent/15 outline outline-2 outline-accent" : ""} ${
                        isWeekBoundary ? "border-l-2 border-l-foreground/20" : ""
                      }`}
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
                              className="w-full rounded-md px-1.5 py-1.5 text-center text-[11px] font-bold text-white leading-tight cursor-grab active:cursor-grabbing truncate shadow-sm transition-all hover:shadow-md hover:brightness-110 hover:-translate-y-px active:translate-y-0 active:shadow-sm"
                              style={{ backgroundColor: unitColor, borderLeft: `5px solid ${typeColor}` }}
                            >
                              {compactTime(s.startTime)}–{compactTime(s.endTime)}
                            </button>
                          );
                        })}
                        {cellPreview.map((s, idx) => (
                          <div
                            key={`preview-${idx}`}
                            title={`[AI preview — not yet saved] ${s.unit} · ${s.startTime}–${s.endTime}`}
                            className="w-full rounded-md px-1.5 py-1.5 text-center text-[11px] font-bold text-white leading-tight opacity-70 border border-dashed border-white/60 truncate"
                            style={{ backgroundColor: "#9CA3AF" }}
                          >
                            {compactTime(s.startTime)}–{compactTime(s.endTime)}
                          </div>
                        ))}
                        {cellShifts.length === 0 && cellPreview.length === 0 && (
                          <button
                            type="button"
                            onClick={() => onCellClick(member.userId, d)}
                            aria-label={`Add shift for ${member.firstName} ${member.lastName} on ${d}`}
                            className={`group flex h-8 w-full items-center justify-center rounded ${
                              isOff ? "bg-muted/60" : "hover:bg-accent/10"
                            }`}
                          >
                            {isOff ? (
                              <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {getGridOffLabel(leaveType as LeaveType | "off")}
                              </span>
                            ) : (
                              <span className="text-sm leading-none text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                                +
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}

                <td className="border-l border-border p-0.5 text-center align-middle">
                  <span className={`inline-block rounded px-1 py-0.5 text-[10px] ${totalClass}`}>
                    {total}
                    {threshold !== null && (
                      <span className="text-muted-foreground font-normal">/{threshold}</span>
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
