import type { RequestStatus, TimeOffRequest } from "@/types/api";
import { formatShiftDate } from "@/lib/schedule";

type TimeOffRequestsListProps = {
  requests: TimeOffRequest[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

function getStatusBorderClass(status: RequestStatus): string {
  switch (status) {
    case "pending":
      return "status-card-accent";
    case "approved":
      return "border-l-[#0F766E]";
    case "rejected":
      return "border-l-muted-foreground/40";
  }
}

export function TimeOffRequestsList({
  requests,
  isLoading,
  isError,
  onRetry,
}: TimeOffRequestsListProps) {
  if (isLoading) {
    return (
      <ul className="space-y-3" aria-busy="true" aria-label="Loading time-off requests">
        {[1, 2].map((i) => (
          <li key={i} className="status-card border-l-muted p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="h-4 w-44 animate-pulse rounded bg-muted" />
              <div className="h-4 w-14 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-28 animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Could not load your requests.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Try again
        </button>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <p className="text-sm font-medium text-foreground">No requests yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Time-off requests you submit will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {requests.map((request) => (
        <li
          key={request.requestId}
          className={`status-card p-4 ${getStatusBorderClass(request.status)}`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              {formatShiftDate(request.startDate)}
              {request.endDate !== request.startDate
                ? ` – ${formatShiftDate(request.endDate)}`
                : null}
            </p>
            <span className="shrink-0 text-xs capitalize text-muted-foreground">
              {request.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{request.reason}</p>
          {request.adminNote ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Admin note: {request.adminNote}
            </p>
          ) : null}
          <p className="mt-2 text-[10px] text-muted-foreground">
            Submitted {new Date(request.submittedAt).toLocaleDateString()}
          </p>
        </li>
      ))}
    </ul>
  );
}
