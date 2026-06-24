"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useNotifications";
import { getApiErrorMessage } from "@/lib/apiError";
import type { Notification } from "@/types/api";

type NotificationBellProps = {
  userId: string;
};

function formatNotificationTime(createdAt: string): string {
  return new Date(createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, error, refetch } = useNotifications(userId);
  const markRead = useMarkNotificationRead(userId);

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.read) {
      return;
    }

    try {
      await markRead.mutateAsync(notification.notificationId);
    } catch (err) {
      console.error(getApiErrorMessage(err, "Failed to mark notification as read"));
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {isOpen ? (
        <div
          className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg md:w-96"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
            {unreadCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                {unreadCount} unread
              </p>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <ul className="divide-y divide-border" aria-busy="true" aria-label="Loading notifications">
                {[1, 2, 3].map((i) => (
                  <li key={i} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                      <div className="mt-1 size-2 rounded-full bg-muted" />
                    </div>
                    <div className="mt-1.5 space-y-1">
                      <div className="h-3 w-full animate-pulse rounded bg-muted" />
                      <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
                  </li>
                ))}
              </ul>
            ) : isError ? (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {getApiErrorMessage(error, "Could not load notifications")}
                </p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((notification) => (
                  <li key={notification.notificationId}>
                    <button
                      type="button"
                      onClick={() => void handleNotificationClick(notification)}
                      className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none ${
                        notification.read ? "opacity-70" : "bg-accent/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {notification.title}
                        </p>
                        {!notification.read ? (
                          <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        {formatNotificationTime(notification.createdAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
