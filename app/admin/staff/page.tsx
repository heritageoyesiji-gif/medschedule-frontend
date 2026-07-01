"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertCircle,
  Mail,
  Plus,
  Search,
  ShieldAlert,
  User,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  useAddStaff,
  useDeactivateStaff,
  useFacilityStaff,
  useInviteStaff,
  useUpdateStaff,
} from "@/hooks/useStaff";
import { getApiErrorMessage } from "@/lib/apiError";
import { getEmploymentLabel, getRoleColors, getRoleDotColor, getRoleLabel } from "@/lib/roles";
import { useActiveFacilityId } from "@/hooks/useActiveFacility";
import { QueryError } from "@/components/shared/QueryError";
import type {
  EmploymentType,
  ShiftType,
  StaffProfile,
  StaffRoleType,
} from "@/types/api";

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const SHIFT_TYPES: ShiftType[] = ["day", "evening", "night"];

// Zod schemas
const staffFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email address"),
  roleType: z.enum(["RN", "PSW", "LPN", "LTCA", "doctor", "technician"]),
  unit: z.string().min(1, "Unit is required"),
  employmentType: z.enum(["fulltime-permanent", "fulltime-temporary", "parttime-permanent", "parttime-temporary", "casual"]),
  maxHoursPerWeek: z
    .number()
    .min(1, "Must be at least 1 hour")
    .max(168, "Cannot exceed 168 hours"),
  qualifications: z.string(),
  availability: z.record(
    z.string(),
    z.array(z.enum(["day", "evening", "night", "D12", "N12", "D8", "N8"]))
  ),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

export default function StaffManagementPage() {
  const { user } = useAuth();
  const facilityId = useActiveFacilityId();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // Queries & Mutations
  const { data: staffData, isLoading, isError, refetch } = useFacilityStaff(facilityId);
  const addStaff = useAddStaff(facilityId);
  const updateStaff = useUpdateStaff(facilityId, selectedStaff?.userId ?? "");
  const deactivateStaff = useDeactivateStaff(facilityId, selectedStaff?.userId ?? "");
  const inviteStaff = useInviteStaff(facilityId);

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      roleType: "RN",
      unit: "ICU",
      employmentType: "fulltime-permanent",
      maxHoursPerWeek: 40,
      qualifications: "",
      availability: DAYS_OF_WEEK.reduce(
        (acc, day) => ({ ...acc, [day]: ["day", "evening"] }),
        {}
      ),
    },
  });

  const availabilityWatch = watch("availability") || {};

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    reset({
      firstName: "",
      lastName: "",
      email: "",
      roleType: "RN",
      unit: "ICU",
      employmentType: "fulltime-permanent",
      maxHoursPerWeek: 40,
      qualifications: "",
      availability: DAYS_OF_WEEK.reduce(
        (acc, day) => ({ ...acc, [day]: ["day", "evening"] }),
        {}
      ),
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (staff: StaffProfile) => {
    setIsEditMode(true);
    reset({
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      roleType: staff.roleType,
      unit: staff.unit,
      employmentType: staff.employmentType,
      maxHoursPerWeek: staff.maxHoursPerWeek,
      qualifications: (staff.qualifications || []).join(", "),
      availability: staff.availability || {},
    });
    setIsAddModalOpen(true);
  };

  const onSubmit = async (values: StaffFormValues) => {
    try {
      const quals = values.qualifications
        .split(",")
        .map((q) => q.trim())
        .filter(Boolean);

      if (isEditMode && selectedStaff) {
        // Update staff (email cannot be updated, so it is filtered out by payload mapping)
        const updated = await updateStaff.mutateAsync({
          firstName: values.firstName,
          lastName: values.lastName,
          roleType: values.roleType as StaffRoleType,
          unit: values.unit,
          qualifications: quals,
          employmentType: values.employmentType as EmploymentType,
          availability: values.availability as Record<string, ShiftType[]>,
          maxHoursPerWeek: values.maxHoursPerWeek,
        });
        toast.success("Staff profile updated successfully");
        setSelectedStaff(updated);
      } else {
        // Add new staff
        await addStaff.mutateAsync({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          roleType: values.roleType as StaffRoleType,
          unit: values.unit,
          qualifications: quals,
          employmentType: values.employmentType as EmploymentType,
          availability: values.availability as Record<string, ShiftType[]>,
          maxHoursPerWeek: values.maxHoursPerWeek,
        });
        toast.success("Staff member added successfully");
      }
      setIsAddModalOpen(false);
      void refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Operation failed"));
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteStaff.mutateAsync({ email: inviteEmail });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setIsInviteModalOpen(false);
      setInviteEmail("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to send invitation"));
    }
  };

  const handleDeactivate = async () => {
    if (!selectedStaff) return;
    if (
      !confirm(
        `Are you sure you want to deactivate ${selectedStaff.firstName} ${selectedStaff.lastName}? They will no longer be able to log in or be scheduled.`
      )
    ) {
      return;
    }

    try {
      await deactivateStaff.mutateAsync();
      toast.success("Staff member deactivated");
      setSelectedStaff({ ...selectedStaff, status: "inactive" });
      void refetch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Deactivation failed"));
    }
  };

  const toggleAvailability = (day: string, type: ShiftType) => {
    const current = availabilityWatch[day] || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setValue(`availability.${day}`, updated as ShiftType[]);
  };

  // Data processing
  const staffList = staffData?.staff ?? [];

  // Unique units for filter dropdown
  const uniqueUnits = Array.from(new Set(staffList.map((s) => s.unit)));

  const filteredStaff = staffList.filter((staff) => {
    const matchesSearch =
      `${staff.firstName} ${staff.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || staff.roleType === roleFilter;
    const matchesUnit = unitFilter === "all" || staff.unit === unitFilter;
    return matchesSearch && matchesRole && matchesUnit;
  });

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
      {/* Left Pane - Staff Directory */}
      <div className="flex-1 flex flex-col border-r border-border bg-background max-h-full min-w-0">
        {/* Search and Filters Header */}
        <div className="p-4 border-b border-border bg-card space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold text-foreground">
              Staff Directory
            </h1>
            <div className="flex gap-2">
              <Button
                onClick={() => { setInviteEmail(""); setIsInviteModalOpen(true); }}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Mail className="size-4" /> Invite
              </Button>
              <Button onClick={handleOpenAddModal} size="sm" className="gap-2">
                <Plus className="size-4" /> Add Staff
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {/* Search Input */}
            <div className="relative col-span-1 sm:col-span-1">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-accent"
            >
              <option value="all">All Roles</option>
              <option value="RN">RN — Registered Nurse</option>
              <option value="LPN">LPN — Licensed Practical Nurse</option>
              <option value="PSW">CCA/PSW</option>
              <option value="LTCA">LTCA</option>
              <option value="doctor">Doctor</option>
              <option value="technician">Technician</option>
            </select>

            {/* Unit Filter */}
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-accent"
            >
              <option value="all">All Units</option>
              {uniqueUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {isLoading ? (
            <div
              className="divide-y divide-border"
              aria-busy="true"
              aria-label="Loading staff"
            >
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-12 animate-pulse rounded-full bg-muted" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-8 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                  <div className="h-3 w-10 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-4">
              <QueryError message="Couldn't load staff members." onRetry={() => void refetch()} />
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground border-dashed border-border m-4 border rounded-xl">
              No staff members found matching criteria.
            </div>
          ) : (
            filteredStaff.map((staff) => (
              <button
                key={staff.userId}
                onClick={() => {
                  setSelectedStaff(staff);
                }}
                className={`w-full text-left p-4 flex items-center justify-between gap-4 transition-colors focus-visible:outline-none focus-visible:bg-muted ${
                  selectedStaff?.userId === staff.userId
                    ? "bg-accent/5"
                    : "hover:bg-muted/40"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {staff.firstName} {staff.lastName}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        staff.status === "active"
                          ? "bg-teal-50 text-accent border border-teal-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {staff.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {(() => {
                      const c = getRoleColors(staff.roleType);
                      return (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${c.bg} ${c.text} ${c.border}`}>
                          {getRoleLabel(staff.roleType)}
                        </span>
                      );
                    })()}
                    <span className="text-xs text-muted-foreground">{staff.unit}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{getEmploymentLabel(staff.employmentType)}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {staff.maxHoursPerWeek}h/wk
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Pane - Staff Details / Profile Panel */}
      <div className="w-full lg:w-96 shrink-0 bg-card border-t lg:border-t-0 border-border max-h-full overflow-y-auto flex flex-col">
        {selectedStaff ? (
          <div className="p-6 flex-1 flex flex-col space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {selectedStaff.firstName} {selectedStaff.lastName}
                </h2>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  ID: {selectedStaff.userId}
                </p>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="rounded-lg p-2 hover:bg-muted lg:hidden"
                aria-label="Close details"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Mail className="size-4" />
                <span className="text-foreground">{selectedStaff.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <User className="size-4" />
                <span className="text-foreground flex items-center gap-2">
                  {(() => {
                    const c = getRoleColors(selectedStaff.roleType);
                    return (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${c.bg} ${c.text} ${c.border}`}>
                        {getRoleLabel(selectedStaff.roleType)}
                      </span>
                    );
                  })()}
                  <span className="text-muted-foreground text-xs">({getEmploymentLabel(selectedStaff.employmentType)})</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Users className="size-4" />
                <span className="text-foreground">Unit: {selectedStaff.unit}</span>
              </div>
            </div>

            {/* Qualifications */}
            <div>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                Qualifications
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {selectedStaff.qualifications?.length > 0 ? (
                  selectedStaff.qualifications.map((q, i) => (
                    <span
                      key={i}
                      className="text-xs bg-muted px-2.5 py-1 rounded-md text-foreground font-medium"
                    >
                      {q}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    No qualifications listed.
                  </span>
                )}
              </div>
            </div>

            {/* Weekly Hours */}
            <div>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                Contract Settings
              </h3>
              <div className="rounded-lg border border-border p-3 bg-background/50 flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Max Hours / Week</span>
                <span className="font-semibold text-foreground">
                  {selectedStaff.maxHoursPerWeek} hours
                </span>
              </div>
            </div>

            {/* Availability Matrix */}
            <div>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                Weekly Availability
              </h3>
              <div className="rounded-lg border border-border overflow-hidden bg-background">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="p-2 font-medium text-muted-foreground">Day</th>
                      <th className="p-2 font-medium text-muted-foreground">Availability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {DAYS_OF_WEEK.map((day) => {
                      const dayAvail = selectedStaff.availability?.[day] || [];
                      return (
                        <tr key={day}>
                          <td className="p-2 capitalize font-medium text-foreground">
                            {day.slice(0, 3)}
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1.5">
                              {dayAvail.length > 0 ? (
                                dayAvail.map((t) => (
                                  <span
                                    key={t}
                                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                      t === "day"
                                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                                        : t === "evening"
                                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                                        : "bg-purple-100 text-purple-800 border border-purple-200"
                                    }`}
                                  >
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted-foreground italic text-[10px]">
                                  Unavailable
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            {selectedStaff.status === "active" && (
              <div className="pt-6 border-t border-border flex gap-3">
                <Button
                  onClick={() => handleOpenEditModal(selectedStaff)}
                  variant="outline"
                  className="flex-1"
                >
                  Edit Profile
                </Button>
                <Button
                  onClick={handleDeactivate}
                  variant="outline"
                  disabled={deactivateStaff.isPending}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Deactivate
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground flex-1 flex flex-col justify-center items-center">
            <Users className="size-8 text-muted-foreground/60 mb-2" />
            Select a staff member to view full profiles, weekly availability, and actions.
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-lg">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground">Invite Staff Member</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="rounded-lg p-2 hover:bg-muted"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                An email invitation will be sent with a link to create their account. The link expires in 7 days.
              </p>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="staff@facility.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteStaff.isPending}>
                  {inviteStaff.isPending ? "Sending…" : "Send invite"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-2xl rounded-xl shadow-lg flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground">
                {isEditMode ? "Edit Staff Profile" : "Add New Staff Member"}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-2 hover:bg-muted"
                aria-label="Close dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Form body */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="p-6 space-y-4 overflow-y-auto flex-1 text-sm"
              noValidate
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="form-firstName">First Name</Label>
                  <Input
                    id="form-firstName"
                    placeholder="Amara"
                    aria-invalid={Boolean(errors.firstName)}
                    {...register("firstName")}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="form-lastName">Last Name</Label>
                  <Input
                    id="form-lastName"
                    placeholder="Johnson"
                    aria-invalid={Boolean(errors.lastName)}
                    {...register("lastName")}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="form-email">Email Address</Label>
                <Input
                  id="form-email"
                  type="email"
                  placeholder="amara.johnson@facility.com"
                  disabled={isEditMode}
                  aria-invalid={Boolean(errors.email)}
                  {...register("email")}
                />
                {isEditMode && (
                  <p className="text-xs text-muted-foreground">
                    Email address cannot be changed after registration.
                  </p>
                )}
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="form-roleType">Role Type</Label>
                  <select
                    id="form-roleType"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 outline-none focus-visible:border-accent"
                    {...register("roleType")}
                  >
                    <option value="RN">RN — Registered Nurse</option>
                    <option value="LPN">LPN — Licensed Practical Nurse</option>
                    <option value="PSW">CCA/PSW</option>
                    <option value="LTCA">LTCA</option>
                    <option value="doctor">Doctor</option>
                    <option value="technician">Technician</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="form-unit">Unit Assignment</Label>
                  <Input
                    id="form-unit"
                    placeholder="ICU"
                    aria-invalid={Boolean(errors.unit)}
                    {...register("unit")}
                  />
                  {errors.unit && (
                    <p className="text-xs text-destructive">{errors.unit.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="form-employmentType">Employment Type</Label>
                  <select
                    id="form-employmentType"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 outline-none focus-visible:border-accent"
                    {...register("employmentType")}
                  >
                    <option value="fulltime-permanent">Full-time Permanent</option>
                    <option value="fulltime-temporary">Full-time Temporary</option>
                    <option value="parttime-permanent">Part-time Permanent</option>
                    <option value="parttime-temporary">Part-time Temporary</option>
                    <option value="casual">Casual</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="form-maxHours">Max Hours Per Week</Label>
                  <Input
                    id="form-maxHours"
                    type="number"
                    aria-invalid={Boolean(errors.maxHoursPerWeek)}
                    {...register("maxHoursPerWeek", { valueAsNumber: true })}
                  />
                  {errors.maxHoursPerWeek && (
                    <p className="text-xs text-destructive">{errors.maxHoursPerWeek.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="form-qualifications">Qualifications (comma-separated)</Label>
                  <Input
                    id="form-qualifications"
                    placeholder="ACLS, Critical Care, Suture"
                    {...register("qualifications")}
                  />
                </div>
              </div>

              {/* Weekly Availability Setup */}
              <div className="space-y-2 border-t border-border pt-4">
                <h4 className="font-semibold text-foreground">
                  Allowed Shifts / Weekly Availability
                </h4>
                <p className="text-xs text-muted-foreground">
                  Select which shifts this staff member is allowed to be scheduled for each day.
                </p>

                <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-border p-3 bg-background">
                  {DAYS_OF_WEEK.map((day) => {
                    const dayAvail = availabilityWatch[day] || [];
                    return (
                      <div
                        key={day}
                        className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border last:border-b-0 gap-2"
                      >
                        <span className="capitalize font-medium min-w-[80px]">
                          {day}
                        </span>
                        <div className="flex gap-2">
                          {SHIFT_TYPES.map((type) => {
                            const active = dayAvail.includes(type);
                            return (
                              <button
                                type="button"
                                key={type}
                                onClick={() => toggleAvailability(day, type)}
                                className={`text-xs font-semibold uppercase px-2.5 py-1 rounded transition-colors ${
                                  active
                                    ? type === "day"
                                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                                      : type === "evening"
                                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                                      : "bg-purple-100 text-purple-800 border border-purple-300"
                                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                                }`}
                              >
                                {type}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addStaff.isPending || updateStaff.isPending}
                >
                  {addStaff.isPending || updateStaff.isPending
                    ? "Saving..."
                    : isEditMode
                    ? "Save Changes"
                    : "Add Staff"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
