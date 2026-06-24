import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type {
  ApiResponse,
  StaffingRequirement,
  StaffingRequirementsResponse,
} from "@/types/api";

export const requirementKeys = {
  all: ["requirements"] as const,
  facility: (facilityId: string) => ["requirements", facilityId] as const,
};

export function useRequirements(facilityId: string | null) {
  return useQuery({
    queryKey: requirementKeys.facility(facilityId ?? ""),
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<StaffingRequirementsResponse>>(
        `/facilities/${facilityId}/requirements`,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to load requirements");
      }
      return data.data;
    },
    enabled: Boolean(facilityId),
  });
}

type RequirementInput = Pick<
  StaffingRequirement,
  "unit" | "shiftType" | "requiredRole" | "minCount"
>;

export function useReplaceRequirements(facilityId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requirements: RequirementInput[]) => {
      const { data } = await api.put<ApiResponse<StaffingRequirementsResponse>>(
        `/facilities/${facilityId}/requirements`,
        { requirements },
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to save requirements");
      }
      return data.data;
    },
    onSuccess: (result) => {
      if (facilityId) {
        queryClient.setQueryData(
          requirementKeys.facility(facilityId),
          result,
        );
      }
    },
  });
}
