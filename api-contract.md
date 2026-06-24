# API Contract — Healthcare Workforce Scheduling Platform

**Version:** 1.0
**Date:** June 13, 2026
**Frontend Dev:** Ryker
**Status:** Active — changes require agreement from both frontend and backend before implementation

---

## Global Standards

These apply to every endpoint without exception.

### Base URLs

```
Development:   http://localhost:5000/api
Production:    https://api.medschedule.com/api
```

### Date & Time Format

All dates and timestamps must use ISO 8601 format.

```
Dates:       "2026-07-15"
Timestamps:  "2026-07-15T08:00:00Z"
```

### Authentication Header

Every protected route requires this header on every request.

```
Authorization: Bearer <jwt_token>
```

### Universal Response Shape

Every endpoint — success or failure — returns this exact structure.

```json
// Success
{
  "success": true,
  "data": { },
  "error": null
}

// Failure
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Resource created successfully |
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized (wrong role) |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate shift) |
| 500 | Server error |

### User Roles

```
"admin"   →  Facility Administrator
"staff"   →  Healthcare Worker
```

### Shift Types

```
"day"      →  Typically 07:00 – 19:00
"evening"  →  Typically 15:00 – 23:00
"night"    →  Typically 19:00 – 07:00
```

### Staff Role Types

```
"RN"          →  Registered Nurse
"PSW"         →  Personal Support Worker
"LPN"         →  Licensed Practical Nurse
"doctor"      →  Physician
"technician"  →  Medical Technician
```

---

## Section 1 — Authentication

---

### 1.1 Sign Up

```
POST /auth/signup
Auth required: No
```

**Request Body**

```json
{
  "email": "amara.johnson@facility.com",
  "password": "Min8chars1!",
  "firstName": "Amara",
  "lastName": "Johnson",
  "role": "staff",
  "facilityId": "fac_001"
}
```

> `facilityId` is required when `role` is `"staff"`. Omit for `"admin"` (they create the facility separately).

**Response 201**

```json
{
  "success": true,
  "data": {
    "userId": "usr_abc123",
    "email": "amara.johnson@facility.com",
    "role": "staff",
    "token": "eyJhbGci..."
  },
  "error": null
}
```

**Possible Error Codes**

| Code | Message |
|------|---------|
| `EMAIL_TAKEN` | An account with this email already exists |
| `INVALID_FACILITY` | Facility ID does not exist |
| `WEAK_PASSWORD` | Password must be at least 8 characters |

---

### 1.2 Login

```
POST /auth/login
Auth required: No
```

**Request Body**

```json
{
  "email": "amara.johnson@facility.com",
  "password": "Min8chars1!"
}
```

**Response 200**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": {
      "userId": "usr_abc123",
      "firstName": "Amara",
      "lastName": "Johnson",
      "email": "amara.johnson@facility.com",
      "role": "staff",
      "facilityId": "fac_001"
    }
  },
  "error": null
}
```

**Possible Error Codes**

| Code | Message |
|------|---------|
| `INVALID_CREDENTIALS` | Email or password is incorrect |
| `ACCOUNT_INACTIVE` | Your account has been deactivated |

---

### 1.3 Request Magic Link

```
POST /auth/magic-link
Auth required: No
```

**Request Body**

```json
{
  "email": "amara.johnson@facility.com"
}
```

**Response 200**

```json
{
  "success": true,
  "data": {
    "message": "Magic link sent to email"
  },
  "error": null
}
```

---

### 1.4 Verify Magic Link

```
POST /auth/magic-link/verify
Auth required: No
```

**Request Body**

```json
{
  "token": "mlnk_xyz789"
}
```

**Response 200** — Same shape as Login response (Section 1.2)

---

### 1.5 Get Current User

```
GET /auth/me
Auth required: Yes (any role)
```

**Response 200**

```json
{
  "success": true,
  "data": {
    "userId": "usr_abc123",
    "firstName": "Amara",
    "lastName": "Johnson",
    "email": "amara.johnson@facility.com",
    "role": "staff",
    "facilityId": "fac_001"
  },
  "error": null
}
```

---

### 1.6 Generate QR Login Token

```
GET /auth/qr-token
Auth required: Yes (staff)
```

**Response 200**

```json
{
  "success": true,
  "data": {
    "qrToken": "qr_abc999xyz",
    "expiresAt": "2026-07-15T12:00:00Z",
    "loginUrl": "https://medschedule.com/qr-login?token=qr_abc999xyz"
  },
  "error": null
}
```

---

### 1.7 Verify QR Login

```
POST /auth/qr-login/verify
Auth required: No
```

**Request Body**

```json
{
  "token": "qr_abc999xyz"
}
```

**Response 200** — Same shape as Login response (Section 1.2)

**Possible Error Codes**

| Code | Message |
|------|---------|
| `INVALID_QR_TOKEN` | QR login token is invalid or expired |

---

## Section 2 — Facility

---

### 2.1 Create Facility

```
POST /facilities
Auth required: Yes (admin)
```

**Request Body**

```json
{
  "name": "Sunridge Medical Center",
  "address": "123 Health Ave, Toronto, ON",
  "contactEmail": "admin@sunridge.com",
  "contactPhone": "+1-416-000-0000"
}
```

**Response 201**

```json
{
  "success": true,
  "data": {
    "facilityId": "fac_001",
    "name": "Sunridge Medical Center",
    "createdAt": "2026-06-13T10:00:00Z"
  },
  "error": null
}
```

---

### 2.2 Get Facility Details

```
GET /facilities/:facilityId
Auth required: Yes (admin — own facility only)
```

**Response 200**

```json
{
  "success": true,
  "data": {
    "facilityId": "fac_001",
    "name": "Sunridge Medical Center",
    "address": "123 Health Ave, Toronto, ON",
    "contactEmail": "admin@sunridge.com",
    "contactPhone": "+1-416-000-0000",
    "staffCount": 42,
    "createdAt": "2026-06-13T10:00:00Z"
  },
  "error": null
}
```

---

## Section 3 — Staff Profiles

---

### 3.1 Get All Staff (Admin)

```
GET /facilities/:facilityId/staff
Auth required: Yes (admin)
```

**Response 200**

```json
{
  "success": true,
  "data": {
    "staff": [
      {
        "userId": "usr_abc123",
        "firstName": "Amara",
        "lastName": "Johnson",
        "email": "amara.johnson@facility.com",
        "roleType": "RN",
        "unit": "ICU",
        "qualifications": ["Critical Care", "ACLS"],
        "employmentType": "full-time",
        "availability": {
          "monday":    ["day", "evening"],
          "tuesday":   ["day", "evening"],
          "wednesday": ["day"],
          "thursday":  ["day", "evening"],
          "friday":    ["day"],
          "saturday":  [],
          "sunday":    []
        },
        "maxHoursPerWeek": 40,
        "status": "active"
      }
    ],
    "total": 42
  },
  "error": null
}
```

**`employmentType` values:** `"full-time"` `"part-time"` `"contract"`
**`status` values:** `"active"` `"inactive"`

---

### 3.2 Get Single Staff Profile

```
GET /staff/:staffId
Auth required: Yes (admin or own profile)
```

**Response 200** — Returns a single staff object (same shape as item in Section 3.1 array)

---

### 3.3 Add Staff Member (Admin)

```
POST /facilities/:facilityId/staff
Auth required: Yes (admin)
```

**Request Body**

```json
{
  "firstName": "Amara",
  "lastName": "Johnson",
  "email": "amara.johnson@facility.com",
  "roleType": "RN",
  "unit": "ICU",
  "qualifications": ["Critical Care", "ACLS"],
  "employmentType": "full-time",
  "availability": {
    "monday":    ["day", "evening"],
    "tuesday":   ["day", "evening"],
    "wednesday": ["day"],
    "thursday":  ["day", "evening"],
    "friday":    ["day"],
    "saturday":  [],
    "sunday":    []
  },
  "maxHoursPerWeek": 40
}
```

**Response 201** — Returns full staff object (same shape as Section 3.1)

---

### 3.4 Update Staff Profile (Admin)

```
PATCH /staff/:staffId
Auth required: Yes (admin)
```

**Request Body** — Send only the fields being changed

```json
{
  "unit": "Emergency",
  "maxHoursPerWeek": 36
}
```

**Response 200** — Returns full updated staff object

---

### 3.5 Deactivate Staff Member (Admin)

```
PATCH /staff/:staffId/deactivate
Auth required: Yes (admin)
```

**No request body required.**

**Response 200**

```json
{
  "success": true,
  "data": {
    "userId": "usr_abc123",
    "status": "inactive"
  },
  "error": null
}
```

---

## Section 4 — Shifts & Schedules

---

### 4.1 Get Staff Personal Schedule

```
GET /shifts?staffId=usr_abc123&month=2026-07
Auth required: Yes (staff — own shifts only)
```

**Query Parameters**

| Param | Required | Description |
|-------|----------|-------------|
| `staffId` | Yes | The staff member's userId |
| `month` | Yes | Format: `YYYY-MM` |

**Response 200**

```json
{
  "success": true,
  "data": {
    "staffId": "usr_abc123",
    "month": "2026-07",
    "shifts": [
      {
        "shiftId": "shf_001",
        "date": "2026-07-01",
        "type": "day",
        "unit": "ICU",
        "startTime": "07:00",
        "endTime": "19:00",
        "durationHours": 12,
        "status": "confirmed",
        "publishedAt": "2026-06-20T10:00:00Z"
      }
    ],
    "totalShifts": 15,
    "totalHours": 180
  },
  "error": null
}
```

**`status` values:** `"confirmed"` `"pending"` `"cancelled"`

---

### 4.2 Get Full Facility Schedule (Admin)

```
GET /facilities/:facilityId/schedule?month=2026-07
Auth required: Yes (admin)
```

**Response 200**

```json
{
  "success": true,
  "data": {
    "facilityId": "fac_001",
    "month": "2026-07",
    "published": false,
    "shifts": [
      {
        "shiftId": "shf_001",
        "date": "2026-07-01",
        "type": "day",
        "unit": "ICU",
        "startTime": "07:00",
        "endTime": "19:00",
        "durationHours": 12,
        "staff": {
          "userId": "usr_abc123",
          "firstName": "Amara",
          "lastName": "Johnson",
          "roleType": "RN"
        },
        "status": "confirmed"
      }
    ],
    "gaps": [
      {
        "date": "2026-07-04",
        "type": "night",
        "unit": "Emergency",
        "requiredRole": "RN",
        "message": "No RN assigned to night shift"
      }
    ],
    "overtimeRisks": [
      {
        "userId": "usr_abc123",
        "projectedHours": 52,
        "threshold": 40,
        "message": "Amara Johnson projected to exceed 40hrs this week"
      }
    ]
  },
  "error": null
}
```

---

### 4.3 Create Single Shift (Admin — Manual)

```
POST /shifts
Auth required: Yes (admin)
```

**Request Body**

```json
{
  "facilityId": "fac_001",
  "staffId": "usr_abc123",
  "date": "2026-07-15",
  "type": "day",
  "unit": "ICU",
  "startTime": "07:00",
  "endTime": "19:00"
}
```

**Response 201**

```json
{
  "success": true,
  "data": {
    "shiftId": "shf_099",
    "date": "2026-07-15",
    "type": "day",
    "unit": "ICU",
    "startTime": "07:00",
    "endTime": "19:00",
    "status": "confirmed"
  },
  "error": null
}
```

**Possible Error Codes**

| Code | Message |
|------|---------|
| `SHIFT_CONFLICT` | Staff member already has a shift on this date |
| `UNAVAILABLE` | Staff member marked unavailable on this day |
| `OVERTIME_WARNING` | This shift puts staff member over 40hrs this week |

---

### 4.4 Update Shift (Admin — Drag and Drop)

```
PATCH /shifts/:shiftId
Auth required: Yes (admin)
```

**Request Body** — Send only the fields changing

```json
{
  "date": "2026-07-16",
  "type": "evening",
  "staffId": "usr_xyz456"
}
```

**Response 200** — Returns full updated shift object

---

### 4.5 Delete Shift (Admin)

```
DELETE /shifts/:shiftId
Auth required: Yes (admin)
```

**No request body required.**

**Response 200**

```json
{
  "success": true,
  "data": {
    "shiftId": "shf_001",
    "deleted": true
  },
  "error": null
}
```

---

### 4.6 Publish Schedule (Admin)

```
POST /facilities/:facilityId/schedule/publish
Auth required: Yes (admin)
```

**Request Body**

```json
{
  "month": "2026-07"
}
```

**Response 200**

```json
{
  "success": true,
  "data": {
    "month": "2026-07",
    "published": true,
    "publishedAt": "2026-06-20T10:00:00Z",
    "notifiedStaffCount": 42
  },
  "error": null
}
```

---

## Section 5 — AI Schedule Generation

---

### 5.1 Generate Schedule (Preview)

```
POST /ai/generate-schedule
Auth required: Yes (admin)
```

**Request Body**

```json
{
  "facilityId": "fac_001",
  "month": "2026-07",
  "command": "Generate next month's schedule"
}
```

> `command` is the free-text instruction the admin typed. Examples:
> - `"Generate next month's schedule"`
> - `"Reduce overtime for this schedule"`
> - `"Fill missing night shifts for next week"`

**Response 200**

```json
{
  "success": true,
  "data": {
    "month": "2026-07",
    "generatedShifts": [
      {
        "staffId": "usr_abc123",
        "date": "2026-07-01",
        "type": "day",
        "unit": "ICU",
        "startTime": "07:00",
        "endTime": "19:00"
      }
    ],
    "totalShifts": 186,
    "warnings": [
      "No qualified PSW available for July 4 night shift in Unit B"
    ],
    "saved": false
  },
  "error": null
}
```

> **`saved: false`** means this is a preview only. The frontend renders it on the calendar for admin review. Nothing is written to the database yet. Admin must call Section 5.2 to confirm.

---

### 5.2 Confirm AI-Generated Schedule

```
POST /ai/generate-schedule/confirm
Auth required: Yes (admin)
```

**Request Body**

```json
{
  "facilityId": "fac_001",
  "month": "2026-07"
}
```

**Response 201**

```json
{
  "success": true,
  "data": {
    "savedShifts": 186,
    "month": "2026-07"
  },
  "error": null
}
```

---

## Section 6 — Swap Requests

---

### 6.1 Submit Swap Request (Staff)

```
POST /swap-requests
Auth required: Yes (staff)
```

**Request Body**

```json
{
  "requesterId": "usr_abc123",
  "targetStaffId": "usr_xyz456",
  "requesterShiftId": "shf_001",
  "targetShiftId": "shf_002",
  "note": "Family emergency on the 15th"
}
```

**Response 201**

```json
{
  "success": true,
  "data": {
    "swapRequestId": "swp_001",
    "status": "pending",
    "submittedAt": "2026-06-13T10:00:00Z"
  },
  "error": null
}
```

---

### 6.2 Get Facility Swap Requests (Admin)

```
GET /facilities/:facilityId/swap-requests?status=pending
Auth required: Yes (admin)
```

**Query Parameters**

| Param | Required | Values |
|-------|----------|--------|
| `status` | No | `pending` `approved` `rejected` (omit for all) |

**Response 200**

```json
{
  "success": true,
  "data": {
    "swapRequests": [
      {
        "swapRequestId": "swp_001",
        "status": "pending",
        "submittedAt": "2026-06-13T10:00:00Z",
        "note": "Family emergency on the 15th",
        "requester": {
          "userId": "usr_abc123",
          "firstName": "Amara",
          "lastName": "Johnson",
          "shift": {
            "shiftId": "shf_001",
            "date": "2026-07-15",
            "type": "day",
            "unit": "ICU"
          }
        },
        "targetStaff": {
          "userId": "usr_xyz456",
          "firstName": "David",
          "lastName": "Osei",
          "shift": {
            "shiftId": "shf_002",
            "date": "2026-07-16",
            "type": "day",
            "unit": "ICU"
          }
        }
      }
    ],
    "total": 3
  },
  "error": null
}
```

---

### 6.3 Respond to Swap Request (Admin)

```
PATCH /swap-requests/:swapRequestId
Auth required: Yes (admin)
```

**Request Body**

```json
{
  "status": "approved",
  "adminNote": "Approved. Shifts have been swapped."
}
```

**`status` values:** `"approved"` `"rejected"`

**Response 200**

```json
{
  "success": true,
  "data": {
    "swapRequestId": "swp_001",
    "status": "approved"
  },
  "error": null
}
```

---

## Section 7 — Time Off Requests

---

### 7.1 Submit Time Off Request (Staff)

```
POST /time-off
Auth required: Yes (staff)
```

**Request Body**

```json
{
  "staffId": "usr_abc123",
  "startDate": "2026-07-10",
  "endDate": "2026-07-14",
  "reason": "Planned surgery recovery"
}
```

**Response 201**

```json
{
  "success": true,
  "data": {
    "requestId": "tof_001",
    "status": "pending",
    "submittedAt": "2026-06-13T10:00:00Z"
  },
  "error": null
}
```

---

### 7.2 Get Staff's Own Time Off Requests

```
GET /time-off?staffId=usr_abc123
Auth required: Yes (staff — own only)
```

**Response 200**

```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "requestId": "tof_001",
        "startDate": "2026-07-10",
        "endDate": "2026-07-14",
        "reason": "Planned surgery recovery",
        "status": "pending",
        "adminNote": null,
        "submittedAt": "2026-06-13T10:00:00Z"
      }
    ],
    "total": 1
  },
  "error": null
}
```

**`status` values:** `"pending"` `"approved"` `"rejected"`

---

### 7.3 Get All Time Off Requests (Admin)

```
GET /facilities/:facilityId/time-off?status=pending
Auth required: Yes (admin)
```

**Response 200** — Same shape as Section 7.2, with full staff details included on each request item:

```json
{
  "requestId": "tof_001",
  "startDate": "2026-07-10",
  "endDate": "2026-07-14",
  "reason": "Planned surgery recovery",
  "status": "pending",
  "adminNote": null,
  "submittedAt": "2026-06-13T10:00:00Z",
  "staff": {
    "userId": "usr_abc123",
    "firstName": "Amara",
    "lastName": "Johnson",
    "roleType": "RN",
    "unit": "ICU"
  }
}
```

---

### 7.4 Respond to Time Off Request (Admin)

```
PATCH /time-off/:requestId
Auth required: Yes (admin)
```

**Request Body**

```json
{
  "status": "approved",
  "adminNote": "Approved. Please ensure handover notes are complete."
}
```

**`status` values:** `"approved"` `"rejected"`

**Response 200** — Returns full updated request object

---

## Section 8 — Notifications

---

### 8.1 Get User Notifications

```
GET /notifications?userId=usr_abc123&unreadOnly=true
Auth required: Yes (any role — own only)
```

**Query Parameters**

| Param | Required | Description |
|-------|----------|-------------|
| `userId` | Yes | The user's ID |
| `unreadOnly` | No | `true` or `false` (default: `false`) |

**Response 200**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "notificationId": "ntf_001",
        "type": "schedule_published",
        "title": "July Schedule Published",
        "message": "Your schedule for July 2026 is now available.",
        "read": false,
        "createdAt": "2026-06-20T10:00:00Z"
      }
    ],
    "unreadCount": 3
  },
  "error": null
}
```

**`type` values:**

| Value | Trigger |
|-------|---------|
| `schedule_published` | Admin publishes a schedule |
| `shift_updated` | A shift is changed after publishing |
| `swap_approved` | Admin approves a swap request |
| `swap_rejected` | Admin rejects a swap request |
| `time_off_approved` | Admin approves time off |
| `time_off_rejected` | Admin rejects time off |
| `announcement` | Admin posts an announcement |

---

### 8.2 Mark Notification as Read

```
PATCH /notifications/:notificationId/read
Auth required: Yes (any role)
```

**No request body required.**

**Response 200**

```json
{
  "success": true,
  "data": {
    "notificationId": "ntf_001",
    "read": true
  },
  "error": null
}
```

---

## Section 9 — Announcements

---

### 9.1 Create Announcement (Admin)

```
POST /announcements
Auth required: Yes (admin)
```

**Request Body**

```json
{
  "facilityId": "fac_001",
  "title": "Updated PPE Protocol",
  "body": "Effective July 1st, all staff in ICU must wear N95 masks at all times.",
  "priority": "normal"
}
```

**`priority` values:** `"normal"` `"urgent"`

**Response 201**

```json
{
  "success": true,
  "data": {
    "announcementId": "ann_001",
    "title": "Updated PPE Protocol",
    "priority": "normal",
    "createdAt": "2026-06-13T10:00:00Z"
  },
  "error": null
}
```

---

### 9.2 Get Announcements

```
GET /facilities/:facilityId/announcements
Auth required: Yes (any role)
```

**Response 200**

```json
{
  "success": true,
  "data": {
    "announcements": [
      {
        "announcementId": "ann_001",
        "title": "Updated PPE Protocol",
        "body": "Effective July 1st, all staff in ICU must wear N95 masks at all times.",
        "priority": "normal",
        "createdAt": "2026-06-13T10:00:00Z"
      }
    ],
    "total": 1
  },
  "error": null
}
```

---

## Section 10 — Real-Time WebSocket Events

The backend will emit these events via WebSocket (socket.io). The frontend subscribes to them and updates the UI accordingly. **The frontend does not emit any of these — they are server-push only.**

### Connection

```js
// Connect on app load (authenticated users only)
const socket = io("wss://api.medschedule.com", {
  auth: { token: "<jwt_token>" }
})
```

### Events the Frontend Subscribes To

| Event Name | Payload | Frontend Action |
|------------|---------|-----------------|
| `schedule_published` | `{ facilityId, month, publishedAt }` | Refetch schedule, show toast |
| `shift_updated` | `{ shiftId, staffId, changes: { date?, type?, unit? } }` | Refetch shifts, show toast |
| `swap_approved` | `{ swapRequestId, requesterId, targetStaffId }` | Refetch shifts + requests |
| `swap_rejected` | `{ swapRequestId, requesterId }` | Update request status in UI |
| `time_off_approved` | `{ requestId, staffId }` | Update request status in UI |
| `time_off_rejected` | `{ requestId, staffId }` | Update request status in UI |
| `announcement_posted` | `{ announcementId, facilityId, priority }` | Refetch announcements, show toast |

---

## Appendix A — FullCalendar Event Mapping

When rendering shifts in FullCalendar, map API shift objects to this event shape:

```js
const shiftTypeColors = {
  day:     "#3B82F6",  // blue
  evening: "#F59E0B",  // amber
  night:   "#6366F1",  // indigo
}

// Map a shift from the API to a FullCalendar event
const toCalendarEvent = (shift) => ({
  id:              shift.shiftId,
  title:           `${shift.type} — ${shift.unit}`,
  start:           `${shift.date}T${shift.startTime}`,
  end:             `${shift.date}T${shift.endTime}`,
  backgroundColor: shiftTypeColors[shift.type],
  borderColor:     shiftTypeColors[shift.type],
  extendedProps:   { ...shift }
})
```

---

## Appendix B — TypeScript Types

These types must be used across the entire frontend codebase. Never use `any`.

```typescript
// auth
export type UserRole = "admin" | "staff"
export type ShiftType = "day" | "evening" | "night"
export type StaffRoleType = "RN" | "PSW" | "LPN" | "doctor" | "technician"
export type EmploymentType = "full-time" | "part-time" | "contract"
export type RequestStatus = "pending" | "approved" | "rejected"
export type ShiftStatus = "confirmed" | "pending" | "cancelled"
export type NotificationType =
  | "schedule_published"
  | "shift_updated"
  | "swap_approved"
  | "swap_rejected"
  | "time_off_approved"
  | "time_off_rejected"
  | "announcement"

// universal response wrapper
export type ApiResponse<T> = {
  success: boolean
  data: T | null
  error: { code: string; message: string } | null
}

// user
export type User = {
  userId: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  facilityId: string
}

// staff profile
export type StaffProfile = {
  userId: string
  firstName: string
  lastName: string
  email: string
  roleType: StaffRoleType
  unit: string
  qualifications: string[]
  employmentType: EmploymentType
  availability: Record<string, ShiftType[]>
  maxHoursPerWeek: number
  status: "active" | "inactive"
}

// shift
export type Shift = {
  shiftId: string
  date: string
  type: ShiftType
  unit: string
  startTime: string
  endTime: string
  durationHours: number
  status: ShiftStatus
  publishedAt?: string
  staff?: Pick<StaffProfile, "userId" | "firstName" | "lastName" | "roleType">
}

// swap request
export type SwapRequest = {
  swapRequestId: string
  status: RequestStatus
  submittedAt: string
  note: string
  requester: {
    userId: string
    firstName: string
    lastName: string
    shift: Pick<Shift, "shiftId" | "date" | "type" | "unit">
  }
  targetStaff: {
    userId: string
    firstName: string
    lastName: string
    shift: Pick<Shift, "shiftId" | "date" | "type" | "unit">
  }
}

// time off request
export type TimeOffRequest = {
  requestId: string
  startDate: string
  endDate: string
  reason: string
  status: RequestStatus
  adminNote: string | null
  submittedAt: string
  staff?: Pick<StaffProfile, "userId" | "firstName" | "lastName" | "roleType" | "unit">
}

// notification
export type Notification = {
  notificationId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
}

// announcement
export type Announcement = {
  announcementId: string
  title: string
  body: string
  priority: "normal" | "urgent"
  createdAt: string
}

// schedule gap
export type ScheduleGap = {
  date: string
  type: ShiftType
  unit: string
  requiredRole: StaffRoleType
  message: string
}

// overtime risk
export type OvertimeRisk = {
  userId: string
  projectedHours: number
  threshold: number
  message: string
}
```

---

## Change Log

| Version | Date | Change | Agreed By |
|---------|------|--------|-----------|
| 1.0 | 2026-06-13 | Initial contract | Ryker + Backend Dev |

> All changes to this document must be agreed upon by both the frontend developer and the backend developer before implementation. Changes made without agreement are invalid.