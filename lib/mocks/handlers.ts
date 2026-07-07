import { http, HttpResponse } from "msw";
import type {
  Announcement,
  Notification,
  Shift,
  ShiftStatus,
  ShiftType,
  StaffProfile,
  SwapRequest,
  TimeOffRequest,
  User,
} from "@/types/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

// ─── helpers ─────────────────────────────────────────────────────────────────

function ok<T>(data: T) {
  return HttpResponse.json({ success: true, data, error: null });
}

function fail(code: string, message: string, status = 400) {
  return HttpResponse.json(
    { success: false, data: null, error: { code, message } },
    { status },
  );
}

function tokenUser(req: Request): "admin" | "staff" | null {
  const auth = req.headers.get("Authorization") ?? "";
  if (auth.includes("admin")) return "admin";
  if (auth.includes("staff")) return "staff";
  return null;
}

function shiftTimes(type: ShiftType): { startTime: string; endTime: string; durationHours: number } {
  const map: Record<ShiftType, { startTime: string; endTime: string; durationHours: number }> = {
    day:     { startTime: "07:00", endTime: "19:00", durationHours: 12 },
    evening: { startTime: "15:00", endTime: "23:00", durationHours: 8  },
    night:   { startTime: "19:00", endTime: "07:00", durationHours: 12 },
    D12:     { startTime: "07:00", endTime: "19:00", durationHours: 12 },
    N12:     { startTime: "19:00", endTime: "07:00", durationHours: 12 },
    D8:      { startTime: "07:00", endTime: "15:00", durationHours: 8  },
    N8:      { startTime: "23:00", endTime: "07:00", durationHours: 8  },
  };
  return map[type];
}

let idCounter = 100;
function nextId(prefix: string) {
  return `${prefix}_${++idCounter}`;
}

// ─── seed data ────────────────────────────────────────────────────────────────

const ADMIN_USER: User = {
  userId: "usr_adm001",
  firstName: "Sarah",
  lastName: "Chen",
  email: "admin@sunridge.com",
  role: "admin",
  facilityId: "fac_001",
};

const STAFF_USER: User = {
  userId: "usr_001",
  firstName: "Amara",
  lastName: "Johnson",
  email: "amara@sunridge.com",
  role: "staff",
  facilityId: "fac_001",
};

export const DEV_CREDENTIALS = {
  admin: { email: "admin@sunridge.com", password: "password" },
  staff: { email: "amara@sunridge.com", password: "password" },
};

const STAFF_PROFILES: StaffProfile[] = [
  {
    userId: "usr_001",
    firstName: "Amara",
    lastName: "Johnson",
    email: "amara@sunridge.com",
    roleType: "RN",
    unit: "ICU",
    qualifications: ["Critical Care", "ACLS"],
    employmentType: "fulltime-permanent",
    availability: {
      monday: ["day", "evening"],
      tuesday: ["day", "evening"],
      wednesday: ["day"],
      thursday: ["day", "evening"],
      friday: ["day"],
      saturday: [],
      sunday: [],
    },
    maxHoursPerWeek: 40,
    status: "active",
  },
  {
    userId: "usr_002",
    firstName: "David",
    lastName: "Osei",
    email: "david@sunridge.com",
    roleType: "PSW",
    unit: "Emergency",
    qualifications: ["First Aid", "CPR"],
    employmentType: "fulltime-permanent",
    availability: {
      monday: ["day", "evening", "night"],
      tuesday: ["day", "evening", "night"],
      wednesday: ["day", "evening"],
      thursday: ["day"],
      friday: ["day", "evening"],
      saturday: ["day"],
      sunday: [],
    },
    maxHoursPerWeek: 40,
    status: "active",
  },
  {
    userId: "usr_003",
    firstName: "Priya",
    lastName: "Mehta",
    email: "priya@sunridge.com",
    roleType: "LPN",
    unit: "General Ward",
    qualifications: ["Wound Care", "IV Therapy"],
    employmentType: "parttime-permanent",
    availability: {
      monday: ["evening"],
      tuesday: ["evening"],
      wednesday: ["evening"],
      thursday: [],
      friday: ["evening"],
      saturday: [],
      sunday: [],
    },
    maxHoursPerWeek: 24,
    status: "active",
  },
  {
    userId: "usr_004",
    firstName: "James",
    lastName: "Wilson",
    email: "james@sunridge.com",
    roleType: "RN",
    unit: "ICU",
    qualifications: ["Critical Care", "ACLS", "PALS"],
    employmentType: "fulltime-permanent",
    availability: {
      monday: ["day", "evening", "night"],
      tuesday: ["day", "evening", "night"],
      wednesday: ["day", "evening", "night"],
      thursday: ["day", "evening", "night"],
      friday: ["day", "evening", "night"],
      saturday: ["day"],
      sunday: ["day"],
    },
    maxHoursPerWeek: 48,
    status: "active",
  },
  {
    userId: "usr_005",
    firstName: "Sofia",
    lastName: "Rodriguez",
    email: "sofia@sunridge.com",
    roleType: "doctor",
    unit: "Emergency",
    qualifications: ["Emergency Medicine", "Trauma"],
    employmentType: "casual",
    availability: {
      monday: ["day"],
      tuesday: ["day"],
      wednesday: ["day"],
      thursday: ["day"],
      friday: ["day"],
      saturday: [],
      sunday: [],
    },
    maxHoursPerWeek: 36,
    status: "active",
  },
  {
    userId: "usr_006",
    firstName: "Kai",
    lastName: "Park",
    email: "kai@sunridge.com",
    roleType: "technician",
    unit: "Lab",
    qualifications: ["Phlebotomy", "Lab Analysis"],
    employmentType: "parttime-temporary",
    availability: {
      monday: ["night"],
      tuesday: ["night"],
      wednesday: [],
      thursday: [],
      friday: ["night"],
      saturday: ["night"],
      sunday: [],
    },
    maxHoursPerWeek: 24,
    status: "inactive",
  },
];

function staffSnippet(userId: string) {
  const s = STAFF_PROFILES.find((p) => p.userId === userId)!;
  return { userId: s.userId, firstName: s.firstName, lastName: s.lastName, roleType: s.roleType };
}

type InternalShift = Shift & { staffId: string };

function makeShift(
  shiftId: string,
  date: string,
  type: ShiftType,
  unit: string,
  staffId: string,
  status: ShiftStatus = "confirmed",
): InternalShift {
  return {
    shiftId,
    date,
    type,
    unit,
    ...shiftTimes(type),
    status,
    publishedAt: "2026-05-20T10:00:00Z",
    staff: staffSnippet(staffId),
    staffId,
  };
}

// June 2026 schedule (21 shifts)
let shifts: InternalShift[] = [
  makeShift("shf_001", "2026-06-02", "day",     "ICU",          "usr_001"),
  makeShift("shf_002", "2026-06-03", "night",   "Emergency",    "usr_002"),
  makeShift("shf_003", "2026-06-05", "day",     "ICU",          "usr_004"),
  makeShift("shf_004", "2026-06-07", "evening", "General Ward", "usr_003"),
  makeShift("shf_005", "2026-06-09", "day",     "Emergency",    "usr_005"),
  makeShift("shf_006", "2026-06-10", "night",   "Lab",          "usr_006"),
  makeShift("shf_007", "2026-06-11", "day",     "ICU",          "usr_001"),
  makeShift("shf_008", "2026-06-12", "evening", "Emergency",    "usr_002"),
  makeShift("shf_009", "2026-06-14", "day",     "ICU",          "usr_004"),
  makeShift("shf_010", "2026-06-15", "night",   "ICU",          "usr_001"),
  makeShift("shf_011", "2026-06-17", "day",     "Emergency",    "usr_005"),
  makeShift("shf_012", "2026-06-18", "evening", "General Ward", "usr_003"),
  makeShift("shf_013", "2026-06-20", "day",     "ICU",          "usr_004"),
  makeShift("shf_014", "2026-06-22", "evening", "ICU",          "usr_001"),
  makeShift("shf_015", "2026-06-24", "day",     "Emergency",    "usr_002"),
  makeShift("shf_016", "2026-06-25", "evening", "ICU",          "usr_001"),
  makeShift("shf_017", "2026-06-26", "day",     "ICU",          "usr_004"),
  makeShift("shf_018", "2026-06-27", "night",   "Emergency",    "usr_002"),
  makeShift("shf_019", "2026-06-28", "day",     "Emergency",    "usr_005"),
  makeShift("shf_020", "2026-06-29", "day",     "ICU",          "usr_001"),
  makeShift("shf_021", "2026-06-30", "evening", "ICU",          "usr_004"),
  // July 2026 — a few shifts so the next month isn't empty
  makeShift("shf_030", "2026-07-01", "day",     "ICU",          "usr_001"),
  makeShift("shf_031", "2026-07-02", "evening", "Emergency",    "usr_002"),
  makeShift("shf_032", "2026-07-03", "night",   "ICU",          "usr_004"),
  makeShift("shf_033", "2026-07-05", "day",     "General Ward", "usr_003"),
  makeShift("shf_034", "2026-07-07", "day",     "Emergency",    "usr_005"),
  makeShift("shf_035", "2026-07-08", "evening", "ICU",          "usr_001"),
];

let announcements: Announcement[] = [
  {
    announcementId: "ann_001",
    title: "Updated PPE Protocol — Effective July 1",
    body: "Effective July 1st, all ICU and Emergency staff must wear N95 masks at all times during patient contact. Please collect your supply from the nurse's station.",
    priority: "urgent",
    createdAt: "2026-06-20T09:00:00Z",
  },
  {
    announcementId: "ann_002",
    title: "New Parking Arrangement — Lot B",
    body: "Lot B is reserved for staff Mon–Fri 06:00–22:00. Please display your parking pass. Visitor parking has moved to Lot C.",
    priority: "normal",
    createdAt: "2026-06-15T14:00:00Z",
  },
  {
    announcementId: "ann_003",
    title: "Summer Schedule Reminder",
    body: "All vacation and time-off requests for July and August must be submitted by June 30. Please use the Requests page to submit.",
    priority: "normal",
    createdAt: "2026-06-10T08:30:00Z",
  },
];

let swapRequests: SwapRequest[] = [
  {
    swapRequestId: "swp_001",
    status: "pending",
    submittedAt: "2026-06-22T10:00:00Z",
    note: "Need to attend my daughter's school play — sorry for the short notice.",
    requester: {
      userId: "usr_001",
      firstName: "Amara",
      lastName: "Johnson",
      shift: { shiftId: "shf_020", date: "2026-06-29", type: "day", unit: "ICU" },
    },
    targetStaff: {
      userId: "usr_004",
      firstName: "James",
      lastName: "Wilson",
      shift: { shiftId: "shf_021", date: "2026-06-30", type: "evening", unit: "ICU" },
    },
  },
  {
    swapRequestId: "swp_002",
    status: "pending",
    submittedAt: "2026-06-21T14:30:00Z",
    note: "Medical appointment on the 27th that I can't reschedule.",
    requester: {
      userId: "usr_002",
      firstName: "David",
      lastName: "Osei",
      shift: { shiftId: "shf_018", date: "2026-06-27", type: "night", unit: "Emergency" },
    },
    targetStaff: {
      userId: "usr_005",
      firstName: "Sofia",
      lastName: "Rodriguez",
      shift: { shiftId: "shf_019", date: "2026-06-28", type: "day", unit: "Emergency" },
    },
  },
];

let timeOffRequests: TimeOffRequest[] = [
  {
    requestId: "tof_001",
    startDate: "2026-07-10",
    endDate: "2026-07-14",
    reason: "Planned surgery recovery — pre-approved by HR",
    status: "pending",
    adminNote: null,
    submittedAt: "2026-06-18T11:00:00Z",
    staff: { userId: "usr_003", firstName: "Priya", lastName: "Mehta", roleType: "LPN", unit: "General Ward" },
  },
  {
    requestId: "tof_002",
    startDate: "2026-07-03",
    endDate: "2026-07-04",
    reason: "Family event out of province",
    status: "pending",
    adminNote: null,
    submittedAt: "2026-06-20T09:45:00Z",
    staff: { userId: "usr_006", firstName: "Kai", lastName: "Park", roleType: "technician", unit: "Lab" },
  },
];

let notifications: Notification[] = [
  {
    notificationId: "ntf_001",
    type: "schedule_published",
    title: "June Schedule Published",
    message: "Your schedule for June 2026 is now available. You have 8 shifts this month.",
    read: false,
    createdAt: "2026-05-20T10:00:00Z",
  },
  {
    notificationId: "ntf_002",
    type: "announcement",
    title: "New Announcement: Updated PPE Protocol",
    message: "Facility admin posted a new announcement about PPE requirements.",
    read: false,
    createdAt: "2026-06-20T09:01:00Z",
  },
  {
    notificationId: "ntf_003",
    type: "swap_rejected",
    title: "Swap Request Declined",
    message: "Your shift swap request for June 15 was declined. Your original shift remains unchanged.",
    read: true,
    createdAt: "2026-06-16T13:00:00Z",
  },
];

// ─── handlers ────────────────────────────────────────────────────────────────

export const handlers = [
  // ── Auth ──────────────────────────────────────────────────────────────────

  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    if (body.email === DEV_CREDENTIALS.admin.email) {
      return ok({ token: "mock-jwt-admin", user: ADMIN_USER });
    }
    if (body.email === DEV_CREDENTIALS.staff.email) {
      return ok({ token: "mock-jwt-staff", user: STAFF_USER });
    }
    return fail("INVALID_CREDENTIALS", "Email or password is incorrect", 401);
  }),

  http.post(`${BASE}/auth/signup`, async ({ request }) => {
    const body = await request.json() as { email: string; role: string; firstName: string };
    const isAdmin = body.role === "admin";
    return HttpResponse.json(
      {
        success: true,
        data: {
          userId: nextId("usr"),
          email: body.email,
          role: body.role,
          token: isAdmin ? "mock-jwt-admin" : "mock-jwt-staff",
        },
        error: null,
      },
      { status: 201 },
    );
  }),

  http.post(`${BASE}/auth/magic-link`, () =>
    ok({ message: "Magic link sent to email (mock — no real email in dev)" }),
  ),

  http.post(`${BASE}/auth/magic-link/verify`, () =>
    ok({ token: "mock-jwt-staff", user: STAFF_USER }),
  ),

  http.get(`${BASE}/auth/me`, ({ request }) => {
    const role = tokenUser(request);
    if (!role) return fail("UNAUTHORIZED", "Not authenticated", 401);
    return ok(role === "admin" ? ADMIN_USER : STAFF_USER);
  }),

  http.get(`${BASE}/auth/qr-token`, () =>
    ok({
      qrToken: "qr_mock_token_dev",
      expiresAt: "2026-12-31T23:59:00Z",
      loginUrl: `http://localhost:3000/qr-login?token=qr_mock_token_dev`,
    }),
  ),

  http.post(`${BASE}/auth/qr-login/verify`, () =>
    ok({ token: "mock-jwt-staff", user: STAFF_USER }),
  ),

  // ── Facility ──────────────────────────────────────────────────────────────

  http.post(`${BASE}/facilities`, async ({ request }) => {
    const body = await request.json() as { name: string };
    return HttpResponse.json(
      {
        success: true,
        data: { facilityId: "fac_001", name: body.name, createdAt: new Date().toISOString() },
        error: null,
      },
      { status: 201 },
    );
  }),

  // ── My Facilities (location picker) ────────────────────────────────────────

  http.get(`${BASE}/facilities/mine`, ({ request }) => {
    const role = tokenUser(request);
    if (role !== "admin") return fail("FORBIDDEN", "Admins only", 403);
    return ok({
      facilities: [
        {
          facilityId: "fac_001",
          name: "Sunridge Manor",
          address: "123 Sunridge Blvd, Calgary, AB T1Y 0A1",
          createdAt: "2025-01-15T10:00:00.000Z",
        },
        {
          facilityId: "fac_002",
          name: "Pinecrest Lodge",
          address: "456 Pinecrest Ave, Red Deer, AB T4N 2H3",
          createdAt: "2025-03-20T10:00:00.000Z",
        },
      ],
    });
  }),

  // ── Staff Profiles ─────────────────────────────────────────────────────────

  http.get(`${BASE}/facilities/:facilityId/staff`, () =>
    ok({ staff: STAFF_PROFILES, total: STAFF_PROFILES.length }),
  ),

  http.post(`${BASE}/facilities/:facilityId/staff`, async ({ request }) => {
    const body = await request.json() as Partial<StaffProfile>;
    const newStaff: StaffProfile = {
      userId: nextId("usr"),
      firstName: body.firstName ?? "New",
      lastName: body.lastName ?? "Staff",
      email: body.email ?? "new@sunridge.com",
      roleType: body.roleType ?? "RN",
      unit: body.unit ?? "General Ward",
      qualifications: body.qualifications ?? [],
      employmentType: body.employmentType ?? "fulltime-permanent",
      availability: body.availability ?? {},
      maxHoursPerWeek: body.maxHoursPerWeek ?? 40,
      status: "active",
      phone: body.phone ?? "",
      notes: body.notes ?? "",
    };
    STAFF_PROFILES.push(newStaff);
    return HttpResponse.json({ success: true, data: newStaff, error: null }, { status: 201 });
  }),

  http.patch(`${BASE}/staff/:staffId`, async ({ request, params }) => {
    const { staffId } = params as { staffId: string };
    const body = await request.json() as Partial<StaffProfile>;
    const idx = STAFF_PROFILES.findIndex((s) => s.userId === staffId);
    if (idx === -1) return fail("NOT_FOUND", "Staff member not found", 404);
    STAFF_PROFILES[idx] = { ...STAFF_PROFILES[idx], ...body };
    return ok(STAFF_PROFILES[idx]);
  }),

  http.patch(`${BASE}/staff/:staffId/deactivate`, ({ params }) => {
    const { staffId } = params as { staffId: string };
    const idx = STAFF_PROFILES.findIndex((s) => s.userId === staffId);
    if (idx !== -1) STAFF_PROFILES[idx].status = "inactive";
    return ok({ userId: staffId, status: "inactive" });
  }),

  // ── Shifts & Schedules ─────────────────────────────────────────────────────

  http.get(`${BASE}/facilities/:facilityId/schedule`, ({ request }) => {
    const url = new URL(request.url);
    const month = url.searchParams.get("month") ?? "";
    const monthShifts = shifts.filter((s) => s.date.startsWith(month));
    return ok({
      facilityId: "fac_001",
      month,
      published: false,
      shifts: monthShifts,
      gaps: month.startsWith("2026-06")
        ? [{ date: "2026-06-25", type: "night", unit: "Emergency", requiredRole: "RN", message: "No RN assigned to Emergency night shift — requires immediate coverage." }]
        : [],
      overtimeRisks: month.startsWith("2026-06")
        ? [{ userId: "usr_004", projectedHours: 86, threshold: 80, message: "James Wilson projected 86 hrs in the biweekly period starting 2026-06-22 (limit 80 hrs)" }]
        : [],
    });
  }),

  http.get(`${BASE}/shifts`, ({ request }) => {
    const url = new URL(request.url);
    const staffId = url.searchParams.get("staffId") ?? "usr_001";
    const month = url.searchParams.get("month") ?? "";
    const myShifts = shifts
      .filter((s) => s.staffId === staffId && s.date.startsWith(month))
      .map(({ staffId: _staffId, ...shift }) => shift);
    const totalHours = myShifts.reduce((sum, s) => sum + s.durationHours, 0);
    return ok({ staffId, month, shifts: myShifts, totalShifts: myShifts.length, totalHours });
  }),

  http.post(`${BASE}/shifts`, async ({ request }) => {
    const body = await request.json() as {
      facilityId: string;
      staffId: string;
      date: string;
      type: ShiftType;
      unit: string;
      startTime: string;
      endTime: string;
    };
    const newShift = makeShift(nextId("shf"), body.date, body.type, body.unit, body.staffId);
    shifts.push(newShift);
    return HttpResponse.json({ success: true, data: newShift, error: null }, { status: 201 });
  }),

  http.patch(`${BASE}/shifts/:shiftId`, async ({ request, params }) => {
    const { shiftId } = params as { shiftId: string };
    const body = await request.json() as { date?: string; type?: ShiftType; staffId?: string };
    const idx = shifts.findIndex((s) => s.shiftId === shiftId);
    if (idx === -1) return fail("NOT_FOUND", "Shift not found", 404);
    const updated: InternalShift = {
      ...shifts[idx],
      ...(body.date && { date: body.date }),
      ...(body.type && { type: body.type, ...shiftTimes(body.type) }),
      ...(body.staffId && { staffId: body.staffId, staff: staffSnippet(body.staffId) }),
    };
    shifts[idx] = updated;
    return ok(updated);
  }),

  http.delete(`${BASE}/shifts/:shiftId`, ({ params }) => {
    const { shiftId } = params as { shiftId: string };
    shifts = shifts.filter((s) => s.shiftId !== shiftId);
    return ok({ shiftId, deleted: true });
  }),

  http.post(`${BASE}/facilities/:facilityId/schedule/publish`, () =>
    ok({
      month: "2026-06",
      published: true,
      publishedAt: new Date().toISOString(),
      notifiedStaffCount: STAFF_PROFILES.filter((s) => s.status === "active").length,
    }),
  ),

  // ── AI Schedule Generation ─────────────────────────────────────────────────

  http.post(`${BASE}/ai/generate-schedule`, async ({ request }) => {
    const body = await request.json() as { facilityId: string; month: string; command: string };
    const [y, m] = body.month.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const activeStaff = STAFF_PROFILES.filter((s) => s.status === "active");
    const generated = Array.from({ length: Math.min(12, daysInMonth) }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      const staff = activeStaff[i % activeStaff.length];
      const type: ShiftType = (["day", "evening", "night"] as ShiftType[])[i % 3];
      const times = shiftTimes(type);
      return {
        staffId: staff.userId,
        date: `${body.month}-${day}`,
        type,
        unit: staff.unit,
        startTime: times.startTime,
        endTime: times.endTime,
      };
    });
    return ok({
      month: body.month,
      generatedShifts: generated,
      totalShifts: generated.length,
      warnings: ["No qualified PSW available for July 4 night shift — manual assignment may be needed."],
      saved: false,
    });
  }),

  http.post(`${BASE}/ai/generate-schedule/confirm`, async ({ request }) => {
    const body = await request.json() as { facilityId: string; month: string };
    return HttpResponse.json(
      { success: true, data: { savedShifts: 12, month: body.month }, error: null },
      { status: 201 },
    );
  }),

  // ── Swap Requests ──────────────────────────────────────────────────────────

  http.post(`${BASE}/swap-requests`, async ({ request }) => {
    const body = await request.json() as {
      requesterId: string;
      targetStaffId: string;
      requesterShiftId: string;
      targetShiftId: string;
      note: string;
    };
    const reqShift = shifts.find((s) => s.shiftId === body.requesterShiftId);
    const tgtShift = shifts.find((s) => s.shiftId === body.targetShiftId);
    const requester = STAFF_PROFILES.find((s) => s.userId === body.requesterId);
    const target = STAFF_PROFILES.find((s) => s.userId === body.targetStaffId);
    const newReq: SwapRequest = {
      swapRequestId: nextId("swp"),
      status: "pending",
      submittedAt: new Date().toISOString(),
      note: body.note,
      requester: {
        userId: body.requesterId,
        firstName: requester?.firstName ?? "Staff",
        lastName: requester?.lastName ?? "Member",
        shift: reqShift
          ? { shiftId: reqShift.shiftId, date: reqShift.date, type: reqShift.type, unit: reqShift.unit }
          : { shiftId: body.requesterShiftId, date: "2026-06-01", type: "day", unit: "ICU" },
      },
      targetStaff: {
        userId: body.targetStaffId,
        firstName: target?.firstName ?? "Staff",
        lastName: target?.lastName ?? "Member",
        shift: tgtShift
          ? { shiftId: tgtShift.shiftId, date: tgtShift.date, type: tgtShift.type, unit: tgtShift.unit }
          : { shiftId: body.targetShiftId, date: "2026-06-02", type: "day", unit: "ICU" },
      },
    };
    swapRequests.push(newReq);
    return HttpResponse.json({ success: true, data: { swapRequestId: newReq.swapRequestId, status: "pending", submittedAt: newReq.submittedAt }, error: null }, { status: 201 });
  }),

  http.get(`${BASE}/facilities/:facilityId/swap-requests`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const filtered = status ? swapRequests.filter((r) => r.status === status) : swapRequests;
    return ok({ swapRequests: filtered, total: filtered.length });
  }),

  http.patch(`${BASE}/swap-requests/:swapRequestId`, async ({ request, params }) => {
    const { swapRequestId } = params as { swapRequestId: string };
    const body = await request.json() as { status: "approved" | "rejected"; adminNote?: string };
    const idx = swapRequests.findIndex((r) => r.swapRequestId === swapRequestId);
    if (idx !== -1) swapRequests[idx] = { ...swapRequests[idx], status: body.status };
    return ok({ swapRequestId, status: body.status });
  }),

  // ── Time Off ───────────────────────────────────────────────────────────────

  http.post(`${BASE}/time-off`, async ({ request }) => {
    const body = await request.json() as {
      staffId: string;
      startDate: string;
      endDate: string;
      reason: string;
    };
    const newReq: TimeOffRequest = {
      requestId: nextId("tof"),
      startDate: body.startDate,
      endDate: body.endDate,
      reason: body.reason,
      status: "pending",
      adminNote: null,
      submittedAt: new Date().toISOString(),
    };
    timeOffRequests.push(newReq);
    return HttpResponse.json({ success: true, data: { requestId: newReq.requestId, status: "pending", submittedAt: newReq.submittedAt }, error: null }, { status: 201 });
  }),

  http.get(`${BASE}/time-off`, ({ request }) => {
    const url = new URL(request.url);
    const staffId = url.searchParams.get("staffId");
    const mine = staffId ? timeOffRequests.filter((r) => r.staff?.userId === staffId || !r.staff) : timeOffRequests;
    return ok({ requests: mine, total: mine.length });
  }),

  http.get(`${BASE}/facilities/:facilityId/time-off`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const filtered = status ? timeOffRequests.filter((r) => r.status === status) : timeOffRequests;
    return ok({ requests: filtered, total: filtered.length });
  }),

  http.patch(`${BASE}/time-off/:requestId`, async ({ request, params }) => {
    const { requestId } = params as { requestId: string };
    const body = await request.json() as { status: "approved" | "rejected"; adminNote?: string };
    const idx = timeOffRequests.findIndex((r) => r.requestId === requestId);
    if (idx !== -1) timeOffRequests[idx] = { ...timeOffRequests[idx], status: body.status, adminNote: body.adminNote ?? null };
    return ok(timeOffRequests[idx] ?? { requestId, status: body.status });
  }),

  // ── Notifications ──────────────────────────────────────────────────────────

  http.get(`${BASE}/notifications`, ({ request }) => {
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const filtered = unreadOnly ? notifications.filter((n) => !n.read) : notifications;
    return ok({ notifications: filtered, unreadCount: notifications.filter((n) => !n.read).length });
  }),

  http.patch(`${BASE}/notifications/:notificationId/read`, ({ params }) => {
    const { notificationId } = params as { notificationId: string };
    const idx = notifications.findIndex((n) => n.notificationId === notificationId);
    if (idx !== -1) notifications[idx] = { ...notifications[idx], read: true };
    return ok({ notificationId, read: true });
  }),

  // ── Announcements ──────────────────────────────────────────────────────────

  http.post(`${BASE}/announcements`, async ({ request }) => {
    const body = await request.json() as { facilityId: string; title: string; body: string; priority: "normal" | "urgent" };
    const newAnn: Announcement = {
      announcementId: nextId("ann"),
      title: body.title,
      body: body.body,
      priority: body.priority,
      createdAt: new Date().toISOString(),
    };
    announcements.unshift(newAnn);
    return HttpResponse.json({ success: true, data: { announcementId: newAnn.announcementId, title: newAnn.title, priority: newAnn.priority, createdAt: newAnn.createdAt }, error: null }, { status: 201 });
  }),

  http.get(`${BASE}/facilities/:facilityId/announcements`, () =>
    ok({ announcements, total: announcements.length }),
  ),
];
