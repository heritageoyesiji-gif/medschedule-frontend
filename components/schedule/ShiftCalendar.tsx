"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import type { Shift } from "@/types/api";
import { toCalendarEvent } from "@/lib/schedule";

type ShiftCalendarProps = {
  shifts: Shift[];
  month: string;
  onShiftClick: (shift: Shift) => void;
};

export function ShiftCalendar({
  shifts,
  month,
  onShiftClick,
}: ShiftCalendarProps) {
  const events = useMemo(
    () => shifts.map((shift) => toCalendarEvent(shift)),
    [shifts],
  );

  const initialDate = `${month}-01`;

  const handleEventClick = (info: EventClickArg) => {
    const shift = info.event.extendedProps.shift as Shift | undefined;
    if (shift) {
      onShiftClick(shift);
    }
  };

  return (
    <div className="shift-calendar rounded-xl border border-border bg-card p-3 md:p-4">
      <style data-fullcalendar />
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={initialDate}
        key={month}
        headerToolbar={false}
        events={events}
        eventClick={handleEventClick}
        height="auto"
        fixedWeekCount={false}
        dayMaxEvents={2}
      />
    </div>
  );
}
