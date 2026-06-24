"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertCircle,
  Calendar,
  ClipboardList,
  Megaphone,
  Plus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAnnouncements, useCreateAnnouncement } from "@/hooks/useAnnouncements";
import { useAuth } from "@/hooks/useAuth";
import { useFacilitySchedule } from "@/hooks/useAdminSchedule";
import { useSwapRequests, useTimeOffRequests } from "@/hooks/useRequests";
import { useFacilityStaff } from "@/hooks/useStaff";
import { getApiErrorMessage } from "@/lib/apiError";
import { getCurrentMonth } from "@/lib/schedule";

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Message body is required"),
  priority: z.enum(["normal", "urgent"]),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export default function AdminDashboard() {
  const { user } = useAuth();
  const facilityId = user?.facilityId ?? null;
  const currentMonth = getCurrentMonth();

  const [isNewAnnouncementOpen, setIsNewAnnouncementOpen] = useState(false);

  // Queries
  const { data: staffData, isLoading: isStaffLoading } = useFacilityStaff(facilityId);
  const { data: scheduleData, isLoading: isScheduleLoading } = useFacilitySchedule(
    facilityId,
    currentMonth,
  );
  const { data: swapData, isLoading: isSwapLoading } = useSwapRequests(
    facilityId,
    "pending",
  );
  const { data: timeOffData, isLoading: isTimeOffLoading } = useTimeOffRequests(
    facilityId,
    "pending",
  );
  const { data: announcementsData, isLoading: isAnnouncementsLoading, refetch: refetchAnnouncements } =
    useAnnouncements(facilityId);

  // Mutation
  const createAnnouncement = useCreateAnnouncement();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      body: "",
      priority: "normal",
    },
  });

  const onSubmit = async (values: AnnouncementFormValues) => {
    if (!facilityId) return;

    try {
      await createAnnouncement.mutateAsync({
        facilityId,
        ...values,
      });
      toast.success("Announcement posted successfully");
      setIsNewAnnouncementOpen(false);
      reset();
      void refetchAnnouncements();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to post announcement"));
    }
  };

  const pendingRequestsCount =
    (swapData?.total ?? 0) + (timeOffData?.total ?? 0);
  const gapsCount = scheduleData?.gaps?.length ?? 0;
  const overtimeCount = scheduleData?.overtimeRisks?.length ?? 0;

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back, {user?.firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here is what is happening at your facility today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Staff Card */}
        <Link
          href="/admin/staff"
          className="group block rounded-xl border border-border bg-card p-6 shadow-sm hover:border-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Total Staff
            </span>
            <Users className="size-5 text-muted-foreground group-hover:text-accent transition-colors" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-semibold tracking-tight text-foreground">
              {isStaffLoading ? "..." : staffData?.total ?? 0}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Registered workers in this facility
          </p>
        </Link>

        {/* Staffing Gaps Card */}
        <Link
          href="/admin/schedule"
          className="group block rounded-xl border border-border bg-card p-6 shadow-sm hover:border-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Staffing Gaps
            </span>
            <Calendar className="size-5 text-muted-foreground group-hover:text-accent transition-colors" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-semibold tracking-tight text-foreground">
              {isScheduleLoading ? "..." : gapsCount}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Unassigned shifts needing coverage
          </p>
        </Link>

        {/* Pending Requests Card */}
        <Link
          href="/admin/requests"
          className="group block rounded-xl border border-border bg-card p-6 shadow-sm hover:border-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Pending Requests
            </span>
            <ClipboardList className="size-5 text-muted-foreground group-hover:text-accent transition-colors" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-semibold tracking-tight text-foreground">
              {isSwapLoading || isTimeOffLoading ? "..." : pendingRequestsCount}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Swap & time-off requests needing review
          </p>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Alerts and Gaps */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="size-4 text-accent" />
              Active Gaps & Overtime Risks
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Immediate action items to balance staffing requirements.
            </p>

            {isScheduleLoading ? (
              <div className="mt-6 space-y-3" aria-busy="true" aria-label="Loading alerts">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border-l-4 border-muted bg-muted/40 p-3"
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : gapsCount === 0 && overtimeCount === 0 ? (
              <div className="mt-6 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No active gaps or overtime risks detected for this month.
              </div>
            ) : (
              <div className="mt-6 space-y-4 max-h-75 overflow-y-auto pr-1">
                {/* Gaps */}
                {scheduleData?.gaps?.map((gap, idx) => (
                  <div
                    key={`gap-${idx}`}
                    className="flex items-start gap-3 rounded-lg border-l-4 border-amber-600 bg-muted/40 p-3 text-sm"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        Staffing Gap: {gap.unit} — {gap.type} Shift
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Required role: <span className="font-semibold">{gap.requiredRole}</span> on {gap.date}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {gap.message}
                      </p>
                    </div>
                    <Link
                      href="/admin/schedule"
                      className="text-xs font-semibold text-accent hover:underline shrink-0"
                    >
                      Fill Gap
                    </Link>
                  </div>
                ))}

                {/* Overtime Risks */}
                {scheduleData?.overtimeRisks?.map((risk, idx) => (
                  <div
                    key={`risk-${idx}`}
                    className="flex items-start gap-3 rounded-lg border-l-4 border-red-600 bg-muted/40 p-3 text-sm"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        Overtime Warning: High Projected Hours
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Projected: <span className="font-semibold text-red-600">{risk.projectedHours} hrs</span> / Limit: {risk.threshold} hrs
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {risk.message}
                      </p>
                    </div>
                    <Link
                      href="/admin/schedule"
                      className="text-xs font-semibold text-accent hover:underline shrink-0"
                    >
                      Manage shifts
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Announcements Side Panel */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Megaphone className="size-4 text-accent" />
                Announcements
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewAnnouncementOpen(true)}
                className="size-8 p-0"
                aria-label="Post new announcement"
              >
                <Plus className="size-4" />
              </Button>
            </div>

            {/* Posting Form */}
            {isNewAnnouncementOpen && (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-4 border-t border-border pt-4 space-y-3"
                noValidate
              >
                <div className="space-y-1">
                  <Label htmlFor="title" className="text-xs">Title</Label>
                  <Input
                    id="title"
                    className="h-8 text-sm"
                    placeholder="E.g., Updated PPE Protocol"
                    aria-invalid={Boolean(errors.title)}
                    {...register("title")}
                  />
                  {errors.title && (
                    <p className="text-xs text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="body" className="text-xs">Message</Label>
                  <textarea
                    id="body"
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent"
                    placeholder="Write announcement body..."
                    aria-invalid={Boolean(errors.body)}
                    {...register("body")}
                  />
                  {errors.body && (
                    <p className="text-xs text-destructive">{errors.body.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="priority" className="text-xs">Priority</Label>
                  <select
                    id="priority"
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-accent"
                    {...register("priority")}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsNewAnnouncementOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createAnnouncement.isPending}
                  >
                    {createAnnouncement.isPending ? "Posting..." : "Post"}
                  </Button>
                </div>
              </form>
            )}

            {/* Announcements List */}
            {isAnnouncementsLoading ? (
              <div className="mt-4 space-y-3" aria-busy="true" aria-label="Loading announcements">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-lg border-l-4 border-muted bg-muted/40 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <div className="h-3 w-full animate-pulse rounded bg-muted" />
                      <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="mt-2 h-2.5 w-16 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : !announcementsData?.announcements || announcementsData.announcements.length === 0 ? (
              <div className="mt-4 text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                No announcements posted yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3 max-h-87.5 overflow-y-auto pr-1">
                {announcementsData.announcements.map((ann) => (
                  <div
                    key={ann.announcementId}
                    className={`rounded-lg border-l-4 p-3 text-sm ${
                      ann.priority === "urgent"
                        ? "border-red-600 bg-red-50/20"
                        : "border-accent bg-teal-50/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        {ann.title}
                      </span>
                      {ann.priority === "urgent" && (
                        <span className="text-[10px] font-bold text-red-600 uppercase">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {ann.body}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
