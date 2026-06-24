import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { ApiResponse, SuperFacilitiesResponse, SuperStats } from "@/types/api";

export const superKeys = {
  stats: ["super", "stats"] as const,
  facilities: ["super", "facilities"] as const,
};

export function useSuperStats() {
  return useQuery({
    queryKey: superKeys.stats,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<SuperStats>>("/super/stats");
      if (!data.success || !data.data) throw new Error("Failed to load stats");
      return data.data;
    },
  });
}

export function useSuperFacilities() {
  return useQuery({
    queryKey: superKeys.facilities,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<SuperFacilitiesResponse>>("/super/facilities");
      if (!data.success || !data.data) throw new Error("Failed to load facilities");
      return data.data;
    },
  });
}

export function useDeactivateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (facilityId: string) => {
      const { data } = await api.patch<ApiResponse<{ deactivated: boolean }>>(
        `/super/facilities/${facilityId}/deactivate`,
      );
      if (!data.success) throw new Error("Failed to deactivate facility");
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: superKeys.facilities });
    },
  });
}

export function useReactivateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (facilityId: string) => {
      const { data } = await api.patch<ApiResponse<{ reactivated: boolean }>>(
        `/super/facilities/${facilityId}/reactivate`,
      );
      if (!data.success) throw new Error("Failed to reactivate facility");
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: superKeys.facilities });
    },
  });
}
