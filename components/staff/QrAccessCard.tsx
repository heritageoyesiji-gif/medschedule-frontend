"use client";

import QRCode from "react-qr-code";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQrToken } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/apiError";

type QrAccessCardProps = {
  enabled: boolean;
};

function formatExpiry(expiresAt: string): string {
  return new Date(expiresAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function QrAccessCard({ enabled }: QrAccessCardProps) {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useQrToken(enabled);

  if (!enabled) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">Quick access QR</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Scan with your phone to open your schedule without typing a password.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label="Refresh QR code"
        >
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {isLoading ? (
        <div className="mx-auto mt-4 size-40 animate-pulse rounded-lg bg-muted" />
      ) : isError ? (
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            {getApiErrorMessage(error, "Could not load QR code")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </div>
      ) : data ? (
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="rounded-lg border border-border bg-white p-3">
            <QRCode
              value={data.loginUrl}
              size={160}
              level="M"
              className="h-auto max-w-full w-full"
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Expires at {formatExpiry(data.expiresAt)}
          </p>
        </div>
      ) : null}
    </section>
  );
}
