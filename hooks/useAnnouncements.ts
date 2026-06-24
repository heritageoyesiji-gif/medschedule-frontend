import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { Announcement, AnnouncementsList, ApiResponse } from "@/types/api";

export const announcementKeys = {
  all: ["announcements"] as const,
  facility: (facilityId: string) => ["announcements", facilityId] as const,
};

export type CreateAnnouncementRequest = {
  facilityId: string;
  title: string;
  body: string;
  priority: "normal" | "urgent";
};

async function fetchAnnouncements(
  facilityId: string,
): Promise<AnnouncementsList> {
  const { data } = await api.get<ApiResponse<AnnouncementsList>>(
    `/facilities/${facilityId}/announcements`,
  );

  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? "Failed to load announcements");
  }

  return data.data;
}

export function useAnnouncements(facilityId: string | null) {
  return useQuery({
    queryKey: announcementKeys.facility(facilityId ?? ""),
    queryFn: () => fetchAnnouncements(facilityId!),
    enabled: Boolean(facilityId),
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAnnouncementRequest) => {
      const { data } = await api.post<ApiResponse<Announcement>>(
        "/announcements",
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to create announcement");
      }
      return data.data;
    },
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: announcementKeys.facility(variables.facilityId),
      });
    },
  });
}
