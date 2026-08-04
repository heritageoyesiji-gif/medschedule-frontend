"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Plus,
  Send,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AIGenerateScheduleResponse,
  useBiweeklySchedule,
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
import { useOvertimeConfig } from "@/hooks/useOvertimeConfig";
import { useTimeOffRequests } from "@/hooks/useRequests";
import { useAuth } from "@/hooks/useAuth";
import { useActiveFacilityId } from "@/hooks/useActiveFacility";
import { useFacilityStaff } from "@/hooks/useStaff";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  formatMonthLabel,
  getShiftTypeLabel,
  MAX_SHIFT_HOURS,
  shiftDurationHours,
  shiftMonth,
} from "@/lib/schedule";
import { formatPeriodLabel, getCurrentPeriodStart, getPeriodDays, shiftPeriod } from "@/lib/biweekly";
import { getUnitColor } from "@/lib/units";
import { getRoleTabLabel, ROLE_TABS, type RoleTab } from "@/lib/roles";
import { BiweeklyGrid } from "@/components/schedule/BiweeklyGrid";
import { QueryError } from "@/components/shared/QueryError";
import type { Shift, ShiftType, ShiftTypeConfig, StaffProfile } from "@/types/api";

type ModalMode = "add" | "edit" | "closed";

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

  const [periodStart, setPeriodStart] = useState(getCurrentPeriodStart);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<RoleTab>(ROLE_TABS[0]);
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

  // Publish/Unpublish, Copy Schedule, and AI generation are still month-scoped
  // on the backend — derive the "active" month from the period being viewed
  // (its starting Sunday) so these actions stay wired up now that the grid is
  // the only view. For a period that straddles two calendar months, these
  // actions apply to the month the period starts in.
  const month = periodStart.slice(0, 7);

  const { data: staffData } = useFacilityStaff(facilityId);
  const { data: scheduleData, refetch: refetchSchedule } = useFacilitySchedule(facilityId, month);
  const { data: shiftConfigs } = useShiftConfig(facilityId);
  const { data: overtimeConfig } = useOvertimeConfig(facilityId);
  const { data: timeOffData } = useTimeOffRequests(facilityId, "approved");
  // Two-week window for the Staff grid — spans ≤2 months, merged client-side.
  const biweekly = useBiweeklySchedule(facilityId, periodStart);

  const createShift = useCreateShift(facilityId, month);
  const updateShift = useUpdateShift(facilityId, month);
  const deleteShift = useDeleteShift(facilityId, month);
  const publishSchedule = usePublishSchedule(facilityId);
  const unpublishSchedule = useUnpublishSchedule(facilityId);
  const copySchedule = useCopySchedule(facilityId);
  const generateAiSchedule = useGenerateAISchedule();
  const confirmAiSchedule = useConfirmAISchedule();

  const staffList = staffData?.staff ?? [];
  const gaps = scheduleData?.gaps ?? [];
  const risks = scheduleData?.overtimeRisks ?? [];
  const isPublished = scheduleData?.published ?? false;

  const configs: ShiftTypeConfig[] = shiftConfigs ?? [];
  const approvedTimeOff = timeOffData?.requests ?? [];

  const uniqueUnits = useMemo(
    () => Array.from(new Set(biweekly.shifts.map((s) => s.unit))),
    [biweekly.shifts],
  );

  const getConfigForType = (type: ShiftType) =>
    configs.find((c) => c.shiftType === type) ?? null;

  const handleTypeChange = (type: ShiftType) => {
    setShiftType(type);
    const cfg = getConfigForType(type);
    setShiftStart(cfg?.startTime ?? "07:00");
    setShiftEnd(cfg?.endTime ?? "19:00");
  };

  // ── Grid-view interactions (reuse the same modal + mutations) ──────────────
  // Empty cell / staff drop → prefilled Create modal for (staff, date).
  const openAddFor = (staffId: string, date: string) => {
    setEditingShift(null);
    setShiftStaffId(staffId);
    setShiftDate(date);
    handleTypeChange("day");
    setShiftUnit(
      selectedUnit !== "all"
        ? selectedUnit
        : staffList.find((s) => s.userId === staffId)?.unit || "ICU",
    );
    setModalMode("add");
  };

  // Shift chip click → prefilled Edit modal.
  const openEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setShiftDate(shift.date);
    setShiftType(shift.type);
    setShiftUnit(shift.unit);
    setShiftStaffId(shift.staff?.userId ?? "");
    setShiftStart(shift.startTime);
    setShiftEnd(shift.endTime);
    setModalMode("edit");
  };

  // Shift chip dropped on another cell → move day and/or reassign.
  const handleGridShiftDrop = async (shift: Shift, toStaffId: string, toDate: string) => {
    if (shift.staff?.userId === toStaffId && shift.date === toDate) return;
    try {
      await updateShift.mutateAsync({ shiftId: shift.shiftId, date: toDate, staffId: toStaffId });
      toast.success("Shift moved");
      biweekly.refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to move shift"));
    }
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
      biweekly.refetch();
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
      biweekly.refetch();
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
      biweekly.refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Confirmation failed"));
    }
  };

  const activeStaff = useMemo(
    () => staffList.filter((s) => s.status === "active"),
    [staffList],
  );

  // Staff shown in the grid for the currently selected role tab. "casual" is a
  // cross-cutting filter on employmentType, not a StaffRoleType, so it's
  // checked separately — everyone else is filtered by roleType. RN and LPN
  // (etc.) never mix: only one role's staff render as grid rows at a time.
  const staffInRole = useMemo(
    () =>
      activeStaff.filter((s) =>
        selectedRole === "casual" ? s.employmentType === "casual" : s.roleType === selectedRole,
      ),
    [activeStaff, selectedRole],
  );

  // Per-tab counts for the small badge next to each role's label.
  const roleTabCounts = useMemo(() => {
    const map = new Map<RoleTab, number>();
    for (const tab of ROLE_TABS) {
      map.set(
        tab,
        activeStaff.filter((s) =>
          tab === "casual" ? s.employmentType === "casual" : s.roleType === tab,
        ).length,
      );
    }
    return map;
  }, [activeStaff]);

  // AI-generated preview shifts that fall inside the period currently shown in
  // the grid, so "review the preview, then confirm" still works with the
  // FullCalendar month view gone. Preview shifts outside this period were
  // still generated (they'll appear once you navigate to their period) — the
  // preview itself is scoped to the whole month on the backend. Also scoped
  // to the selected role tab, same as the real shifts in the grid, so a
  // preview RN shift doesn't show while viewing the LPN tab.
  const previewShiftsInPeriod = useMemo(() => {
    if (!aiPreview?.generatedShifts) return [];
    const periodDays = new Set(getPeriodDays(periodStart));
    const roleStaffIds = new Set(staffInRole.map((s) => s.userId));
    return aiPreview.generatedShifts.filter(
      (s) =>
        periodDays.has(s.date) &&
        (selectedUnit === "all" || s.unit === selectedUnit) &&
        roleStaffIds.has(s.staffId),
    );
  }, [aiPreview, periodStart, selectedUnit, staffInRole]);

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
      {/* Calendar Area */}
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto max-h-full min-w-0 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 bg-background">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">Schedule Builder</h1>

            {/* Navigator — biweekly (Sunday–Saturday) period */}
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPeriodStart((p) => shiftPeriod(p, -1))}
                className="size-8 p-0"
                aria-label="Previous period"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs font-semibold px-2 whitespace-nowrap">
                {formatPeriodLabel(periodStart)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPeriodStart((p) => shiftPeriod(p, 1))}
                className="size-8 p-0"
                aria-label="Next period"
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
                setShiftDate(periodStart);
                handleTypeChange("day");
                setShiftUnit(selectedUnit !== "all" ? selectedUnit : "ICU");
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

        {/* Role tabs — RN / LPN / PSW / LTCA / doctor / technician / Casual.
            Casual is a cross-cutting employmentType filter, not a 7th role: a
            casual RN shows under both RN and Casual. Only one tab's staff
            render as grid rows at a time — roles are never mixed together. */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted p-1">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedRole(tab)}
              aria-pressed={selectedRole === tab}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectedRole === tab
                  ? "bg-accent text-white shadow-sm"
                  : "text-foreground hover:bg-background/70"
              }`}
            >
              {getRoleTabLabel(tab)}
              <span className={`ml-1.5 ${selectedRole === tab ? "text-white/80" : "text-muted-foreground"}`}>
                {roleTabCounts.get(tab) ?? 0}
              </span>
            </button>
          ))}
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

        {/* Schedule view: two-week staff grid (the only view now) */}
        <div className="flex-1 min-h-125">
          {biweekly.isLoading ? (
            <CalendarSkeleton />
          ) : biweekly.isError ? (
            <div className="flex h-full items-center justify-center">
              <QueryError
                message="Couldn't load the schedule for this period."
                onRetry={() => biweekly.refetch()}
              />
            </div>
          ) : activeStaff.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground italic">
              No active staff to show. Add staff to start building a schedule.
            </div>
          ) : staffInRole.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground italic">
              No {getRoleTabLabel(selectedRole)} staff. Try another tab, or add staff under this role.
            </div>
          ) : (
            <BiweeklyGrid
              staff={staffInRole}
              shifts={biweekly.shifts}
              previewShifts={previewShiftsInPeriod}
              periodStart={periodStart}
              overtimeConfig={overtimeConfig ?? []}
              timeOff={approvedTimeOff}
              selectedUnit={selectedUnit}
              configs={configs}
              dragOverCell={dragOverCell}
              setDragOverCell={setDragOverCell}
              onCellClick={openAddFor}
              onShiftClick={openEditShift}
              onShiftDrop={handleGridShiftDrop}
              onStaffDrop={openAddFor}
            />
          )}
        </div>
      </div>

      {/* Right Sidebar — Schedule Health */}
      <div className="hidden lg:flex w-72 shrink-0 border-l border-border bg-card flex-col h-full overflow-hidden">
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
                schedule using your staffing requirements and staff availability. A preview loads in the grid below — review it, then confirm to save. If the preview covers dates outside the period you&apos;re currently viewing, navigate to that period to see them.
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
                  <Eye className="size-3.5" /> Preview shown in the grid below — grey shifts are AI-generated.
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
