import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { ApiResponse, ShiftConfigResponse, ShiftTypeConfig } from "@/types/api";

export const shiftConfigKeys = {
  facility: (facilityId: string) => ["shiftConfig", facilityId] as const,
};

async function fetchShiftConfig(facilityId: string): Promise<ShiftTypeConfig[]> {
  const { data } = await api.get<ApiResponse<ShiftConfigResponse>>(
    `/facilities/${facilityId}/shift-config`,
  );
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? "Failed to load shift config");
  }
  return data.data.configs;
}

export function useShiftConfig(facilityId: string | null) {
  return useQuery({
    queryKey: shiftConfigKeys.facility(facilityId ?? ""),
    queryFn: () => fetchShiftConfig(facilityId!),
    enabled: Boolean(facilityId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateShiftTypeConfig(facilityId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shiftType,
      ...patch
    }: { shiftType: string } & Partial<Omit<ShiftTypeConfig, "shiftType">>) => {
      const { data } = await api.put<ApiResponse<ShiftTypeConfig>>(
        `/facilities/${facilityId}/shift-config/${shiftType}`,
        patch,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to update shift config");
      }
      return data.data;
    },
    onSuccess: () => {
      if (facilityId) {
        void queryClient.invalidateQueries({ queryKey: shiftConfigKeys.facility(facilityId) });
      }
    },
  });
}

export function useResetShiftTypeConfig(facilityId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shiftType: string) => {
      const { data } = await api.delete<ApiResponse<{ shiftType: string; reset: boolean }>>(
        `/facilities/${facilityId}/shift-config/${shiftType}`,
      );
      if (!data.success) {
        throw new Error(data.error?.message ?? "Failed to reset shift config");
      }
      return data.data;
    },
    onSuccess: () => {
      if (facilityId) {
        void queryClient.invalidateQueries({ queryKey: shiftConfigKeys.facility(facilityId) });
      }
    },
  });
}
