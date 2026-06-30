import type { EventInput } from "@fullcalendar/core";
import type { Shift, ShiftType, ShiftTypeConfig } from "@/types/api";

export const SHIFT_TYPE_COLORS: Record<ShiftType, string> = {
  day:     "#D97706",
  evening: "#2563EB",
  night:   "#6D28D9",
  D12:     "#059669",
  N12:     "#DC2626",
  D8:      "#0891B2",
  N8:      "#7C3AED",
};

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  day:     "Day",
  evening: "Evening",
  night:   "Night",
  D12:     "D12",
  N12:     "N12",
  D8:      "D8",
  N8:      "N8",
};

export function getShiftTypeLabel(type: string, configs?: ShiftTypeConfig[]): string {
  if (configs) {
    const cfg = configs.find((c) => c.shiftType === type);
    if (cfg) return cfg.label;
  }
  return SHIFT_TYPE_LABELS[type as ShiftType] ?? type;
}

export function getShiftColor(type: string): string {
  return SHIFT_TYPE_COLORS[type as ShiftType] ?? "#6B7280";
}

export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(year, mon - 1 + delta, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

export function formatMonthLabel(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  return new Date(year, mon - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function toCalendarEvent(shift: Shift, configs?: ShiftTypeConfig[]): EventInput {
  const color = getShiftColor(String(shift.type));

  return {
    id: shift.shiftId,
    title: `${getShiftTypeLabel(shift.type, configs)} — ${shift.unit}`,
    start: shift.date,
    allDay: true,
    backgroundColor: color,
    borderColor: color,
    extendedProps: { shift },
  };
}

export function getStatusCardClass(type: string): string {
  const map: Record<ShiftType, string> = {
    day:     "status-card-day",
    evening: "status-card-evening",
    night:   "status-card-night",
    D12:     "status-card-day",
    N12:     "status-card-night",
    D8:      "status-card-evening",
    N8:      "status-card-night",
  };
  return `status-card ${map[type as ShiftType] ?? "status-card-day"}`;
}

export function formatShiftTime(startTime: string, endTime: string): string {
  return `${startTime} – ${endTime}`;
}

export function formatShiftDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function getUpcomingShifts(shifts: Shift[], limit = 5): Shift[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return shifts
    .filter((shift) => {
      const [year, month, day] = shift.date.split("-").map(Number);
      const shiftDate = new Date(year, month - 1, day);
      return shiftDate >= today;
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.startTime.localeCompare(b.startTime),
    )
    .slice(0, limit);
}
