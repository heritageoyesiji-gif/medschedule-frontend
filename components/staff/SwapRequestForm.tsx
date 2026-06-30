"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSubmitSwapRequest } from "@/hooks/useRequests";
import { getRoleLabel } from "@/lib/roles";
import { useFacilityStaff } from "@/hooks/useStaff";
import { useStaffShifts } from "@/hooks/useShifts";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  formatShiftDate,
  getCurrentMonth,
  getShiftTypeLabel,
  getUpcomingShifts,
} from "@/lib/schedule";
import type { Shift, User } from "@/types/api";

const swapSchema = z.object({
  requesterShiftId: z.string().min(1, "Select your shift"),
  targetStaffId: z.string().min(1, "Select a colleague"),
  targetShiftId: z.string().min(1, "Select their shift"),
  note: z.string().min(1, "Please add a note explaining the swap"),
});

type SwapFormValues = z.infer<typeof swapSchema>;

type SwapRequestFormProps = {
  user: User;
  myShifts: Shift[];
};

function formatShiftOption(shift: Shift): string {
  return `${formatShiftDate(shift.date)} · ${getShiftTypeLabel(shift.type)} · ${shift.unit} (${shift.startTime}–${shift.endTime})`;
}

export function SwapRequestForm({ user, myShifts }: SwapRequestFormProps) {
  const month = getCurrentMonth();
  const [targetStaffId, setTargetStaffId] = useState("");

  const { data: staffData, isError: isStaffError } = useFacilityStaff(
    user.facilityId ?? null,
  );
  const { data: targetSchedule, isLoading: isTargetShiftsLoading } =
    useStaffShifts(targetStaffId || null, month);

  const submitSwap = useSubmitSwapRequest(user.userId);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SwapFormValues>({
    resolver: zodResolver(swapSchema),
    defaultValues: {
      requesterShiftId: "",
      targetStaffId: "",
      targetShiftId: "",
      note: "",
    },
  });

  const myUpcomingShifts = useMemo(
    () => getUpcomingShifts(myShifts, 20),
    [myShifts],
  );

  const colleagues = useMemo(
    () =>
      (staffData?.staff ?? []).filter(
        (member) =>
          member.userId !== user.userId && member.status === "active",
      ),
    [staffData?.staff, user.userId],
  );

  const targetShifts = useMemo(
    () => getUpcomingShifts(targetSchedule?.shifts ?? [], 20),
    [targetSchedule?.shifts],
  );

  const onSubmit = async (values: SwapFormValues) => {
    try {
      await submitSwap.mutateAsync({
        requesterId: user.userId,
        targetStaffId: values.targetStaffId,
        requesterShiftId: values.requesterShiftId,
        targetShiftId: values.targetShiftId,
        note: values.note,
      });
      toast.success("Swap request submitted for admin review");
      reset();
      setTargetStaffId("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to submit swap request"));
    }
  };

  const handleTargetStaffChange = (staffId: string) => {
    setTargetStaffId(staffId);
    setValue("targetStaffId", staffId);
    setValue("targetShiftId", "");
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-6"
      noValidate
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Request a shift swap
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Propose trading one of your shifts with a colleague. An admin must
          approve before shifts change.
        </p>
      </div>

      {isStaffError ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Could not load colleague list. Your backend must allow staff to read
          the facility roster for swap requests.
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="requesterShiftId">Your shift</Label>
        <select
          id="requesterShiftId"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-invalid={Boolean(errors.requesterShiftId)}
          {...register("requesterShiftId")}
        >
          <option value="">Select a shift</option>
          {myUpcomingShifts.map((shift) => (
            <option key={shift.shiftId} value={shift.shiftId}>
              {formatShiftOption(shift)}
            </option>
          ))}
        </select>
        {myUpcomingShifts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No upcoming shifts this month to swap.
          </p>
        ) : null}
        {errors.requesterShiftId ? (
          <p className="text-xs text-destructive" role="alert">
            {errors.requesterShiftId.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetStaffId">Colleague</Label>
        <select
          id="targetStaffId"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-invalid={Boolean(errors.targetStaffId)}
          value={targetStaffId}
          onChange={(event) => handleTargetStaffChange(event.target.value)}
        >
          <option value="">Select a colleague</option>
          {colleagues.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.firstName} {member.lastName} · {getRoleLabel(member.roleType)} · {member.unit}
            </option>
          ))}
        </select>
        {errors.targetStaffId ? (
          <p className="text-xs text-destructive" role="alert">
            {errors.targetStaffId.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetShiftId">Their shift</Label>
        <select
          id="targetShiftId"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          aria-invalid={Boolean(errors.targetShiftId)}
          disabled={!targetStaffId || isTargetShiftsLoading}
          {...register("targetShiftId")}
        >
          <option value="">
            {isTargetShiftsLoading ? "Loading shifts…" : "Select their shift"}
          </option>
          {targetShifts.map((shift) => (
            <option key={shift.shiftId} value={shift.shiftId}>
              {formatShiftOption(shift)}
            </option>
          ))}
        </select>
        {targetStaffId && !isTargetShiftsLoading && targetShifts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No upcoming shifts found for this colleague this month.
          </p>
        ) : null}
        {errors.targetShiftId ? (
          <p className="text-xs text-destructive" role="alert">
            {errors.targetShiftId.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <textarea
          id="note"
          rows={3}
          className="flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          placeholder="Why do you need this swap?"
          aria-invalid={Boolean(errors.note)}
          {...register("note")}
        />
        {errors.note ? (
          <p className="text-xs text-destructive" role="alert">
            {errors.note.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={submitSwap.isPending}>
        {submitSwap.isPending ? "Submitting…" : "Submit swap request"}
      </Button>
    </form>
  );
}
