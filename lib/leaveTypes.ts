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

// Short form for the Scheduler grid's narrow cells — "off" is a fallback for
// approved time-off requests recorded before the leaveType field existed.
const SHORT_LABELS: Record<LeaveType, string> = {
  vacation: "Vacation",
  sick: "Sick",
  lieu: "Lieu",
};

export function getGridOffLabel(leaveType: LeaveType | "off"): string {
  if (leaveType === "off") return "Off";
  return SHORT_LABELS[leaveType] ?? leaveType;
}
