"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useResetShiftTypeConfig,
  useShiftConfig,
  useUpdateShiftTypeConfig,
} from "@/hooks/useShiftConfig";
import {
  useOvertimeConfig,
  useResetOvertimeConfig,
  useUpdateOvertimeConfig,
} from "@/hooks/useOvertimeConfig";
import { useAuth } from "@/hooks/useAuth";
import { useActiveFacilityId } from "@/hooks/useActiveFacility";
import { getApiErrorMessage } from "@/lib/apiError";
import { getEmploymentLabel } from "@/lib/roles";
import { QueryError } from "@/components/shared/QueryError";
import { ChangePasswordForm } from "@/components/shared/ChangePasswordForm";
import type { OvertimeConfig, ShiftTypeConfig } from "@/types/api";
import { SHIFT_TYPE_COLORS } from "@/lib/schedule";
import type { ShiftType } from "@/types/api";

function ShiftTypeRow({
  config,
  facilityId,
}: {
  config: ShiftTypeConfig;
  facilityId: string;
}) {
  const [label, setLabel] = useState(config.label);
  const [startTime, setStartTime] = useState(config.startTime);
  const [endTime, setEndTime] = useState(config.endTime);
  const [durationHours, setDurationHours] = useState(String(config.durationHours));
  const [isDirty, setIsDirty] = useState(false);

  const updateConfig = useUpdateShiftTypeConfig(facilityId);
  const resetConfig = useResetShiftTypeConfig(facilityId);

  const markDirty = () => setIsDirty(true);

  const handleSave = async () => {
    const dur = parseFloat(durationHours);
    if (isNaN(dur) || dur <= 0 || dur > 24) {
      toast.error("Duration must be between 0 and 24 hours");
      return;
    }
    try {
      await updateConfig.mutateAsync({
        shiftType: config.shiftType,
        label,
        startTime,
        endTime,
        durationHours: dur,
      });
      toast.success(`${config.shiftType} shift type updated`);
      setIsDirty(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save"));
    }
  };

  const handleReset = async () => {
    if (!confirm(`Reset ${config.shiftType} to system defaults?`)) return;
    try {
      await resetConfig.mutateAsync(config.shiftType);
      toast.success(`${config.shiftType} reset to defaults`);
      setIsDirty(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to reset"));
    }
  };

  const color = SHIFT_TYPE_COLORS[config.shiftType as ShiftType] ?? "#6B7280";

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="size-3 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="font-semibold text-sm text-foreground">{config.shiftType}</span>
        {isDirty && (
          <span className="ml-auto text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
            Unsaved
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor={`label-${config.shiftType}`} className="text-xs">Label</Label>
          <Input
            id={`label-${config.shiftType}`}
            value={label}
            onChange={(e) => { setLabel(e.target.value); markDirty(); }}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`start-${config.shiftType}`} className="text-xs">Start Time</Label>
          <Input
            id={`start-${config.shiftType}`}
            type="time"
            value={startTime}
            onChange={(e) => { setStartTime(e.target.value); markDirty(); }}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`end-${config.shiftType}`} className="text-xs">End Time</Label>
          <Input
            id={`end-${config.shiftType}`}
            type="time"
            value={endTime}
            onChange={(e) => { setEndTime(e.target.value); markDirty(); }}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`dur-${config.shiftType}`} className="text-xs">Duration (hrs)</Label>
          <Input
            id={`dur-${config.shiftType}`}
            type="number"
            min="0.5"
            max="24"
            step="0.5"
            value={durationHours}
            onChange={(e) => { setDurationHours(e.target.value); markDirty(); }}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          className="text-xs gap-1.5 h-7"
          disabled={!isDirty || updateConfig.isPending}
          onClick={handleSave}
        >
          <Save className="size-3" />
          {updateConfig.isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1.5 h-7"
          disabled={resetConfig.isPending}
          onClick={handleReset}
        >
          <RotateCcw className="size-3" />
          Reset to Default
        </Button>
      </div>
    </div>
  );
}

function OvertimeRow({
  config,
  facilityId,
}: {
  config: OvertimeConfig;
  facilityId: string;
}) {
  const noLimit = config.biweeklyHours === null;
  const [hours, setHours] = useState(noLimit ? "" : String(config.biweeklyHours));
  const [unlimited, setUnlimited] = useState(noLimit);
  const [isDirty, setIsDirty] = useState(false);

  const updateConfig = useUpdateOvertimeConfig(facilityId);
  const resetConfig = useResetOvertimeConfig(facilityId);

  const handleSave = async () => {
    let biweeklyHours: number | null;
    if (unlimited) {
      biweeklyHours = null;
    } else {
      const parsed = parseFloat(hours);
      if (isNaN(parsed) || parsed <= 0 || parsed > 336) {
        toast.error("Biweekly hours must be between 1 and 336");
        return;
      }
      biweeklyHours = parsed;
    }
    try {
      await updateConfig.mutateAsync({ employmentType: config.employmentType, biweeklyHours });
      toast.success(`${getEmploymentLabel(config.employmentType)} OT limit updated`);
      setIsDirty(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save"));
    }
  };

  const handleReset = async () => {
    if (!confirm(`Reset ${getEmploymentLabel(config.employmentType)} to the system default?`)) return;
    try {
      await resetConfig.mutateAsync(config.employmentType);
      toast.success(`${getEmploymentLabel(config.employmentType)} reset to default`);
      setIsDirty(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to reset"));
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-semibold text-sm text-foreground truncate">
          {getEmploymentLabel(config.employmentType)}
        </span>
        {isDirty && (
          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 shrink-0">
            Unsaved
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
          <input
            type="checkbox"
            checked={unlimited}
            onChange={(e) => { setUnlimited(e.target.checked); setIsDirty(true); }}
            className="size-3.5 accent-accent"
          />
          No limit
        </label>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min="1"
            max="336"
            step="1"
            value={unlimited ? "" : hours}
            disabled={unlimited}
            placeholder="hrs"
            onChange={(e) => { setHours(e.target.value); setIsDirty(true); }}
            className="h-8 w-20 text-xs disabled:opacity-40"
            aria-label={`${getEmploymentLabel(config.employmentType)} biweekly OT hours`}
          />
          <span className="text-xs text-muted-foreground">hrs / 2 weeks</span>
        </div>
        <Button
          size="sm"
          className="text-xs gap-1.5 h-7"
          disabled={!isDirty || updateConfig.isPending}
          onClick={handleSave}
        >
          <Save className="size-3" />
          {updateConfig.isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1.5 h-7"
          disabled={resetConfig.isPending}
          onClick={handleReset}
        >
          <RotateCcw className="size-3" />
          Reset
        </Button>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const facilityId = useActiveFacilityId();

  const { data: configs, isLoading, isError, refetch } = useShiftConfig(facilityId);
  const {
    data: otConfigs,
    isLoading: isOtLoading,
    isError: isOtError,
    refetch: refetchOt,
  } = useOvertimeConfig(facilityId);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 pb-2">
        <Settings className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">Facility Settings</h1>
          <p className="text-sm text-muted-foreground">Configure shift types and their default times for your facility.</p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Shift Types</h2>
        <p className="text-xs text-muted-foreground">
          Customize the label, start time, end time, and duration for each shift type. Changes apply immediately to the schedule builder — existing shifts are unaffected.
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : isError ? (
          <QueryError message="Couldn't load shift types." onRetry={() => void refetch()} />
        ) : !configs || !facilityId ? (
          <div className="text-sm text-muted-foreground italic text-center py-8">
            No facility found. Complete onboarding first.
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((cfg) => (
              <ShiftTypeRow key={cfg.shiftType} config={cfg} facilityId={facilityId} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-semibold text-foreground">Overtime Thresholds</h2>
        <p className="text-xs text-muted-foreground">
          Set the biweekly hours limit for each contract type. Staff projected to exceed their limit
          within a 2-week pay period are flagged as overtime risks in the Schedule Builder. Choose
          &quot;No limit&quot; for contract types with no fixed cap.
        </p>

        {isOtLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : isOtError ? (
          <QueryError message="Couldn't load overtime thresholds." onRetry={() => void refetchOt()} />
        ) : !otConfigs || !facilityId ? (
          <div className="text-sm text-muted-foreground italic text-center py-8">
            No facility found. Complete onboarding first.
          </div>
        ) : (
          <div className="space-y-3">
            {otConfigs.map((cfg) => (
              <OvertimeRow key={cfg.employmentType} config={cfg} facilityId={facilityId} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-semibold text-foreground">Account</h2>
        <p className="text-xs text-muted-foreground">Change the password you use to sign in.</p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
