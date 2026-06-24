import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/hooks/useAuth";
import { api } from "@/lib/axios";
import type {
  ApiResponse,
  CreateFacilityRequest,
  CreateFacilityResponse,
} from "@/types/api";

export const facilityKeys = {
  all: ["facilities"] as const,
  detail: (facilityId: string) => ["facilities", facilityId] as const,
};

export function useCreateFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateFacilityRequest) => {
      const { data } = await api.post<ApiResponse<CreateFacilityResponse>>(
        "/facilities",
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to create facility");
      }
      return data.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: authKeys.me,
      }),
  });
}
