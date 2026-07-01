import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { ApiResponse, ScheduleGap, OvertimeRisk, Shift, ShiftType } from "@/types/api";

export const adminScheduleKeys = {
  all: ["adminSchedule"] as const,
  facilityMonth: (facilityId: string, month: string) =>
    ["adminSchedule", "facility", facilityId, "month", month] as const,
};

export type FacilityScheduleData = {
  facilityId: string;
  month: string;
  published: boolean;
  shifts: Shift[];
  gaps: ScheduleGap[];
  overtimeRisks: OvertimeRisk[];
};

export type CreateShiftPayload = {
  facilityId: string;
  staffId: string;
  date: string;
  type: ShiftType;
  unit: string;
  startTime: string;
  endTime: string;
};

export type UpdateShiftPayload = {
  shiftId: string;
  date?: string;
  type?: ShiftType;
  staffId?: string;
  unit?: string;
  startTime?: string;
  endTime?: string;
};

export type PublishScheduleResponse = {
  month: string;
  published: boolean;
  publishedAt: string;
  notifiedStaffCount: number;
};

export type AIGenerateScheduleResponse = {
  month: string;
  generatedShifts: {
    staffId: string;
    date: string;
    type: ShiftType;
    unit: string;
    startTime: string;
    endTime: string;
  }[];
  totalShifts: number;
  warnings: string[];
  saved: boolean;
};

export type AIConfirmResponse = {
  savedShifts: number;
  month: string;
};

// 4.2 Get Full Facility Schedule (Admin)
async function fetchFacilitySchedule(
  facilityId: string,
  month: string,
): Promise<FacilityScheduleData> {
  const { data } = await api.get<ApiResponse<FacilityScheduleData>>(
    `/facilities/${facilityId}/schedule`,
    { params: { month } },
  );
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? "Failed to load facility schedule");
  }
  return data.data;
}

export function useFacilitySchedule(facilityId: string | null, month: string) {
  return useQuery({
    queryKey: adminScheduleKeys.facilityMonth(facilityId ?? "", month),
    queryFn: () => fetchFacilitySchedule(facilityId!, month),
    enabled: Boolean(facilityId && month),
  });
}

// 4.3 Create Single Shift (Admin - Manual)
export function useCreateShift(facilityId: string | null, month: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateShiftPayload) => {
      const { data } = await api.post<ApiResponse<Shift>>("/shifts", payload);
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to create shift");
      }
      return data.data;
    },
    onSuccess: () => {
      if (facilityId && month) {
        void queryClient.invalidateQueries({
          queryKey: adminScheduleKeys.facilityMonth(facilityId, month),
        });
      }
    },
  });
}

// 4.4 Update Shift (Admin - Drag & Drop / Edit)
export function useUpdateShift(facilityId: string | null, month: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shiftId, ...payload }: UpdateShiftPayload) => {
      const { data } = await api.patch<ApiResponse<Shift>>(
        `/shifts/${shiftId}`,
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to update shift");
      }
      return data.data;
    },
    onSuccess: () => {
      if (facilityId && month) {
        void queryClient.invalidateQueries({
          queryKey: adminScheduleKeys.facilityMonth(facilityId, month),
        });
      }
    },
  });
}

// 4.5 Delete Shift (Admin)
type DeleteShiftResponse = {
  shiftId: string;
  deleted: boolean;
};

export function useDeleteShift(facilityId: string | null, month: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shiftId: string) => {
      const { data } = await api.delete<ApiResponse<DeleteShiftResponse>>(
        `/shifts/${shiftId}`,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to delete shift");
      }
      return data.data;
    },
    onSuccess: () => {
      if (facilityId && month) {
        void queryClient.invalidateQueries({
          queryKey: adminScheduleKeys.facilityMonth(facilityId, month),
        });
      }
    },
  });
}

// 4.6 Publish Schedule (Admin)
export function usePublishSchedule(facilityId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (month: string) => {
      const { data } = await api.post<ApiResponse<PublishScheduleResponse>>(
        `/facilities/${facilityId}/schedule/publish`,
        { month },
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to publish schedule");
      }
      return data.data;
    },
    onSuccess: (_, month) => {
      if (facilityId) {
        void queryClient.invalidateQueries({
          queryKey: adminScheduleKeys.facilityMonth(facilityId, month),
        });
      }
    },
  });
}

// 4.6b Unpublish Schedule (Admin)
export type UnpublishScheduleResponse = {
  month: string;
  published: boolean;
  affectedCount: number;
};

export function useUnpublishSchedule(facilityId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (month: string) => {
      const { data } = await api.post<ApiResponse<UnpublishScheduleResponse>>(
        `/facilities/${facilityId}/schedule/unpublish`,
        { month },
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to unpublish schedule");
      }
      return data.data;
    },
    onSuccess: (_, month) => {
      if (facilityId) {
        void queryClient.invalidateQueries({
          queryKey: adminScheduleKeys.facilityMonth(facilityId, month),
        });
      }
    },
  });
}

// 5.1 Generate Schedule (Preview)
type GenerateAIPayload = {
  facilityId: string;
  month: string;
  command: string;
};

export function useGenerateAISchedule() {
  return useMutation({
    mutationFn: async (payload: GenerateAIPayload) => {
      const { data } = await api.post<ApiResponse<AIGenerateScheduleResponse>>(
        "/ai/generate-schedule",
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to generate AI schedule preview");
      }
      return data.data;
    },
  });
}

// 4.7 Copy schedule forward
export type CopyScheduleResponse = {
  copiedCount: number;
  skippedCount: number;
};

export function useCopySchedule(facilityId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sourceMonth, targetMonth }: { sourceMonth: string; targetMonth: string }) => {
      const { data } = await api.post<ApiResponse<CopyScheduleResponse>>(
        `/facilities/${facilityId}/schedule/copy-forward`,
        { sourceMonth, targetMonth },
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to copy schedule");
      }
      return data.data;
    },
    onSuccess: (_, variables) => {
      if (facilityId) {
        void queryClient.invalidateQueries({
          queryKey: adminScheduleKeys.facilityMonth(facilityId, variables.targetMonth),
        });
      }
    },
  });
}

// 5.2 Confirm AI-Generated Schedule
type ConfirmAIPayload = {
  facilityId: string;
  month: string;
};

export function useConfirmAISchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ConfirmAIPayload) => {
      const { data } = await api.post<ApiResponse<AIConfirmResponse>>(
        "/ai/generate-schedule/confirm",
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to confirm AI schedule");
      }
      return data.data;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminScheduleKeys.facilityMonth(variables.facilityId, variables.month),
      });
    },
  });
}
