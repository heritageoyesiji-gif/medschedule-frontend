"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  ClipboardList,
  Clock,
  MessageSquare,
  RefreshCw,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { getRoleLabel } from "@/lib/roles";
import {
  useRespondToSwapRequest,
  useRespondToTimeOffRequest,
  useSwapRequests,
  useTimeOffRequests,
} from "@/hooks/useRequests";
import { getApiErrorMessage } from "@/lib/apiError";
import { formatShiftDate } from "@/lib/schedule";
import type { RequestStatus, SwapRequest, TimeOffRequest } from "@/types/api";

type TabType = "time-off" | "swaps";

export default function RequestManagementPage() {
  const { user } = useAuth();
  const facilityId = user?.facilityId ?? null;

  // State
  const [activeTab, setActiveTab] = useState<TabType>("time-off");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Queries
  const {
    data: timeOffData,
    isLoading: isTimeOffLoading,
    refetch: refetchTimeOff,
  } = useTimeOffRequests(facilityId, statusFilter === "all" ? undefined : statusFilter);

  const {
    data: swapData,
    isLoading: isSwapLoading,
    refetch: refetchSwaps,
  } = useSwapRequests(facilityId, statusFilter === "all" ? undefined : statusFilter);

  // Mutations
  const respondToTimeOff = useRespondToTimeOffRequest(facilityId);
  const respondToSwap = useRespondToSwapRequest(facilityId);

  const handleRespondTimeOff = async (
    requestId: string,
    status: "approved" | "rejected"
  ) => {
    try {
      await respondToTimeOff.mutateAsync({
        requestId,
        payload: {
          status,
          adminNote: notes[requestId] || undefined,
        },
      });
      toast.success(`Request ${status} successfully`);
      setNotes((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      void refetchTimeOff();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to respond to request"));
    }
  };

  const handleRespondSwap = async (
    swapRequestId: string,
    status: "approved" | "rejected"
  ) => {
    try {
      await respondToSwap.mutateAsync({
        swapRequestId,
        payload: {
          status,
          adminNote: notes[swapRequestId] || undefined,
        },
      });
      toast.success(`Swap request ${status} successfully`);
      setNotes((prev) => {
        const next = { ...prev };
        delete next[swapRequestId];
        return next;
      });
      void refetchSwaps();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to respond to swap request"));
    }
  };

  const handleNoteChange = (id: string, value: string) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  // Status Border Colors for Status-First Cards
  const getStatusBorderClass = (status: RequestStatus) => {
    switch (status) {
      case "pending":
        return "border-l-4 border-l-amber-500";
      case "approved":
        return "border-l-4 border-l-teal-600";
      case "rejected":
        return "border-l-4 border-l-muted-foreground/40";
    }
  };

  const getStatusBadgeClass = (status: RequestStatus) => {
    switch (status) {
      case "pending":
        return "bg-amber-50 text-amber-800 border border-amber-200";
      case "approved":
        return "bg-teal-50 text-teal-800 border border-teal-200";
      case "rejected":
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  const timeOffRequests = timeOffData?.requests ?? [];
  const swapRequests = swapData?.swapRequests ?? [];

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-5xl mx-auto h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Welcome Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Request Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and approve staff schedule swaps and time off requests.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void refetchTimeOff();
            void refetchSwaps();
          }}
          className="gap-2"
        >
          <RefreshCw className="size-4" /> Refresh
        </Button>
      </div>

      {/* Tabs & Filters bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between border-b border-border pb-4">
        {/* Tab switchers */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("time-off")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none ${
              activeTab === "time-off"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Time Off ({isTimeOffLoading ? "..." : timeOffRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("swaps")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none ${
              activeTab === "swaps"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Shift Swaps ({isSwapLoading ? "..." : swapRequests.length})
          </button>
        </div>

        {/* Status Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Label htmlFor="status-filter" className="text-xs text-muted-foreground shrink-0">
            Show Status:
          </Label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RequestStatus | "all")}
            className="flex h-8 rounded-md border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-accent"
          >
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All Requests</option>
          </select>
        </div>
      </div>

      {/* Requests Lists */}
      <div className="space-y-4">
        {activeTab === "time-off" ? (
          isTimeOffLoading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading time off requests">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm border-l-4 border-l-muted"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                        <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-4 w-44 animate-pulse rounded bg-muted" />
                        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                      </div>
                      <div className="space-y-1.5 rounded-lg border border-border/40 bg-muted/40 p-3">
                        <div className="h-3 w-full animate-pulse rounded bg-muted" />
                        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                    <div className="sm:w-64 shrink-0 space-y-2">
                      <div className="h-16 w-full animate-pulse rounded-md bg-muted" />
                      <div className="flex gap-2">
                        <div className="h-8 flex-1 animate-pulse rounded-md bg-muted" />
                        <div className="h-8 flex-1 animate-pulse rounded-md bg-muted" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : timeOffRequests.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
              <ClipboardList className="size-8 text-muted-foreground/50 mx-auto mb-2" />
              No time off requests found for the selected filter.
            </div>
          ) : (
            timeOffRequests.map((req) => (
              <div
                key={req.requestId}
                className={`rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md ${getStatusBorderClass(
                  req.status
                )}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {req.staff?.firstName} {req.staff?.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({req.staff?.roleType ? getRoleLabel(req.staff.roleType) : ""} • {req.staff?.unit})
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${getStatusBadgeClass(
                          req.status
                        )}`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5 text-foreground font-medium">
                        <CalendarDays className="size-4 text-accent" />
                        {formatShiftDate(req.startDate)} – {formatShiftDate(req.endDate)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-4" />
                        Submitted: {new Date(req.submittedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-sm text-foreground bg-muted/40 p-3 rounded-lg border border-border/40 mt-2">
                      <span className="font-semibold text-xs text-muted-foreground block mb-0.5 uppercase tracking-wider">
                        Reason
                      </span>
                      {req.reason}
                    </p>

                    {req.adminNote && (
                      <p className="text-xs text-muted-foreground italic pl-3 border-l-2 border-border mt-2">
                        Admin Note: {req.adminNote}
                      </p>
                    )}
                  </div>

                  {/* Actions for Pending Requests */}
                  {req.status === "pending" && (
                    <div className="sm:w-64 space-y-3 shrink-0 pt-2 sm:pt-0">
                      <div className="space-y-1">
                        <Label
                          htmlFor={`note-timeoff-${req.requestId}`}
                          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          Decision Note
                        </Label>
                        <textarea
                          id={`note-timeoff-${req.requestId}`}
                          rows={2}
                          value={notes[req.requestId] || ""}
                          onChange={(e) =>
                            handleNoteChange(req.requestId, e.target.value)
                          }
                          placeholder="Optional notes..."
                          className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs outline-none focus-visible:border-accent"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            handleRespondTimeOff(req.requestId, "approved")
                          }
                          size="sm"
                          disabled={respondToTimeOff.isPending}
                          className="flex-1 bg-teal-600 hover:bg-teal-700 gap-1.5"
                        >
                          <Check className="size-3.5" /> Approve
                        </Button>
                        <Button
                          onClick={() =>
                            handleRespondTimeOff(req.requestId, "rejected")
                          }
                          size="sm"
                          variant="outline"
                          disabled={respondToTimeOff.isPending}
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5"
                        >
                          <X className="size-3.5" /> Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )
        ) : isSwapLoading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading swap requests">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-5 shadow-sm border-l-4 border-l-muted"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 rounded-lg border border-border/40 bg-muted/20 p-3">
                      {[1, 2].map((j) => (
                        <div key={j} className="space-y-1.5">
                          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-36 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="sm:w-64 shrink-0 space-y-2">
                    <div className="h-16 w-full animate-pulse rounded-md bg-muted" />
                    <div className="flex gap-2">
                      <div className="h-8 flex-1 animate-pulse rounded-md bg-muted" />
                      <div className="h-8 flex-1 animate-pulse rounded-md bg-muted" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : swapRequests.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
            <ClipboardList className="size-8 text-muted-foreground/50 mx-auto mb-2" />
            No shift swap requests found for the selected filter.
          </div>
        ) : (
          swapRequests.map((req) => (
            <div
              key={req.swapRequestId}
              className={`rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md ${getStatusBorderClass(
                req.status
              )}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${getStatusBadgeClass(
                        req.status
                      )}`}
                    >
                      {req.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Submitted: {new Date(req.submittedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Swap Visual Layout */}
                  <div className="grid gap-4 sm:grid-cols-2 bg-muted/20 p-3 rounded-lg border border-border/40">
                    {/* Requester */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Requester
                      </span>
                      <p className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                        <User className="size-3.5 text-accent" />
                        {req.requester.firstName} {req.requester.lastName}
                      </p>
                      <p className="text-xs text-foreground font-medium mt-1">
                        Shift:{" "}
                        <span className="font-semibold capitalize text-accent">
                          {req.requester.shift.type}
                        </span>{" "}
                        ({req.requester.shift.unit})
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Date: {formatShiftDate(req.requester.shift.date)}
                      </p>
                    </div>

                    {/* Target Staff */}
                    <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-border/60 pt-3 sm:pt-0 sm:pl-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Proposed Swap Target
                      </span>
                      <p className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
                        <User className="size-3.5 text-accent" />
                        {req.targetStaff.firstName} {req.targetStaff.lastName}
                      </p>
                      <p className="text-xs text-foreground font-medium mt-1">
                        Shift:{" "}
                        <span className="font-semibold capitalize text-accent">
                          {req.targetStaff.shift.type}
                        </span>{" "}
                        ({req.targetStaff.shift.unit})
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Date: {formatShiftDate(req.targetStaff.shift.date)}
                      </p>
                    </div>
                  </div>

                  {/* Note */}
                  {req.note && (
                    <p className="text-xs text-foreground flex items-start gap-1.5 pl-1">
                      <MessageSquare className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <span>
                        <strong className="text-muted-foreground font-semibold">
                          Staff Note:
                        </strong>{" "}
                        {req.note}
                      </span>
                    </p>
                  )}
                </div>

                {/* Actions for Pending Requests */}
                {req.status === "pending" && (
                  <div className="sm:w-64 space-y-3 shrink-0 pt-2 sm:pt-0">
                    <div className="space-y-1">
                      <Label
                        htmlFor={`note-swap-${req.swapRequestId}`}
                        className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Decision Note
                      </Label>
                      <textarea
                        id={`note-swap-${req.swapRequestId}`}
                        rows={2}
                        value={notes[req.swapRequestId] || ""}
                        onChange={(e) =>
                          handleNoteChange(req.swapRequestId, e.target.value)
                        }
                        placeholder="Optional notes..."
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs outline-none focus-visible:border-accent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          handleRespondSwap(req.swapRequestId, "approved")
                        }
                        size="sm"
                        disabled={respondToSwap.isPending}
                        className="flex-1 bg-teal-600 hover:bg-teal-700 gap-1.5"
                      >
                        <Check className="size-3.5" /> Approve
                      </Button>
                      <Button
                        onClick={() =>
                          handleRespondSwap(req.swapRequestId, "rejected")
                        }
                        size="sm"
                        variant="outline"
                        disabled={respondToSwap.isPending}
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5"
                      >
                        <X className="size-3.5" /> Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
