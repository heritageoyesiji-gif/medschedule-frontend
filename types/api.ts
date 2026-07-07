// auth
export type UserRole = "admin" | "staff" | "superadmin";

export type LoginRequest = {
  email: string;
  password: string;
};

export type SignupRequest = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  facilityId?: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export type SignupResponse = {
  userId: string;
  email: string;
  role: UserRole;
  token: string;
};

export type MagicLinkRequest = {
  email: string;
};

export type MagicLinkResponse = {
  message: string;
};

export type MagicLinkVerifyRequest = {
  token: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type ResetPasswordRequest = {
  token: string;
  password: string;
};

export type ResetPasswordResponse = {
  message: string;
};

export type InviteTokenInfo = {
  email: string;
  facilityId: string;
  facilityName: string;
};

export type InviteStaffRequest = {
  email: string;
};

export type InviteStaffResponse = {
  message: string;
};
export type ShiftType = "day" | "evening" | "night" | "D12" | "N12" | "D8" | "N8";

export type ShiftTypeConfig = {
  shiftType: string;
  label: string;
  startTime: string;
  endTime: string;
  durationHours: number;
};

export type ShiftConfigResponse = {
  configs: ShiftTypeConfig[];
};

export type OvertimeConfig = {
  employmentType: EmploymentType;
  biweeklyHours: number | null; // null = no biweekly OT threshold
};

export type OvertimeConfigResponse = {
  configs: OvertimeConfig[];
};
export type StaffRoleType = "RN" | "PSW" | "LPN" | "LTCA" | "doctor" | "technician";
export type EmploymentType =
  | "fulltime-permanent"
  | "fulltime-temporary"
  | "parttime-permanent"
  | "parttime-temporary"
  | "casual"
  | "travel";
export type RequestStatus = "pending" | "approved" | "rejected";
export type ShiftStatus = "confirmed" | "pending" | "cancelled";
export type NotificationType =
  | "schedule_published"
  | "shift_updated"
  | "swap_approved"
  | "swap_rejected"
  | "time_off_approved"
  | "time_off_rejected"
  | "announcement";

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
};

export type User = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  facilityId?: string | null;
};

export type CreateFacilityRequest = {
  name: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
};

export type CreateFacilityResponse = {
  facilityId: string;
  name: string;
  createdAt: string;
};

export type FacilitySummary = {
  facilityId: string;
  name: string;
  address: string;
  createdAt: string;
};

export type MyFacilitiesResponse = {
  facilities: FacilitySummary[];
};

export type Facility = CreateFacilityResponse & {
  address: string;
  contactEmail: string;
  contactPhone: string;
  staffCount: number;
};

export type StaffProfile = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  roleType: StaffRoleType;
  unit: string;
  qualifications: string[];
  employmentType: EmploymentType;
  availability: Record<string, ShiftType[]>;
  maxHoursPerWeek: number;
  status: "active" | "inactive";
  // Contact number shown to schedulers (e.g. to call someone to fill a gap).
  // Optional so existing profiles without a phone stay valid.
  phone?: string;
  // Free-text scheduling notes admins leave for schedulers, e.g. "can work
  // different units", "only work UTC", "prefers day shifts". Optional so
  // existing profiles without notes stay valid.
  notes?: string;
};

export type Shift = {
  shiftId: string;
  date: string;
  type: ShiftType;
  unit: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  status: ShiftStatus;
  publishedAt?: string;
  staff?: Pick<StaffProfile, "userId" | "firstName" | "lastName" | "roleType">;
};

export type StaffSchedule = {
  staffId: string;
  month: string;
  shifts: Shift[];
  totalShifts: number;
  totalHours: number;
};

export type AnnouncementsList = {
  announcements: Announcement[];
  total: number;
};

export type SwapRequest = {
  swapRequestId: string;
  status: RequestStatus;
  submittedAt: string;
  note: string;
  requester: {
    userId: string;
    firstName: string;
    lastName: string;
    shift: Pick<Shift, "shiftId" | "date" | "type" | "unit">;
  };
  targetStaff: {
    userId: string;
    firstName: string;
    lastName: string;
    shift: Pick<Shift, "shiftId" | "date" | "type" | "unit">;
  };
};

export type TimeOffRequest = {
  requestId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: RequestStatus;
  adminNote: string | null;
  submittedAt: string;
  staff?: Pick<
    StaffProfile,
    "userId" | "firstName" | "lastName" | "roleType" | "unit"
  >;
};

export type SubmitTimeOffRequest = {
  staffId: string;
  startDate: string;
  endDate: string;
  reason: string;
};

export type SubmitTimeOffResponse = {
  requestId: string;
  status: RequestStatus;
  submittedAt: string;
};

export type StaffTimeOffRequestsData = {
  requests: TimeOffRequest[];
  total: number;
};

export type SubmitSwapRequest = {
  requesterId: string;
  targetStaffId: string;
  requesterShiftId: string;
  targetShiftId: string;
  note: string;
};

export type SubmitSwapResponse = {
  swapRequestId: string;
  status: RequestStatus;
  submittedAt: string;
};

export type Notification = {
  notificationId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type NotificationsList = {
  notifications: Notification[];
  unreadCount: number;
};

export type QrTokenResponse = {
  qrToken: string;
  expiresAt: string;
  loginUrl: string;
};

export type QrLoginVerifyRequest = {
  token: string;
};

export type SchedulePublishedEvent = {
  facilityId: string;
  month: string;
  publishedAt: string;
};

export type ShiftUpdatedEvent = {
  shiftId: string;
  staffId: string;
  changes: {
    date?: string;
    type?: ShiftType;
    unit?: string;
  };
};

export type SwapApprovedEvent = {
  swapRequestId: string;
  requesterId: string;
  targetStaffId: string;
};

export type SwapRejectedEvent = {
  swapRequestId: string;
  requesterId: string;
};

export type TimeOffRespondedEvent = {
  requestId: string;
  staffId: string;
};

export type AnnouncementPostedEvent = {
  announcementId: string;
  facilityId: string;
  priority: "normal" | "urgent";
};

export type Announcement = {
  announcementId: string;
  title: string;
  body: string;
  priority: "normal" | "urgent";
  createdAt: string;
};

export type SuperStats = {
  facilityCount: number;
  userCount: number;
  staffCount: number;
  shiftCount: number;
};

export type SuperFacility = {
  facilityId: string;
  name: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  adminUserId: string;
  adminEmail: string;
  adminName: string;
  createdAt: string;
  staffCount: number;
};

export type SuperFacilitiesResponse = {
  facilities: SuperFacility[];
  total: number;
};

export type StaffingRequirement = {
  requirementId: string;
  facilityId: string;
  unit: string;
  shiftType: string;
  requiredRole: StaffRoleType;
  minCount: number;
};

export type StaffingRequirementsResponse = {
  requirements: StaffingRequirement[];
  total: number;
};

export type ScheduleGap = {
  date: string;
  type: string;
  unit: string;
  requiredRole: StaffRoleType;
  message: string;
};

export type OvertimeRisk = {
  userId: string;
  projectedHours: number;
  threshold: number;
  message: string;
};
