"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSubmitTimeOffRequest } from "@/hooks/useRequests";
import { getApiErrorMessage } from "@/lib/apiError";

const timeOffSchema = z
  .object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z.string().min(1, "Please provide a reason"),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

type TimeOffFormValues = z.infer<typeof timeOffSchema>;

type TimeOffRequestFormProps = {
  staffId: string;
  onSuccess?: () => void;
};

export function TimeOffRequestForm({
  staffId,
  onSuccess,
}: TimeOffRequestFormProps) {
  const submitTimeOff = useSubmitTimeOffRequest(staffId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TimeOffFormValues>({
    resolver: zodResolver(timeOffSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      reason: "",
    },
  });

  const onSubmit = async (values: TimeOffFormValues) => {
    try {
      await submitTimeOff.mutateAsync({
        staffId,
        ...values,
      });
      toast.success("Time-off request submitted");
      reset();
      onSuccess?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to submit request"));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-6"
      noValidate
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Request time off
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Submit dates and a reason for your manager to review.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            type="date"
            aria-invalid={Boolean(errors.startDate)}
            {...register("startDate")}
          />
          {errors.startDate ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.startDate.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            type="date"
            aria-invalid={Boolean(errors.endDate)}
            {...register("endDate")}
          />
          {errors.endDate ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.endDate.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <textarea
          id="reason"
          rows={3}
          className="flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          placeholder="Brief reason for your request"
          aria-invalid={Boolean(errors.reason)}
          {...register("reason")}
        />
        {errors.reason ? (
          <p className="text-xs text-destructive" role="alert">
            {errors.reason.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={submitTimeOff.isPending}>
        {submitTimeOff.isPending ? "Submitting…" : "Submit request"}
      </Button>
    </form>
  );
}
