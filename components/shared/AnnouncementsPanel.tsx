import type { Announcement } from "@/types/api";

type AnnouncementsPanelProps = {
  announcements: Announcement[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

export function AnnouncementsPanel({
  announcements,
  isLoading,
  isError,
  onRetry,
}: AnnouncementsPanelProps) {
  if (isLoading) {
    return (
      <ul className="space-y-3" aria-busy="true" aria-label="Loading announcements">
        {[1, 2].map((i) => (
          <li key={i} className="status-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-2.5 space-y-1.5">
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Could not load announcements.
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

  if (announcements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No announcements yet.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {announcements.map((announcement) => (
        <li
          key={announcement.announcementId}
          className={`status-card p-4 ${
            announcement.priority === "urgent"
              ? "status-card-accent"
              : "border-l-border"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-foreground">{announcement.title}</p>
            {announcement.priority === "urgent" ? (
              <span className="shrink-0 text-xs font-medium text-primary">
                Urgent
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {announcement.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
