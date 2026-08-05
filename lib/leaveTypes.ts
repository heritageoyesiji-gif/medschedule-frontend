import type { LeaveType } from "@/types/api";

export const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "vacation", label: "Vacation" },
  { value: "sick", label: "Sick Leave" },
  { value: "lieu", label: "Lieu" },
];

export function getLeaveTypeLabel(leaveType: LeaveType | null): string {
  if (!leaveType) return "—";
  return LEAVE_TYPES.find((lt) => lt.value === leaveType)?.label ?? leaveType;
}
