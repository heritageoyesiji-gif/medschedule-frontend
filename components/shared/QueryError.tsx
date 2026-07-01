"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shown when a data query fails (network error, 4xx/5xx). Distinguishes a failed
// load from a genuinely-empty result and offers a retry. React Query already
// retries transient failures, so this only appears after those are exhausted.
export function QueryError({
  title = "Couldn't load this",
  message = "Something went wrong while loading. Check your connection and try again.",
  onRetry,
  className = "",
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-dashed border-border bg-card p-8 text-center ${className}`}>
      <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 gap-1.5">
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}
