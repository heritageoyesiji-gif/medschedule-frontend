import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type {
  AdminCreateTimeOffRequest,
  ApiResponse,
  RequestStatus,
  StaffTimeOffRequestsData,
  SubmitSwapRequest,
  SubmitSwapResponse,
  SubmitTimeOffRequest,
  SubmitTimeOffResponse,
  SwapRequest,
  TimeOffRequest,
} from "@/types/api";

export const requestKeys = {
  allSwap: ["swapRequests"] as const,
  facilitySwap: (facilityId: string, status?: RequestStatus) =>
    ["swapRequests", "facility", facilityId, status].filter(Boolean) as (
      | string
      | undefined
    )[],
  staffTimeOff: (staffId: string) => ["timeOffRequests", "staff", staffId] as const,
  allTimeOff: ["timeOffRequests"] as const,
  facilityTimeOff: (facilityId: string, status?: RequestStatus) =>
    ["timeOffRequests", "facility", facilityId, status].filter(Boolean) as (
      | string
      | undefined
    )[],
};

export type FacilitySwapRequestsData = {
  swapRequests: SwapRequest[];
  total: number;
};

export type FacilityTimeOffRequestsData = {
  requests: TimeOffRequest[];
  total: number;
};

export type RespondToRequestPayload = {
  status: "approved" | "rejected";
  adminNote?: string;
};

// 6.2 Get Facility Swap Requests (Admin)
async function fetchFacilitySwapRequests(
  facilityId: string,
  status?: RequestStatus,
): Promise<FacilitySwapRequestsData> {
  const { data } = await api.get<ApiResponse<FacilitySwapRequestsData>>(
    `/facilities/${facilityId}/swap-requests`,
    { params: status ? { status } : undefined },
  );
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? "Failed to load swap requests");
  }
  return data.data;
}

export function useSwapRequests(facilityId: string | null, status?: RequestStatus) {
  return useQuery({
    queryKey: requestKeys.facilitySwap(facilityId ?? "", status),
    queryFn: () => fetchFacilitySwapRequests(facilityId!, status),
    enabled: Boolean(facilityId),
  });
}

// 6.3 Respond to Swap Request (Admin)
export function useRespondToSwapRequest(facilityId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      swapRequestId,
      payload,
    }: {
      swapRequestId: string;
      payload: RespondToRequestPayload;
    }) => {
      const { data } = await api.patch<ApiResponse<{ swapRequestId: string; status: RequestStatus }>>(
        `/swap-requests/${swapRequestId}`,
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to respond to swap request");
      }
      return data.data;
    },
    onSuccess: () => {
      if (facilityId) {
        void queryClient.invalidateQueries({
          queryKey: requestKeys.allSwap,
        });
      }
    },
  });
}

// 7.3 Get All Time Off Requests (Admin)
async function fetchFacilityTimeOffRequests(
  facilityId: string,
  status?: RequestStatus,
): Promise<FacilityTimeOffRequestsData> {
  const { data } = await api.get<ApiResponse<FacilityTimeOffRequestsData>>(
    `/facilities/${facilityId}/time-off`,
    { params: status ? { status } : undefined },
  );
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? "Failed to load time-off requests");
  }
  return data.data;
}

export function useTimeOffRequests(
  facilityId: string | null,
  status?: RequestStatus,
) {
  return useQuery({
    queryKey: requestKeys.facilityTimeOff(facilityId ?? "", status),
    queryFn: () => fetchFacilityTimeOffRequests(facilityId!, status),
    enabled: Boolean(facilityId),
  });
}

// 7.4 Respond to Time Off Request (Admin)
export function useRespondToTimeOffRequest(facilityId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      payload,
    }: {
      requestId: string;
      payload: RespondToRequestPayload;
    }) => {
      const { data } = await api.patch<ApiResponse<TimeOffRequest>>(
        `/time-off/${requestId}`,
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to respond to time off request");
      }
      return data.data;
    },
    onSuccess: () => {
      if (facilityId) {
        void queryClient.invalidateQueries({
          queryKey: requestKeys.allTimeOff,
        });
      }
    },
  });
}

// 7.2 Get Staff's Own Time Off Requests
async function fetchStaffTimeOffRequests(
  staffId: string,
): Promise<StaffTimeOffRequestsData> {
  const { data } = await api.get<ApiResponse<StaffTimeOffRequestsData>>(
    "/time-off",
    { params: { staffId } },
  );
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? "Failed to load your time-off requests");
  }
  return data.data;
}

export function useStaffTimeOffRequests(staffId: string | null) {
  return useQuery({
    queryKey: requestKeys.staffTimeOff(staffId ?? ""),
    queryFn: () => fetchStaffTimeOffRequests(staffId!),
    enabled: Boolean(staffId),
  });
}

// 7.1 Submit Time Off Request (Staff)
export function useSubmitTimeOffRequest(staffId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SubmitTimeOffRequest) => {
      const { data } = await api.post<ApiResponse<SubmitTimeOffResponse>>(
        "/time-off",
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to submit time-off request");
      }
      return data.data;
    },
    onSuccess: () => {
      if (staffId) {
        void queryClient.invalidateQueries({
          queryKey: requestKeys.staffTimeOff(staffId),
        });
        void queryClient.invalidateQueries({
          queryKey: requestKeys.allTimeOff,
        });
      }
    },
  });
}

// 7.1b Create Time Off / Leave on behalf of a staff member (admin)
export function useAdminCreateTimeOff(facilityId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AdminCreateTimeOffRequest) => {
      const { data } = await api.post<ApiResponse<TimeOffRequest & { staffId: string }>>(
        `/facilities/${facilityId}/time-off`,
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to create leave");
      }
      return data.data;
    },
    onSuccess: (_, variables) => {
      if (facilityId) {
        void queryClient.invalidateQueries({ queryKey: requestKeys.allTimeOff });
        void queryClient.invalidateQueries({
          queryKey: requestKeys.staffTimeOff(variables.staffId),
        });
      }
    },
  });
}

// 6.1 Submit Swap Request (Staff)
export function useSubmitSwapRequest(staffId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SubmitSwapRequest) => {
      const { data } = await api.post<ApiResponse<SubmitSwapResponse>>(
        "/swap-requests",
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to submit swap request");
      }
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: requestKeys.allSwap });
      if (staffId) {
        void queryClient.invalidateQueries({
          queryKey: requestKeys.staffTimeOff(staffId),
        });
      }
    },
  });
}
