import type { EventInput } from "@fullcalendar/core";
import type { Shift, ShiftType } from "@/types/api";

export const SHIFT_TYPE_COLORS: Record<ShiftType, string> = {
  day: "#D97706",
  evening: "#2563EB",
  night: "#6D28D9",
};

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  day: "Day",
  evening: "Evening",
  night: "Night",
};

export function getShiftTypeLabel(type: ShiftType): string {
  return SHIFT_TYPE_LABELS[type];
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

function getShiftEndIso(
  date: string,
  startTime: string,
  endTime: string,
): string {
  if (endTime <= startTime) {
    const [year, month, day] = date.split("-").map(Number);
    const nextDay = new Date(year, month - 1, day + 1);
    const endYear = nextDay.getFullYear();
    const endMonth = String(nextDay.getMonth() + 1).padStart(2, "0");
    const endDay = String(nextDay.getDate()).padStart(2, "0");
    return `${endYear}-${endMonth}-${endDay}T${endTime}`;
  }
  return `${date}T${endTime}`;
}

export function toCalendarEvent(shift: Shift): EventInput {
  const color = SHIFT_TYPE_COLORS[shift.type];

  return {
    id: shift.shiftId,
    title: `${getShiftTypeLabel(shift.type)} — ${shift.unit}`,
    start: `${shift.date}T${shift.startTime}`,
    end: getShiftEndIso(shift.date, shift.startTime, shift.endTime),
    backgroundColor: color,
    borderColor: color,
    extendedProps: { shift },
  };
}

export function getStatusCardClass(type: ShiftType): string {
  const map: Record<ShiftType, string> = {
    day: "status-card-day",
    evening: "status-card-evening",
    night: "status-card-night",
  };
  return `status-card ${map[type]}`;
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
