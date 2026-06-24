import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { ApiResponse, InviteStaffRequest, InviteStaffResponse, ShiftType, StaffProfile } from "@/types/api";

export const staffKeys = {
  all: ["staff"] as const,
  facility: (facilityId: string) => ["staff", "facility", facilityId] as const,
  profile: (staffId: string) => ["staff", "profile", staffId] as const,
};

export type FacilityStaffData = {
  staff: StaffProfile[];
  total: number;
};

export type AddStaffPayload = Omit<
  StaffProfile,
  "userId" | "status"
>;

export type UpdateStaffPayload = Partial<
  Omit<StaffProfile, "userId" | "email" | "status">
>;

// 3.1 Get All Staff (Admin)
async function fetchFacilityStaff(facilityId: string): Promise<FacilityStaffData> {
  const { data } = await api.get<ApiResponse<FacilityStaffData>>(
    `/facilities/${facilityId}/staff`,
  );
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? "Failed to load staff profiles");
  }
  return data.data;
}

export function useFacilityStaff(facilityId: string | null) {
  return useQuery({
    queryKey: staffKeys.facility(facilityId ?? ""),
    queryFn: () => fetchFacilityStaff(facilityId!),
    enabled: Boolean(facilityId),
  });
}

// 3.2 Get Single Staff Profile (Admin or own)
async function fetchStaffProfile(staffId: string): Promise<StaffProfile> {
  const { data } = await api.get<ApiResponse<StaffProfile>>(`/staff/${staffId}`);
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? "Failed to load staff profile");
  }
  return data.data;
}

export function useStaffProfile(staffId: string | null) {
  return useQuery({
    queryKey: staffKeys.profile(staffId ?? ""),
    queryFn: () => fetchStaffProfile(staffId!),
    enabled: Boolean(staffId),
  });
}

// 3.3 Add Staff Member (Admin)
export function useAddStaff(facilityId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddStaffPayload) => {
      const { data } = await api.post<ApiResponse<StaffProfile>>(
        `/facilities/${facilityId}/staff`,
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to add staff member");
      }
      return data.data;
    },
    onSuccess: () => {
      if (facilityId) {
        void queryClient.invalidateQueries({
          queryKey: staffKeys.facility(facilityId),
        });
      }
    },
  });
}

// 3.4 Update Staff Profile (Admin)
export function useUpdateStaff(facilityId: string | null, staffId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateStaffPayload) => {
      const { data } = await api.patch<ApiResponse<StaffProfile>>(
        `/staff/${staffId}`,
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to update staff member");
      }
      return data.data;
    },
    onSuccess: (updatedProfile) => {
      void queryClient.invalidateQueries({
        queryKey: staffKeys.profile(staffId),
      });
      if (facilityId) {
        void queryClient.invalidateQueries({
          queryKey: staffKeys.facility(facilityId),
        });
      }
    },
  });
}

// 3.2a Update own availability (staff or admin)
export function useUpdateAvailability(staffId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (availability: Record<string, ShiftType[]>) => {
      const { data } = await api.patch<ApiResponse<StaffProfile>>(
        `/staff/${staffId}/availability`,
        { availability },
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to update availability");
      }
      return data.data;
    },
    onSuccess: (updatedProfile) => {
      if (staffId) {
        queryClient.setQueryData(staffKeys.profile(staffId), updatedProfile);
      }
    },
  });
}

// 3.6 Invite Staff Member by email (Admin)
export function useInviteStaff(facilityId: string | null) {
  return useMutation({
    mutationFn: async (payload: InviteStaffRequest) => {
      const { data } = await api.post<ApiResponse<InviteStaffResponse>>(
        `/facilities/${facilityId}/staff/invite`,
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to send invitation");
      }
      return data.data;
    },
  });
}

// 3.5 Deactivate Staff Member (Admin)
type DeactivateResponse = {
  userId: string;
  status: "inactive";
};

export function useDeactivateStaff(facilityId: string | null, staffId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.patch<ApiResponse<DeactivateResponse>>(
        `/staff/${staffId}/deactivate`,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to deactivate staff member");
      }
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: staffKeys.profile(staffId),
      });
      if (facilityId) {
        void queryClient.invalidateQueries({
          queryKey: staffKeys.facility(facilityId),
        });
      }
    },
  });
}
