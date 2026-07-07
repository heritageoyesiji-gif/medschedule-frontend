import type { EmploymentType, StaffRoleType } from "@/types/api";

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  "fulltime-permanent":  "Full-time Permanent",
  "fulltime-temporary":  "Full-time Temporary",
  "parttime-permanent":  "Part-time Permanent",
  "parttime-temporary":  "Part-time Temporary",
  "casual":              "Casual",
  "travel":              "Travel Staff",
};

export function getEmploymentLabel(type: EmploymentType | string): string {
  return (EMPLOYMENT_TYPE_LABELS as Record<string, string>)[type] ?? type;
}

export const ROLE_TYPE_LABELS: Record<StaffRoleType, string> = {
  RN:          "RN",
  LPN:         "LPN",
  PSW:         "CCA/PSW",
  LTCA:        "LTCA",
  doctor:      "Doctor",
  technician:  "Technician",
};

export const ROLE_TYPE_COLORS: Record<StaffRoleType, { bg: string; text: string; border: string }> = {
  RN:         { bg: "bg-purple-100",  text: "text-purple-800",  border: "border-purple-300"  },
  LPN:        { bg: "bg-teal-100",    text: "text-teal-800",    border: "border-teal-300"    },
  PSW:        { bg: "bg-amber-100",   text: "text-amber-800",   border: "border-amber-300"   },
  LTCA:       { bg: "bg-rose-100",    text: "text-rose-800",    border: "border-rose-300"    },
  doctor:     { bg: "bg-blue-100",    text: "text-blue-800",    border: "border-blue-300"    },
  technician: { bg: "bg-slate-100",   text: "text-slate-700",   border: "border-slate-300"   },
};

export const ROLE_TYPE_DOT_COLOR: Record<StaffRoleType, string> = {
  RN:         "#7C3AED",
  LPN:        "#0D9488",
  PSW:        "#B45309",
  LTCA:       "#BE185D",
  doctor:     "#1D4ED8",
  technician: "#475569",
};

export function getRoleLabel(role: StaffRoleType): string {
  return ROLE_TYPE_LABELS[role] ?? role;
}

export function getRoleColors(role: StaffRoleType) {
  return ROLE_TYPE_COLORS[role] ?? { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
}

export function getRoleDotColor(role: StaffRoleType): string {
  return ROLE_TYPE_DOT_COLOR[role] ?? "#6B7280";
}
