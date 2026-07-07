# MedSchedule — Frontend

> Healthcare workforce scheduling platform. This README is the persistent memory of this project — keep it updated after every meaningful change so any future session (human or AI) can resume instantly without re-deriving context.

---

## Project Overview

MedSchedule replaces paper-based staff scheduling in healthcare facilities with a digital platform featuring AI-assisted schedule generation, calendar-based staff views, and real-time updates.

**Two user roles:**

- **Staff (Healthcare Workers)** — view personal schedule, request time off, request shift swaps, view announcements
- **Facility Administrators** — manage staff profiles, define staffing requirements, generate schedules via AI, drag-and-drop manual editing, approve/reject requests, publish schedules, track staffing gaps and overtime risk

---

## Team & Ownership

| Person               | Owns                                                  |
| -------------------- | ----------------------------------------------------- |
| **Ryker**            | Full stack — frontend (`medschedule-frontend`), backend (`medschedule-backend`), AI scheduling engine |

**Repos:**

| Repo | Path | Role |
|------|------|------|
| Frontend | `medschedule-frontend/` | Next.js UI (this repo) |
| Backend | `medschedule-backend/` | Express API + WebSocket + JSON persistence |

---

## Tech Stack

```
Framework:       Next.js 14+ (App Router)
Language:        TypeScript
Styling:         Tailwind CSS + shadcn/ui (Radix base, Nova preset)
Server State:    TanStack Query (React Query v5)
Calendar:        FullCalendar.js (react plugin)
Auth (client):   JWT in httpOnly cookie (set by backend, not accessed via JS)
Real-time:       socket.io-client
QR Code:         react-qr-code
Notifications:   Sonner
Forms:           React Hook Form + Zod
HTTP Client:     Axios
Icons:           Lucide React
```

---

## API Contract

`api-contract.md` (in project root) is the single source of truth for every endpoint, field name, request/response shape, status value, and date format used in this app. **Never deviate from it.** If a needed endpoint or field doesn't exist in the contract, that's a signal to raise it with the backend dev and update the contract — not to guess or work around it in code.

---

## Design System

The product should read as a clinical, trustworthy tool rather than a generic dashboard — inspired by cal.com, Linear, and Notion. Calm, restrained, scannable, mobile-first.

**Color tokens**

| Token          | Hex       | Use                                   |
| -------------- | --------- | ------------------------------------- |
| Background     | `#FAFAF8` | Page background                       |
| Surface        | `#FFFFFF` | Cards, panels                         |
| Border         | `#E4E1DC` | Dividers, outlines                    |
| Text primary   | `#1C1B1A` | Headings, body                        |
| Text secondary | `#6B6862` | Captions, metadata                    |
| Accent         | `#0F766E` | Primary actions, links, active states |

**Functional shift colors**

| Shift   | Hex       |
| ------- | --------- |
| Day     | `#D97706` |
| Evening | `#2563EB` |
| Night   | `#6D28D9` |

**Typography:** Inter throughout. 500/600 weight for headings, 400 for body. No decorative fonts.

**Signature layout pattern:** Status-first cards — a 4px colored left border indicating shift type or request status, instead of colored backgrounds or badge-only treatments. Lets users scan a week of shifts by color alone.

These tokens live as CSS variables in `globals.css`, layered on top of the shadcn Nova preset's existing spacing/radius system — only colors are overridden, not structure.

---

## Project Status

### ✅ Completed — July 7, 2026 (units, accessibility, staff contact fields — shipped to prod)

Client-requested pass on the Schedule Builder + staff profiles. Frontend (Vercel) and backend (Railway) both deployed and verified live.

**Schedule Builder — unit colors & grouping**
- `lib/units.ts` (new) — `getUnitColor()` hashes any free-form unit string (LTC, LTN, ICU, …) into a fixed 14-color palette, so every unit gets a stable color with no config.
- Calendar events now **fill by unit** with the **shift-type color as a left stripe** (combined encoding); added a unit color **legend** above the calendar.
- Shifts **grouped by unit within each day** via FullCalendar `eventOrder="unit,title"` (no longer interleaved).

**Schedule Builder — staff panel moved left + accessibility**
- Staff list moved from the right tab to a dedicated **left panel**, **grouped by role** in collapsible sections (tap RN → its people show). Right sidebar is now **Schedule Health only** (tabs removed).
- Sized up for older admins: larger text, bigger tap targets, more spacing. Each person shows **name · contract type · unit dot · phone**.
- Assignment dropdown in the shift modal is **grouped by unit** (`optgroup`); dragging a worker now drops into the **currently-viewed unit** (so any staff can cover a short unit), falling back to their home unit on "All Units".

**Staff profiles — new fields**
- Added **Travel Staff** employment type (`travel`), **phone number**, and **scheduling notes** (free-text admin notes like "only works nights", "can work different units") — form fields (add/edit), profile display, and MSW mock handlers. `types/api.ts` `StaffProfile` gains optional `phone`/`notes`; `lib/roles.ts` gains the `travel` label.

**Backend counterpart** (`medschedule-backend`, commit `f3fe967`)
- `StaffProfile` Prisma model + types gain `phone`/`notes` columns (migration `20260707120000_add_staff_phone_notes`; also covered by the live `db push` deploy); `employmentType` enum accepts `travel`; create/update staff routes validate + persist the new fields.
- Note: prod deploys via **Railway + Dockerfile `prisma db push`** (the `render.yaml` with `migrate deploy` is stale/unused). API base: `https://medschedule-api-production.up.railway.app/api`.

### ✅ Completed — June 17, 2026

- Next.js 14 app initialized via `create-next-app` (App Router, TypeScript, Tailwind, `@/*` import alias)
- shadcn/ui initialized — Radix base, Nova preset, CSS variables enabled
- Dependencies installed: `@tanstack/react-query`, `@tanstack/react-query-devtools`, `axios`, `@fullcalendar/react` + plugins, `react-hook-form`, `zod`, `@hookform/resolvers`, `socket.io-client`, `react-qr-code`, `sonner`, `lucide-react`
- Folder structure created: `app/`, `components/`, `hooks/`, `lib/`, `types/` (see structure below)
- `lib/axios.ts` — Axios instance configured with `withCredentials: true` and a 401 interceptor that redirects to login (skips auth endpoints so failed login/signup/me calls don't loop)
- `lib/queryClient.ts` — TanStack QueryClient configured (30s stale time, 1 retry, no refetch on window focus)
- `lib/apiError.ts` — Shared helper to extract API error messages from Axios responses
- `types/api.ts` — All TypeScript types from API contract Appendix B, plus `LoginRequest`, `SignupRequest`, `LoginResponse`, `SignupResponse`
- `lib/authToken.ts` — In-memory JWT store for `Authorization: Bearer` header (no localStorage); cookie still sent via `withCredentials`
- `app/layout.tsx` — Inter font, metadata, `QueryClientProvider` and Sonner `Toaster` via `app/providers.tsx`
- `.env.local` — `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` set as placeholders (port pending confirmation from backend dev)
- Verified dev server runs clean — `npm run dev`, loads at `localhost:3000`, no console or terminal errors
- Design system tokens applied to `globals.css` — MedSchedule colors, shift-type CSS variables, status-first card utilities (`.status-card`, `.status-card-day`, etc.)
- `hooks/useAuth.ts` — `useAuth` (GET `/auth/me`), `useLogin`, `useSignup`, `useRequestMagicLink`, `useVerifyMagicLink`, `getRoleRedirectPath`
- `app/auth/layout.tsx` — Centered auth shell with MedSchedule branding
- `app/auth/login/page.tsx` — Email/password + magic link tabs, POST `/auth/login` and `/auth/magic-link`
- `app/auth/magic-link/page.tsx` — Verifies `?token=` via POST `/auth/magic-link/verify`, redirects by role
- QR code login — `GET /auth/qr-token` on staff dashboard (`QrAccessCard`), landing page `/qr-login` → POST `/auth/qr-login/verify` (§1.7)
- `hooks/useAuth.ts` — added `useQrToken`, `useVerifyQrLogin`
- `react-qr-code` installed
- `api-contract.md` — §1.7 Verify QR Login added
- `app/auth/signup/page.tsx` — Registration form (RHF + Zod), POST `/auth/signup` with `role` + conditional `facilityId` for staff, role-based redirect
- shadcn `input` and `label` components added to `components/ui/`
- `api-contract.md` added to repo (v1.0) — auth implementation aligned to contract Section 1
- Staff dashboard (`app/dashboard/page.tsx`) — personal schedule calendar, month stats, upcoming shifts, announcements panel
- `hooks/useShifts.ts` — `useStaffShifts` (GET `/shifts?staffId&month`)
- `hooks/useAnnouncements.ts` — `useAnnouncements` (GET `/facilities/:facilityId/announcements`)
- `lib/schedule.ts` — shift-to-FullCalendar mapping, month helpers, design-system shift colors
- `components/schedule/` — `ShiftCalendar`, `ShiftCard`, `MonthNavigator`
- `components/staff/StaffDashboard.tsx` — auth guard (staff only), loading/error/empty states
- FullCalendar v6 installed (`@fullcalendar/react`, `daygrid`, `interaction`)
- `app/page.tsx` — root route redirects to login or role-based dashboard (replaces create-next-app placeholder)
- Admin area (`app/admin/`) — layout with sidebar nav, auth guard (admin only), mobile drawer
- Admin dashboard (`app/admin/page.tsx`) — staff/gap/request stats, gaps & overtime alerts, announcement posting
- Admin schedule builder (`app/admin/schedule/page.tsx`) — FullCalendar with drag-and-drop, manual shift CRUD, AI preview/confirm, publish
- Staff management (`app/admin/staff/page.tsx`) — list, search/filter, add/edit/deactivate staff profiles
- Swap & time-off requests (`app/admin/requests/page.tsx`) — tabbed review UI with approve/reject
- `hooks/useAdminSchedule.ts` — facility schedule, shift CRUD, publish, AI generate/confirm
- `hooks/useStaff.ts` — facility staff list, add/update/deactivate
- `hooks/useRequests.ts` — swap and time-off request queries + admin responses
- `hooks/useNotifications.ts` — GET `/notifications`, PATCH mark-as-read
- `hooks/useSocket.ts` — socket.io subscription for all Section 10 events (invalidates queries + toasts)
- `components/shared/NotificationBell.tsx` — notification dropdown in staff and admin headers
- `components/shared/SocketListener.tsx` — mounted in `app/providers.tsx` for authenticated users
- `socket.io-client` installed
- Staff requests (`/dashboard/requests`) — time-off submit + history (§7.1–7.2), shift swap submit (§6.1)
- `components/staff/` — `StaffNav`, `TimeOffRequestForm`, `TimeOffRequestsList`, `SwapRequestForm`, `StaffRequestsPage`
- Staff hooks extended in `useRequests.ts` — `useStaffTimeOffRequests`, `useSubmitTimeOffRequest`, `useSubmitSwapRequest`
- Admin facility onboarding (`app/admin/onboarding/page.tsx`) — new admins without `facilityId` create a facility via `POST /facilities`
- `hooks/useFacilities.ts` — `useCreateFacility` mutation invalidates `/auth/me` so admin guards pick up the new `facilityId`
- `app/admin/layout.tsx` — redirects facility-less admins to onboarding and keeps onboarding out of the normal sidebar shell

### ✅ Completed — June 24, 2026 (pass 4)

- Spinner consistency pass — replaced every remaining `animate-pulse` blob / plain "Loading…" text used to indicate an active operation with `animate-spin` border spinners matching the style used by the QR login page:
  - `app/page.tsx` — root redirect loading state was a `<p>` text node; now uses the standard spinner
  - `app/auth/magic-link/page.tsx` — "Signing you in…" state was a pulsing circle blob; Suspense fallback was plain text; both updated to spinners
- TypeScript clean (`npx tsc --noEmit` — zero errors)

### ✅ Completed — June 24, 2026 (pass 3)

- Staff sign-out — added sign-out button to `StaffHeader` (`LogOut` icon + label on ≥sm breakpoint); clears the in-memory token and redirects to login. Was missing entirely — staff had no way to log out without clearing cookies manually.
- Global error boundary — `app/error.tsx`; catches unhandled render errors, shows a friendly recovery card (error icon, "Try again" + "Go home" buttons, error digest for debugging)
- 404 page — `app/not-found.tsx`; replaces the raw Next.js default with a design-system card
- Socket noise fix — `useSocket.ts` now checks `NEXT_PUBLIC_WS_ENABLED !== "false"` before opening a connection; `.env.local` defaults this to `false` so no reconnection spam fills the console when running mock-only. Flip to `true` when the backend is live.

### ✅ Completed — June 24, 2026 (pass 2)

- Shape-matched skeleton loaders — second pass covering previously missed components:
  - `AdminLayoutSkeleton` — now mirrors sidebar (logo + 4 nav links with icon placeholders + user footer), top header (hamburger + notification bell), and stats/content area grid; was two generic blobs
  - `StaffRequestsPage.PageSkeleton` — now mirrors StaffHeader bar + StaffNav pill tabs + heading + tab switcher + labeled form field rows; was two generic blobs
  - `TimeOffRequestsList` loading — now matches request card shape (`status-card` left border + date/status row + reason line + timestamp); was two generic `h-16` blocks
- Empty state: `TimeOffRequestsList` — dashed-border card with heading + hint line; was a bare `<p>` tag
- QR login — "Signing you in…" state now shows an `animate-spin` spinner (active action) instead of an `animate-pulse` blob (passive load); Suspense fallback also updated to spinner

### ✅ Completed — June 24, 2026

- MSW (Mock Service Worker) dev layer — full API mock so the UI can be explored without a running backend:
  - `lib/mocks/handlers.ts` — handlers for every endpoint in the API contract (auth, staff, shifts, schedule, AI generate, swap/time-off requests, notifications, announcements); mutable in-memory state so mutations (create shift, approve request, post announcement) are reflected in subsequent reads
  - `lib/mocks/browser.ts` — MSW v2 `setupWorker` wired to all handlers
  - `app/MSWProvider.tsx` — client component that starts the worker before any queries fire; shows a spinner while initializing; no-ops in production
  - `app/providers.tsx` — wraps the app in `MSWProvider`; also adds `ReactQueryDevtools` in dev
  - Dev login shortcuts on the login page — two buttons (Admin: Sarah Chen / Staff: Amara Johnson) that call the real `useLogin` mutation through MSW so the full auth flow runs; only rendered when `NODE_ENV === "development"`
  - Mock data covers: 6 staff profiles, 27 shifts across June+July 2026, 3 announcements (1 urgent), 2 pending swap requests, 2 pending time-off requests, 3 notifications; mutations mutate in-memory state for the session
- `msw@2.14.6` added as devDependency; service worker initialized in `public/mockServiceWorker.js`

### ✅ Completed — June 23, 2026

- Bug fix: `useUpdateShift` hook — `shiftId` was captured at hook initialization from `editingShift` state (null during drag-and-drop), causing `PATCH /shifts/` with an empty path on drop. Moved `shiftId` into the mutation payload so both drag-drop and manual edit pass it explicitly at call time.
- Shape-matched skeleton loaders across all pages and shared components — every loading state now mirrors the exact shape of the content it replaces:
  - `AnnouncementsPanel` — announcement card shape (left border + title + body lines)
  - `NotificationBell` — notification item shape (title + message + timestamp lines)
  - `StaffDashboard` — full page skeleton: header, nav tabs, month navigator, 2 stat cards, calendar grid (7-col × 5-row), shift card list, announcements
  - Admin dashboard gaps section — alert card shape (left border + title + meta lines)
  - Admin dashboard announcements section — announcement card shape + canonical Tailwind class fixes (`max-h-[300px]` → `max-h-75`, `max-h-[350px]` → `max-h-87.5`)
  - Schedule builder — 5-row calendar grid skeleton + empty state with prompt when month has no shifts
  - Staff directory — list item skeletons (name + status badge + role/unit/type row)
  - Request center — request card skeletons for both time-off (border-left + name/dates/reason + action area) and swap (border-left + two-column swap layout + action area)

### 🚧 In Progress / Next Up

- [ ] **Backend:** staff profiles, shifts, requests, notifications (see `medschedule-backend/README.md`)
- [ ] **Backend:** staff read access for facility roster + colleague shifts (swap UI)
- [ ] Staffing requirements model + admin UI (not in contract yet)
- [ ] AI scheduling engine (`POST /ai/generate-schedule`)

### ⚠️ Known Gotchas (Windows-specific)

- `shadcn init` threw `EPERM: scandir 'Application Data'` — caused by running the command from the home directory (`/c/Users/Admin`) instead of inside the project folder. Fix: always `cd` into the project before running CLI commands.
- shadcn CLI now prompts for `--base` (Radix vs Base UI — chose **Radix**) and `--preset` (style — chose **Nova**, the default/classic look)
- Windows Command Prompt does not support `mkdir -p` or bash syntax — use **Git Bash** for all commands in this project, not Command Prompt or plain PowerShell
- `npm install` for individual packages can silently fail to fully complete if interrupted — if a module shows "cannot find module" in VS Code despite being in `package.json`, run a full `npm install` (no package name) to catch anything missing

---

## File Structure

```
medschedule-frontend/
├── app/
│   ├── auth/
│   │   ├── layout.tsx           ✅ done
│   │   ├── login/page.tsx       ✅ done
│   │   ├── magic-link/page.tsx  ✅ done
│   │   └── signup/page.tsx      ✅ done
│   ├── qr-login/page.tsx        ✅ done
│   ├── dashboard/
│   │   ├── page.tsx             ✅ done
│   │   └── requests/page.tsx    ✅ done
│   ├── admin/
│   │   ├── layout.tsx           ✅ done
│   │   ├── page.tsx             ✅ done
│   │   ├── onboarding/page.tsx  ✅ done
│   │   ├── schedule/page.tsx    ✅ done
│   │   ├── staff/page.tsx       ✅ done
│   │   └── requests/page.tsx    ✅ done
│   ├── layout.tsx               ✅ done
│   └── globals.css              ✅ done (design tokens applied)
├── components/
│   ├── ui/                      (button, input, label)
│   ├── schedule/                (ShiftCalendar, ShiftCard, MonthNavigator)
│   ├── staff/                   (StaffDashboard, StaffRequestsPage, QrAccessCard, forms, StaffNav)
│   ├── admin/                   (not yet started)
│   └── shared/                  (StaffHeader, AnnouncementsPanel, NotificationBell, SocketListener)
├── hooks/
│   ├── useAuth.ts                ✅ done
│   ├── useShifts.ts              ✅ done
│   ├── useAnnouncements.ts       ✅ done
│   ├── useAdminSchedule.ts       ✅ done
│   ├── useFacilities.ts          ✅ done
│   ├── useStaff.ts               ✅ done
│   ├── useRequests.ts            ✅ done
│   ├── useNotifications.ts       ✅ done
│   └── useSocket.ts              ✅ done
├── lib/
│   ├── axios.ts                  ✅ done
│   ├── apiError.ts               ✅ done
│   ├── authToken.ts              ✅ done
│   ├── queryClient.ts            ✅ done
│   └── schedule.ts               ✅ done
├── types/
│   └── api.ts                    ✅ done
├── .env.local                    ✅ done (placeholder values)
├── api-contract.md                ✅ done (v1.0 — single source of truth)
└── README.md                      this file
```

---

## Environment Variables

`.env.local` (not committed to git):

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=ws://localhost:5000
```

> Port `5000` is a placeholder — confirm actual local port with the backend dev and update here.

---

## How to Run

### Frontend-only (mock data — no backend needed)

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. On the login page, use the **"Dev shortcuts"** buttons to sign in instantly as admin (Sarah Chen) or staff (Amara Johnson). All API calls are intercepted by MSW with realistic mock data. Sessions don't persist across page refreshes — just click the dev button again.

### Full stack (frontend + backend)

**Terminal 1 — Backend**

```bash
cd ../medschedule-backend
npm install
npm run dev
```

**Terminal 2 — Frontend**

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. API at `http://localhost:5000/api`.

> MSW is automatically disabled in production builds.

---

## Rules for Continuing Work

1. **Always check the "Completed" and "In Progress" sections above before starting work** — don't redo what's done, don't skip what isn't.
2. **Follow `api-contract.md` exactly** — field names, URLs, methods, status values, date formats. No exceptions.
3. **Follow `api-contract.md` exactly** — field names, URLs, methods, status values, date formats. No exceptions.
4. **Backend lives in `medschedule-backend/`** — keep both READMEs updated.
5. **No `any` types.** Type everything against `types/api.ts`.
5. **Tailwind only** — no inline styles, no separate CSS files per component.
6. **Update this README after every meaningful change.** Move completed items from "In Progress" to "Completed" with a dated entry, and add anything new that's now blocking or next. This file is what makes the project resumable across sessions and team members.
