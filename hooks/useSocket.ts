"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { announcementKeys } from "@/hooks/useAnnouncements";
import { adminScheduleKeys } from "@/hooks/useAdminSchedule";
import { useAuth } from "@/hooks/useAuth";
import { notificationKeys } from "@/hooks/useNotifications";
import { requestKeys } from "@/hooks/useRequests";
import { shiftKeys } from "@/hooks/useShifts";
import { getAuthToken } from "@/lib/authToken";
import type {
  AnnouncementPostedEvent,
  SchedulePublishedEvent,
  ShiftUpdatedEvent,
  SwapApprovedEvent,
  SwapRejectedEvent,
  TimeOffRespondedEvent,
} from "@/types/api";

function invalidateSchedules(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: shiftKeys.all });
  void queryClient.invalidateQueries({ queryKey: adminScheduleKeys.all });
}

function invalidateRequests(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: requestKeys.allSwap });
  void queryClient.invalidateQueries({ queryKey: requestKeys.allTimeOff });
}

export function useSocket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    const wsEnabled = process.env.NEXT_PUBLIC_WS_ENABLED !== "false";
    const token = getAuthToken();

    if (!user || !wsUrl || !token || !wsEnabled) {
      return;
    }

    let socket: Socket | null = null;

    socket = io(wsUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    const invalidateUserNotifications = () => {
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.user(user.userId),
      });
    };

    socket.on("schedule_published", (payload: SchedulePublishedEvent) => {
      toast.success(`Schedule published for ${payload.month}`);
      invalidateSchedules(queryClient);
      invalidateUserNotifications();
    });

    socket.on("shift_updated", (payload: ShiftUpdatedEvent) => {
      toast.info("A shift on your schedule was updated");
      invalidateSchedules(queryClient);
      invalidateUserNotifications();
    });

    socket.on("swap_approved", (_payload: SwapApprovedEvent) => {
      toast.success("Swap request approved");
      invalidateSchedules(queryClient);
      invalidateRequests(queryClient);
      invalidateUserNotifications();
    });

    socket.on("swap_rejected", (_payload: SwapRejectedEvent) => {
      toast.info("Swap request was not approved");
      invalidateRequests(queryClient);
      invalidateUserNotifications();
    });

    socket.on("time_off_approved", (_payload: TimeOffRespondedEvent) => {
      toast.success("Time off request approved");
      invalidateRequests(queryClient);
      invalidateUserNotifications();
    });

    socket.on("time_off_rejected", (_payload: TimeOffRespondedEvent) => {
      toast.info("Time off request was not approved");
      invalidateRequests(queryClient);
      invalidateUserNotifications();
    });

    socket.on("announcement_posted", (payload: AnnouncementPostedEvent) => {
      const label =
        payload.priority === "urgent" ? "Urgent announcement posted" : "New announcement posted";
      toast.info(label);
      void queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      invalidateUserNotifications();
    });

    return () => {
      socket?.disconnect();
    };
  }, [user, queryClient]);
}
