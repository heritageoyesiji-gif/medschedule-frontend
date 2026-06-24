import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { ApiResponse, StaffSchedule } from "@/types/api";

export const shiftKeys = {
  all: ["shifts"] as const,
  staff: (staffId: string, month: string) =>
    ["shifts", staffId, month] as const,
};

async function fetchStaffShifts(
  staffId: string,
  month: string,
): Promise<StaffSchedule> {
  const { data } = await api.get<ApiResponse<StaffSchedule>>("/shifts", {
    params: { staffId, month },
  });

  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? "Failed to load schedule");
  }

  return data.data;
}

export function useStaffShifts(staffId: string | null, month: string) {
  return useQuery({
    queryKey: shiftKeys.staff(staffId ?? "", month),
    queryFn: () => fetchStaffShifts(staffId!, month),
    enabled: Boolean(staffId && month),
  });
}
