import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";
import type { ApiResponse, FacilitySummary, MyFacilitiesResponse } from "@/types/api";

const STORAGE_KEY = "medschedule_active_facility";

export function getStoredFacilityId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredFacilityId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function clearStoredFacilityId(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Returns the active facility ID: localStorage value takes priority, falls back to user.facilityId
export function useActiveFacilityId(): string | null {
  const { user } = useAuth();
  const stored = getStoredFacilityId();
  return stored ?? user?.facilityId ?? null;
}

export const myFacilitiesKey = ["facilities", "mine"] as const;

export function useMyFacilities() {
  return useQuery({
    queryKey: myFacilitiesKey,
    queryFn: async (): Promise<FacilitySummary[]> => {
      const { data } = await api.get<ApiResponse<MyFacilitiesResponse>>("/facilities/mine");
      if (!data.success || !data.data) return [];
      return data.data.facilities;
    },
    staleTime: 5 * 60 * 1000,
  });
}
