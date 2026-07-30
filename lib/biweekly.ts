import type { Shift } from "@/types/api";

// Biweekly pay-period math, ported from the backend so grid hour-totals line up
// with the server's Overtime Risk alerts (see medschedule-backend
// src/db/shifts.ts getSundayDate / getBiweeklyPeriodStart).
//
// All arithmetic uses UTC Date methods so results are deterministic regardless
// of the browser timezone and match the (UTC) production server. Date strings
// are "YYYY-MM-DD"; periods are anchored to Sundays and run Sunday → Saturday
// (14 days).

const MS_PER_DAY = 24 * 3600 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

function parseUTC(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Sunday that starts the week containing dateStr. */
export function getSundayDate(dateStr: string): string {
  const d = parseUTC(dateStr);
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  d.setUTCDate(d.getUTCDate() - day);
  return isoDate(d);
}

/**
 * Sunday that starts the biweekly period containing dateStr. Weeks pair up as
 * (1,2),(3,4),… anchored to Jan 1 of that year, so a period never straddles a
 * year but may straddle a month. Periods run Sunday → Saturday (14 days).
 */
export function getBiweeklyPeriodStart(dateStr: string): string {
  const sunday = parseUTC(getSundayDate(dateStr));
  const yearStart = Date.UTC(sunday.getUTCFullYear(), 0, 1);
  const weekNum = Math.floor((sunday.getTime() - yearStart) / MS_PER_WEEK);
  if (weekNum % 2 === 1) sunday.setUTCDate(sunday.getUTCDate() - 7);
  return isoDate(sunday);
}

/** The 14 "YYYY-MM-DD" day columns of a period, given its start Sunday. */
export function getPeriodDays(periodStart: string): string[] {
  const start = parseUTC(periodStart);
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(start.getTime() + i * MS_PER_DAY);
    return isoDate(d);
  });
}

/** Navigate periods: add delta * 14 days to the period start. */
export function shiftPeriod(periodStart: string, delta: number): string {
  const d = parseUTC(periodStart);
  d.setUTCDate(d.getUTCDate() + delta * 14);
  return isoDate(d);
}

/** The ≤2 distinct "YYYY-MM" months a 14-day period touches. */
export function monthsSpanned(periodStart: string): string[] {
  const months = new Set(getPeriodDays(periodStart).map((d) => d.slice(0, 7)));
  return Array.from(months);
}

/** The biweekly period containing today (local date). */
export function getCurrentPeriodStart(): string {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  return getBiweeklyPeriodStart(today);
}

/** e.g. "Apr 6 – Apr 19, 2026". */
export function formatPeriodLabel(periodStart: string): string {
  const days = getPeriodDays(periodStart);
  const start = parseUTC(days[0]);
  const end = parseUTC(days[13]);
  const fmt = (d: Date, withYear: boolean) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: withYear ? "numeric" : undefined,
      timeZone: "UTC",
    });
  return `${fmt(start, false)} – ${fmt(end, true)}`;
}

/** Sum durationHours per assigned staff userId across the given shifts. */
export function sumHoursByStaff(shifts: Shift[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const s of shifts) {
    const id = s.staff?.userId;
    if (!id) continue;
    totals[id] = (totals[id] ?? 0) + s.durationHours;
  }
  return totals;
}
