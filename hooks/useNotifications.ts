import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { ApiResponse, NotificationsList } from "@/types/api";

export const notificationKeys = {
  all: ["notifications"] as const,
  user: (userId: string, unreadOnly?: boolean) =>
    ["notifications", userId, unreadOnly ?? false] as const,
};

async function fetchNotifications(
  userId: string,
  unreadOnly?: boolean,
): Promise<NotificationsList> {
  const { data } = await api.get<ApiResponse<NotificationsList>>(
    "/notifications",
    {
      params: {
        userId,
        ...(unreadOnly ? { unreadOnly: true } : {}),
      },
    },
  );

  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? "Failed to load notifications");
  }

  return data.data;
}

export function useNotifications(userId: string | null, unreadOnly?: boolean) {
  return useQuery({
    queryKey: notificationKeys.user(userId ?? "", unreadOnly),
    queryFn: () => fetchNotifications(userId!, unreadOnly),
    enabled: Boolean(userId),
  });
}

type MarkReadResponse = {
  notificationId: string;
  read: boolean;
};

export function useMarkNotificationRead(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await api.patch<ApiResponse<MarkReadResponse>>(
        `/notifications/${notificationId}/read`,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to mark notification as read");
      }
      return data.data;
    },
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: notificationKeys.user(userId),
        });
      }
    },
  });
}
