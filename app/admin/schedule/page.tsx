"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { Draggable } from "@fullcalendar/interaction";
import type { DateClickArg, EventReceiveArg } from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import { toast } from "sonner";
import {
  AlertTriangle,
  Brain,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Phone,
  Plus,
  Send,
  Settings,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AIGenerateScheduleResponse,
  useConfirmAISchedule,
  useCopySchedule,
  useCreateShift,
  useDeleteShift,
  useFacilitySchedule,
  useGenerateAISchedule,
  usePublishSchedule,
  useUnpublishSchedule,
  useUpdateShift,
} from "@/hooks/useAdminSchedule";
import { useShiftConfig } from "@/hooks/useShiftConfig";
import { useAuth } from "@/hooks/useAuth";
import { useActiveFacilityId } from "@/hooks/useActiveFacility";
import { useFacilityStaff } from "@/hooks/useStaff";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  formatMonthLabel,
  getCurrentMonth,
  getShiftColor,
  getShiftTypeLabel,
  MAX_SHIFT_HOURS,
  shiftDurationHours,
  shiftMonth,
} from "@/lib/schedule";
import { getEmploymentLabel, getRoleColors, getRoleDotColor, getRoleLabel } from "@/lib/roles";
import { getUnitColor } from "@/lib/units";
import { QueryError } from "@/components/shared/QueryError";
import type { Shift, ShiftType, ShiftTypeConfig, StaffProfile, StaffRoleType } from "@/types/api";

type ModalMode = "add" | "edit" | "closed";

// Fixed display order for the role-grouped staff list on the left.
const ROLE_ORDER: StaffRoleType[] = ["RN", "LPN", "PSW", "LTCA", "doctor", "technician"];

function CalendarSkeleton() {
  return (
    <div className="space-y-1 h-full" aria-busy="true" aria-label="Loading schedule">
      <div className="grid grid-cols-7 gap-1 pb-2">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-3 animate-pulse rounded bg-muted/70" />
        ))}
      </div>
      {Array.from({ length: 5 }, (_, row) => (
        <div key={row} className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, col) => (
            <div key={col} className="h-24 animate-pulse rounded-md bg-muted/50" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ScheduleBuilderPage() {
  const { user } = useAuth();
  const facilityId = useActiveFacilityId();

  const [month, setMonth] = useState(getCurrentMonth);
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  // Roles collapsed in the left staff list. Empty = all expanded (names visible
  // by default; tapping a role header collapses/expands its people).
  const [collapsedRoles, setCollapsedRoles] = useState<Set<StaffRoleType>>(new Set());
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiPreview, setAiPreview] = useState<AIGenerateScheduleResponse | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>("closed");
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftDate, setShiftDate] = useState("");
  const [shiftType, setShiftType] = useState<ShiftType>("day");
  const [shiftUnit, setShiftUnit] = useState("ICU");
  const [shiftStaffId, setShiftStaffId] = useState("");
  const [shiftStart, setShiftStart] = useState("07:00");
  const [shiftEnd, setShiftEnd] = useState("19:00");

  const staffListRef = useRef<HTMLDivElement>(null);

  // FullCalendar needs a definite parent height for height="100%". That chain only
  // exists at lg+ (outer container is lg:h-[calc(100vh-4rem)]). On mobile the chain
  // is auto, so "100%" collapses the grid — use "auto" there to render a natural grid.
  const [calHeight, setCalHeight] = useState<number | "auto" | string>("auto");
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setCalHeight(mq.matches ? "100%" : "auto");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const { data: staffData } = useFacilityStaff(facilityId);
  const { data: scheduleData, isLoading: isScheduleLoading, isError: isScheduleError, refetch: refetchSchedule } =
    useFacilitySchedule(facilityId, month);
  const { data: shiftConfigs } = useShiftConfig(facilityId);

  const createShift = useCreateShift(facilityId, month);
  const updateShift = useUpdateShift(facilityId, month);
  const deleteShift = useDeleteShift(facilityId, month);
  const publishSchedule = usePublishSchedule(facilityId);
  const unpublishSchedule = useUnpublishSchedule(facilityId);
  const copySchedule = useCopySchedule(facilityId);
  const generateAiSchedule = useGenerateAISchedule();
  const confirmAiSchedule = useConfirmAISchedule();

  const staffList = staffData?.staff ?? [];
  const shifts = scheduleData?.shifts ?? [];
  const gaps = scheduleData?.gaps ?? [];
  const risks = scheduleData?.overtimeRisks ?? [];
  const isPublished = scheduleData?.published ?? false;

  const configs: ShiftTypeConfig[] = shiftConfigs ?? [];

  const uniqueUnits = useMemo(() => Array.from(new Set(shifts.map((s) => s.unit))), [shifts]);

  // Wire up FullCalendar external dragging from the staff list
  useEffect(() => {
    const el = staffListRef.current;
    if (!el) return;
    const draggable = new Draggable(el, {
      itemSelector: "[data-staff-id]",
      eventData(itemEl) {
        return {
          title: itemEl.getAttribute("data-staff-name") ?? "",
          duration: "12:00",
          extendedProps: {
            staffId: itemEl.getAttribute("data-staff-id"),
            isDragWorker: true,
          },
        };
      },
    });
    return () => draggable.destroy();
  }, [staffList, collapsedRoles]);

  const getConfigForType = (type: ShiftType) =>
    configs.find((c) => c.shiftType === type) ?? null;

  const handleTypeChange = (type: ShiftType) => {
    setShiftType(type);
    const cfg = getConfigForType(type);
    setShiftStart(cfg?.startTime ?? "07:00");
    setShiftEnd(cfg?.endTime ?? "19:00");
  };

  const handleEventClick = (info: EventClickArg) => {
    if (info.event.extendedProps.isPreview) {
      toast.info("This is an AI-generated preview shift. Confirm the schedule to save it.");
      return;
    }
    const shift = info.event.extendedProps.shift as Shift | undefined;
    if (shift) {
      setEditingShift(shift);
      setShiftDate(shift.date);
      setShiftType(shift.type);
      setShiftUnit(shift.unit);
      setShiftStaffId(shift.staff?.userId ?? "");
      setShiftStart(shift.startTime);
      setShiftEnd(shift.endTime);
      setModalMode("edit");
    }
  };

  const handleEventDrop = async (info: EventDropArg) => {
    if (info.event.extendedProps.isPreview) {
      info.revert();
      toast.error("Cannot drag preview shifts.");
      return;
    }
    const shift = info.event.extendedProps.shift as Shift | undefined;
    if (!shift) return;
    const newDate = info.event.startStr.split("T")[0];
    try {
      await updateShift.mutateAsync({ shiftId: shift.shiftId, date: newDate });
      toast.success("Shift moved");
      void refetchSchedule();
    } catch (err) {
      info.revert();
      toast.error(getApiErrorMessage(err, "Failed to move shift"));
    }
  };

  // Tap/click a calendar day → open the add-shift modal pre-filled with that date.
  // Primary way to add shifts on mobile (where dragging isn't available).
  const handleDateClick = (info: DateClickArg) => {
    setEditingShift(null);
    setShiftDate(info.dateStr);
    handleTypeChange("day");
    setShiftUnit(selectedUnit !== "all" ? selectedUnit : "ICU");
    setShiftStaffId("");
    setModalMode("add");
  };

  // Worker dragged from sidebar and dropped onto a calendar date cell
  const handleEventReceive = (info: EventReceiveArg) => {
    if (!info.event.extendedProps.isDragWorker) return;
    const staffId = info.event.extendedProps.staffId as string;
    const date = info.event.startStr.slice(0, 10);
    info.event.remove(); // remove temp event FullCalendar added
    setShiftStaffId(staffId);
    setShiftDate(date);
    handleTypeChange("day");
    // Drop into the unit currently being viewed (so any worker can cover a short
    // unit). Fall back to the worker's home unit when viewing all units.
    setShiftUnit(
      selectedUnit !== "all"
        ? selectedUnit
        : staffList.find((s) => s.userId === staffId)?.unit || "ICU",
    );
    setEditingShift(null);
    setModalMode("add");
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return;
    if (!shiftStaffId) {
      toast.error("Please assign a staff member");
      return;
    }
    const dur = shiftDurationHours(shiftStart, shiftEnd);
    if (dur === null || dur <= 0 || dur > MAX_SHIFT_HOURS) {
      toast.error(
        `Those times give a ${dur ?? "?"}-hour shift. A shift must be 0–${MAX_SHIFT_HOURS} hours. For an overnight shift the end time counts as the next day — otherwise check the start and end times.`,
      );
      return;
    }
    try {
      if (modalMode === "add") {
        await createShift.mutateAsync({
          facilityId,
          staffId: shiftStaffId,
          date: shiftDate,
          type: shiftType,
          unit: shiftUnit,
          startTime: shiftStart,
          endTime: shiftEnd,
        });
        toast.success("Shift created");
      } else if (modalMode === "edit" && editingShift) {
        await updateShift.mutateAsync({
          shiftId: editingShift.shiftId,
          date: shiftDate,
          type: shiftType,
          unit: shiftUnit,
          staffId: shiftStaffId,
          startTime: shiftStart,
          endTime: shiftEnd,
        });
        toast.success("Shift updated");
      }
      setModalMode("closed");
      void refetchSchedule();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save shift"));
    }
  };

  const handleDeleteShift = async () => {
    if (!editingShift) return;
    if (!confirm("Delete this shift?")) return;
    try {
      await deleteShift.mutateAsync(editingShift.shiftId);
      toast.success("Shift deleted");
      setModalMode("closed");
      void refetchSchedule();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete shift"));
    }
  };

  const handlePublish = async () => {
    try {
      const res = await publishSchedule.mutateAsync(month);
      toast.success(`Schedule published — ${res.notifiedStaffCount} staff notified.`);
      void refetchSchedule();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to publish schedule"));
    }
  };

  const handleUnpublish = async () => {
    if (
      !confirm(
        `Unpublish the ${formatMonthLabel(month)} schedule? Staff will no longer see it as published until you publish it again.`,
      )
    ) {
      return;
    }
    try {
      await unpublishSchedule.mutateAsync(month);
      toast.success("Schedule unpublished — it's back in draft.");
      void refetchSchedule();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to unpublish schedule"));
    }
  };

  const handleCopyFromLastMonth = async () => {
    const sourceMonth = shiftMonth(month, -1);
    if (!confirm(`Copy all shifts from ${formatMonthLabel(sourceMonth)} to ${formatMonthLabel(month)}?`)) return;
    try {
      const result = await copySchedule.mutateAsync({ sourceMonth, targetMonth: month });
      if (result.copiedCount === 0) {
        toast.info(`No shifts in ${formatMonthLabel(sourceMonth)} to copy.`);
      } else {
        toast.success(`Copied ${result.copiedCount} shift${result.copiedCount === 1 ? "" : "s"}${result.skippedCount > 0 ? ` (${result.skippedCount} skipped)` : ""}`);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to copy schedule"));
    }
  };

  const handleGenerateAI = async () => {
    if (!facilityId) return;
    try {
      const res = await generateAiSchedule.mutateAsync({ facilityId, month, command: "auto" });
      setAiPreview(res);
      toast.success("Schedule preview loaded — grey shifts are AI-generated.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Schedule generation failed"));
    }
  };

  const handleConfirmAI = async () => {
    if (!facilityId) return;
    try {
      const res = await confirmAiSchedule.mutateAsync({ facilityId, month });
      toast.success(`Schedule confirmed — ${res.savedShifts} shifts saved.`);
      setAiPreview(null);
      setIsAiPanelOpen(false);
      void refetchSchedule();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Confirmation failed"));
    }
  };

  const filteredShifts = useMemo(() => {
    if (selectedUnit === "all") return shifts;
    return shifts.filter((s) => s.unit === selectedUnit);
  }, [shifts, selectedUnit]);

  const calendarEvents = useMemo(() => {
    const regularEvents = filteredShifts.map((shift) => {
      // Fill color = unit (LTN, LTC, …); left border stripe = shift type.
      const unitColor = getUnitColor(shift.unit);
      const typeColor = getShiftColor(shift.type);
      const staffName = shift.staff
        ? `${shift.staff.firstName} ${shift.staff.lastName}`
        : "Unassigned";
      return {
        id: shift.shiftId,
        title: `${shift.unit} · ${getShiftTypeLabel(shift.type, configs)} · ${staffName}`,
        start: shift.date,
        allDay: true,
        backgroundColor: unitColor,
        borderColor: typeColor,
        // Sortable so same-unit shifts group together within a day (see eventOrder).
        unit: shift.unit,
        extendedProps: { shift },
      };
    });

    if (aiPreview?.generatedShifts) {
      const previewEvents = aiPreview.generatedShifts
        .filter((s) => selectedUnit === "all" || s.unit === selectedUnit)
        .map((s, idx) => {
          const staffMember = staffList.find((st) => st.userId === s.staffId);
          const staffName = staffMember
            ? `${staffMember.firstName} ${staffMember.lastName}`
            : "Staff";
          return {
            id: `preview-${idx}`,
            title: `[AI] ${getShiftTypeLabel(s.type, configs)} · ${staffName}`,
            start: s.date,
            allDay: true,
            backgroundColor: "#9CA3AF",
            borderColor: "#6B7280",
            className: "opacity-75",
            unit: s.unit,
            extendedProps: { isPreview: true, shift: s },
          };
        });
      return [...regularEvents, ...previewEvents];
    }

    return regularEvents;
  }, [filteredShifts, aiPreview, staffList, selectedUnit, configs]);

  const activeStaff = useMemo(
    () => staffList.filter((s) => s.status === "active"),
    [staffList],
  );

  // Group active staff by role for the collapsible left panel (RN, LPN, …),
  // keeping a fixed role order and dropping empty roles.
  const staffByRole = useMemo(
    () =>
      ROLE_ORDER.map(
        (role) => [role, activeStaff.filter((s) => s.roleType === role)] as const,
      ).filter(([, members]) => members.length > 0),
    [activeStaff],
  );

  const toggleRole = (role: StaffRoleType) => {
    setCollapsedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  // Group active staff by their home unit so the assignment dropdown keeps units
  // separate. Every unit's staff stay available for any shift — a short unit can
  // still pull a worker from another unit. Units without a name sort last.
  const staffByUnit = useMemo(() => {
    const groups = new Map<string, StaffProfile[]>();
    for (const s of activeStaff) {
      const key = s.unit || "";
      const arr = groups.get(key) ?? [];
      arr.push(s);
      groups.set(key, arr);
    }
    return Array.from(groups.entries()).sort((a, b) =>
      (a[0] || "￿").localeCompare(b[0] || "￿"),
    );
  }, [activeStaff]);

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-4rem)]">
      {/* Left Staff Sidebar — role-grouped, drag onto the calendar to assign */}
      <div className="hidden lg:flex w-80 shrink-0 border-r border-border bg-card flex-col h-full overflow-hidden">
        <div className="px-4 py-3.5 border-b border-border shrink-0">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Users className="size-5" /> Staff
          </h2>
          <p className="text-sm text-muted-foreground mt-1 leading-snug">
            Tap a role to see its people. Drag anyone onto a day to assign a shift.
          </p>
        </div>
        <div ref={staffListRef} className="flex-1 overflow-y-auto p-3 space-y-2">
          {staffByRole.length === 0 ? (
            <div className="text-sm text-muted-foreground italic p-3 border border-dashed border-border rounded-lg text-center">
              No active staff found.
            </div>
          ) : (
            staffByRole.map(([role, members]) => {
              const open = !collapsedRoles.has(role);
              const colors = getRoleColors(role);
              return (
                <div key={role} className="rounded-lg border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleRole(role)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-2 px-3 py-3 bg-muted/40 hover:bg-muted transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className={`text-sm font-bold px-2 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>
                        {getRoleLabel(role)}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">
                        {members.length} {members.length === 1 ? "person" : "people"}
                      </span>
                    </span>
                    <ChevronDown
                      className={`size-5 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
                    />
                  </button>
                  {open && (
                    <div className="divide-y divide-border">
                      {members.map((staff) => {
                        const dot = getRoleDotColor(staff.roleType);
                        const unitColor = getUnitColor(staff.unit);
                        return (
                          <div
                            key={staff.userId}
                            data-staff-id={staff.userId}
                            data-staff-name={`${staff.firstName} ${staff.lastName}`}
                            className="flex items-center gap-3 px-3 py-3 bg-background cursor-grab active:cursor-grabbing hover:bg-accent/5 transition-colors select-none"
                          >
                            <div
                              className="size-10 rounded-full flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${dot}20` }}
                            >
                              <span className="text-sm font-bold" style={{ color: dot }}>
                                {staff.firstName[0]}{staff.lastName[0]}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {staff.firstName} {staff.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                                <span className="inline-flex items-center gap-1">
                                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: unitColor }} />
                                  {staff.unit || "No unit"}
                                </span>
                                <span aria-hidden>·</span>
                                <span className="truncate">{getEmploymentLabel(staff.employmentType)}</span>
                              </p>
                              {staff.phone?.trim() && (
                                <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                  <Phone className="size-3 shrink-0" /> {staff.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Calendar Area */}
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto max-h-full min-w-0 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 bg-background">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">Schedule Builder</h1>
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMonth((m) => shiftMonth(m, -1))}
                className="size-8 p-0"
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs font-semibold px-2">{formatMonthLabel(month)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMonth((m) => shiftMonth(m, 1))}
                className="size-8 p-0"
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 text-xs outline-none focus-visible:border-accent"
            >
              <option value="all">All Units</option>
              {uniqueUnits.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>

            <Button
              onClick={handleCopyFromLastMonth}
              size="sm"
              variant="outline"
              disabled={copySchedule.isPending}
              className="gap-1.5 text-xs"
            >
              <Copy className="size-3.5" />
              {copySchedule.isPending ? "Copying…" : `Copy ${formatMonthLabel(shiftMonth(month, -1))}`}
            </Button>

            <Button
              onClick={() => {
                setEditingShift(null);
                setShiftDate(`${month}-01`);
                handleTypeChange("day");
                setShiftUnit("ICU");
                setShiftStaffId("");
                setModalMode("add");
              }}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
            >
              <Plus className="size-3.5" /> Shift
            </Button>

            <Button
              onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
              size="sm"
              variant={isAiPanelOpen ? "default" : "outline"}
              className={`gap-1.5 text-xs ${isAiPanelOpen ? "bg-accent hover:bg-accent/90" : ""}`}
            >
              <Brain className="size-3.5" /> AI Assistant
            </Button>

            {isPublished ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700">
                  <Check className="size-3.5" /> Published
                </span>
                <Button
                  onClick={handleUnpublish}
                  size="sm"
                  variant="outline"
                  disabled={unpublishSchedule.isPending}
                  className="text-xs"
                >
                  {unpublishSchedule.isPending ? "Unpublishing…" : "Unpublish"}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handlePublish}
                size="sm"
                disabled={publishSchedule.isPending}
                className="text-xs bg-teal-700 hover:bg-teal-800 disabled:bg-muted disabled:text-muted-foreground"
              >
                {publishSchedule.isPending ? "Publishing…" : "Publish Schedule"}
              </Button>
            )}
          </div>
        </div>

        {/* Unit color legend — fill color encodes the unit, left stripe the shift type */}
        {uniqueUnits.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
            <span className="font-semibold uppercase tracking-wider text-muted-foreground">Units</span>
            {uniqueUnits.map((u) => (
              <span key={u} className="inline-flex items-center gap-1.5 text-foreground">
                <span
                  className="size-3 rounded-sm border border-black/10"
                  style={{ backgroundColor: getUnitColor(u) }}
                />
                {u || "No unit"}
              </span>
            ))}
            <span className="ml-auto text-[11px] italic text-muted-foreground">
              Left stripe = shift type
            </span>
          </div>
        )}

        {/* Calendar */}
        <div className="flex-1 rounded-xl border border-border bg-card p-4 shadow-sm min-h-125">
          {isScheduleLoading ? (
            <CalendarSkeleton />
          ) : isScheduleError ? (
            <div className="flex h-full items-center justify-center">
              <QueryError
                message="Couldn't load the schedule for this month."
                onRetry={() => void refetchSchedule()}
              />
            </div>
          ) : (
            <div className="shift-calendar h-full relative">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                initialDate={`${month}-01`}
                key={month}
                headerToolbar={false}
                events={calendarEvents}
                eventOrder="unit,title"
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                editable={true}
                droppable={true}
                eventDrop={handleEventDrop}
                eventReceive={handleEventReceive}
                fixedWeekCount={false}
                height={calHeight}
                dayMaxEvents={3}
              />
              {shifts.length === 0 && !aiPreview && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  <Calendar className="mb-3 size-10 text-muted-foreground/40" />
                  <p className="font-medium text-foreground">No shifts this month</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tap any day to add a shift — or copy last month&apos;s schedule or use AI to get started.
                  </p>
                  <div className="pointer-events-auto mt-4">
                    <Button
                      onClick={handleCopyFromLastMonth}
                      variant="outline"
                      size="sm"
                      disabled={copySchedule.isPending}
                      className="gap-1.5 text-xs"
                    >
                      <Copy className="size-3.5" />
                      {copySchedule.isPending ? "Copying…" : `Copy from ${formatMonthLabel(shiftMonth(month, -1))}`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar — Schedule Health */}
      <div className="hidden lg:flex w-80 shrink-0 border-l border-border bg-card flex-col h-full overflow-hidden">
        <div className="px-4 py-3.5 border-b border-border shrink-0">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="size-5" /> Schedule Health
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                  Staffing Gaps ({gaps.length})
                </h3>
                <div className="space-y-2">
                  {gaps.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic p-3 border border-dashed border-border rounded-lg text-center">
                      No staffing gaps detected.
                    </div>
                  ) : (
                    gaps.map((gap, i) => (
                      <div key={i} className="text-xs bg-amber-50/50 border border-amber-200 text-amber-900 rounded p-2.5 space-y-1">
                        <div className="font-semibold flex justify-between gap-2">
                          <span>{gap.unit} — {getShiftTypeLabel(gap.type, configs)}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{gap.date}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{gap.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                  Overtime Risks ({risks.length})
                </h3>
                <div className="space-y-2">
                  {risks.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic p-3 border border-dashed border-border rounded-lg text-center">
                      No overtime risks detected.
                    </div>
                  ) : (
                    risks.map((risk, i) => (
                      <div key={i} className="text-xs bg-red-50/50 border border-red-200 text-red-900 rounded p-2.5 space-y-1">
                        <div className="font-semibold flex justify-between gap-2">
                          <span>Projected: {risk.projectedHours}h</span>
                          <span className="text-red-700">Limit: {risk.threshold}h</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{risk.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
        </div>
      </div>

      {/* AI Assistant Modal */}
      {isAiPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-lg flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="font-bold text-foreground flex items-center gap-1.5 text-sm">
                <Brain className="size-4 text-accent" /> AI Scheduling — {formatMonthLabel(month)}
              </h3>
              <button
                onClick={() => { setAiPreview(null); setIsAiPanelOpen(false); }}
                className="rounded-lg p-2 hover:bg-muted"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-col flex-1 overflow-y-auto p-4 space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
                Automatically builds the{" "}
                <span className="font-semibold text-foreground">{formatMonthLabel(month)}</span>{" "}
                schedule using your staffing requirements and staff availability. A preview loads on the calendar — review it, then confirm to save.
              </div>
              <Button
                onClick={handleGenerateAI}
                disabled={generateAiSchedule.isPending}
                className="w-full text-xs gap-1.5"
                size="sm"
              >
                <Send className="size-3.5" />
                {generateAiSchedule.isPending ? "Generating Preview…" : "Generate Preview"}
              </Button>

              {aiPreview && (
                <div className="space-y-2.5 pt-2 border-t border-border">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                    <AlertTriangle className="size-3.5 text-amber-600" />
                    Warnings ({aiPreview.warnings?.length || 0})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {aiPreview.warnings?.length > 0 ? (
                      aiPreview.warnings.map((warn, i) => (
                        <div key={i} className="text-xs bg-amber-50/50 border border-amber-200 text-amber-900 rounded p-2.5 leading-relaxed">
                          {warn}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground italic">No warnings.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {aiPreview && (
              <div className="p-4 border-t border-border space-y-2 shrink-0">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Eye className="size-3.5" /> Preview on calendar — grey shifts are AI-generated.
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleConfirmAI}
                    disabled={confirmAiSchedule.isPending}
                    className="flex-1 text-xs bg-teal-600 hover:bg-teal-700"
                    size="sm"
                  >
                    {confirmAiSchedule.isPending ? "Saving…" : "Confirm & Save"}
                  </Button>
                  <Button
                    onClick={() => setAiPreview(null)}
                    variant="outline"
                    className="flex-1 text-xs"
                    size="sm"
                  >
                    Discard
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Shift Modal */}
      {modalMode !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-lg flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground">
                {modalMode === "add" ? "Create New Shift" : "Edit Assigned Shift"}
              </h3>
              <button
                onClick={() => setModalMode("closed")}
                className="rounded-lg p-2 hover:bg-muted"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="p-6 space-y-4 text-sm" noValidate>
              <div className="space-y-1">
                <Label htmlFor="shift-date">Shift Date</Label>
                <Input
                  id="shift-date"
                  type="date"
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="shift-type">Shift Type</Label>
                  <select
                    id="shift-type"
                    value={shiftType}
                    onChange={(e) => handleTypeChange(e.target.value as ShiftType)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 outline-none focus-visible:border-accent"
                  >
                    {configs.length > 0 ? (
                      configs.map((cfg) => (
                        <option key={cfg.shiftType} value={cfg.shiftType}>
                          {cfg.label} ({cfg.durationHours}hr)
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="day">Day (12hr)</option>
                        <option value="evening">Evening (8hr)</option>
                        <option value="night">Night (12hr)</option>
                        <option value="D12">D12 (12hr)</option>
                        <option value="N12">N12 (12hr)</option>
                        <option value="D8">D8 (8hr)</option>
                        <option value="N8">N8 (8hr)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="shift-unit">Unit</Label>
                  <Input
                    id="shift-unit"
                    placeholder="ICU"
                    value={shiftUnit}
                    onChange={(e) => setShiftUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="shift-start">Start Time</Label>
                  <Input
                    id="shift-start"
                    type="time"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="shift-end">End Time</Label>
                  <Input
                    id="shift-end"
                    type="time"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="shift-staff">Assign Staff Member</Label>
                <select
                  id="shift-staff"
                  value={shiftStaffId}
                  onChange={(e) => setShiftStaffId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 outline-none focus-visible:border-accent"
                >
                  <option value="">-- Choose Worker --</option>
                  {staffByUnit.map(([unit, members]) => (
                    <optgroup key={unit || "no-unit"} label={unit || "No unit"}>
                      {members.map((s) => (
                        <option key={s.userId} value={s.userId}>
                          {s.firstName} {s.lastName} ({s.roleType})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
                {modalMode === "edit" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDeleteShift}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5"
                  >
                    <Trash2 className="size-4" /> Delete
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setModalMode("closed")}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createShift.isPending || updateShift.isPending}>
                    {createShift.isPending || updateShift.isPending
                      ? "Saving..."
                      : modalMode === "add"
                      ? "Create"
                      : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
