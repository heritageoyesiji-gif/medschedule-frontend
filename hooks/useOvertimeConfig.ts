import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { ApiResponse, OvertimeConfig, OvertimeConfigResponse } from "@/types/api";

export const overtimeConfigKeys = {
  facility: (facilityId: string) => ["overtimeConfig", facilityId] as const,
};

async function fetchOvertimeConfig(facilityId: string): Promise<OvertimeConfig[]> {
  const { data } = await api.get<ApiResponse<OvertimeConfigResponse>>(
    `/facilities/${facilityId}/overtime-config`,
  );
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? "Failed to load overtime config");
  }
  return data.data.configs;
}

export function useOvertimeConfig(facilityId: string | null) {
  return useQuery({
    queryKey: overtimeConfigKeys.facility(facilityId ?? ""),
    queryFn: () => fetchOvertimeConfig(facilityId!),
    enabled: Boolean(facilityId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateOvertimeConfig(facilityId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employmentType,
      biweeklyHours,
    }: {
      employmentType: string;
      biweeklyHours: number | null;
    }) => {
      const { data } = await api.put<ApiResponse<OvertimeConfig>>(
        `/facilities/${facilityId}/overtime-config/${employmentType}`,
        { biweeklyHours },
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to update overtime config");
      }
      return data.data;
    },
    onSuccess: () => {
      if (facilityId) {
        void queryClient.invalidateQueries({ queryKey: overtimeConfigKeys.facility(facilityId) });
      }
    },
  });
}

export function useResetOvertimeConfig(facilityId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employmentType: string) => {
      const { data } = await api.delete<ApiResponse<{ employmentType: string; reset: boolean }>>(
        `/facilities/${facilityId}/overtime-config/${employmentType}`,
      );
      if (!data.success) {
        throw new Error(data.error?.message ?? "Failed to reset overtime config");
      }
      return data.data;
    },
    onSuccess: () => {
      if (facilityId) {
        void queryClient.invalidateQueries({ queryKey: overtimeConfigKeys.facility(facilityId) });
      }
    },
  });
}
