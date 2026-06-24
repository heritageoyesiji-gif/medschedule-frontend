"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Building2, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRoleRedirectPath, useInviteInfo, useSignup } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/apiError";
import type { UserRole } from "@/types/api";

const signupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["admin", "staff"]),
    facilityId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "staff" && !data.facilityId?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Facility ID is required for staff accounts",
        path: ["facilityId"],
      });
    }
  });

type SignupFormValues = z.infer<typeof signupSchema>;

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const signup = useSignup();
  const inviteInfo = useInviteInfo(inviteToken);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "admin",
      facilityId: "",
    },
  });

  // Pre-fill form when invite data arrives
  useEffect(() => {
    if (inviteInfo.data) {
      reset({
        firstName: "",
        lastName: "",
        email: inviteInfo.data.email,
        password: "",
        role: "staff",
        facilityId: inviteInfo.data.facilityId,
      });
    }
  }, [inviteInfo.data, reset]);

  const selectedRole = watch("role");
  const isInviteMode = Boolean(inviteToken && inviteInfo.data);

  const onSubmit = async (values: SignupFormValues) => {
    try {
      const payload: Record<string, unknown> = {
        firstName: values.firstName,
        lastName: values.lastName,
        password: values.password,
      };

      if (inviteToken && inviteInfo.data) {
        payload.inviteToken = inviteToken;
      } else {
        payload.email = values.email;
        payload.role = values.role as UserRole;
        if (values.role === "staff" && values.facilityId) {
          payload.facilityId = values.facilityId.trim();
        }
      }

      const result = await signup.mutateAsync(payload as Parameters<typeof signup.mutateAsync>[0]);
      toast.success("Account created successfully");
      router.push(getRoleRedirectPath(result.role));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to create account"));
    }
  };

  // Loading invite info
  if (inviteToken && inviteInfo.isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8 flex items-center justify-center min-h-50">
        <div className="size-7 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  // Invalid invite token
  if (inviteToken && inviteInfo.isError) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8 text-center space-y-4">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <Mail className="size-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Invite link expired</h2>
        <p className="text-sm text-muted-foreground">
          This invite link is invalid or has already been used. Ask your administrator to send a new one.
        </p>
        <Button variant="outline" asChild>
          <Link href="/auth/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
      {isInviteMode ? (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <Building2 className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">
              You&apos;ve been invited to join {inviteInfo.data!.facilityName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create your account to get started
            </p>
          </div>
        </div>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-foreground">Create account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedRole === "admin"
              ? "Register as a facility administrator"
              : "Join your facility as a staff member"}
          </p>
        </>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className={`space-y-4 ${isInviteMode ? "" : "mt-6"}`} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              autoComplete="given-name"
              placeholder="Amara"
              aria-invalid={Boolean(errors.firstName)}
              {...register("firstName")}
            />
            {errors.firstName ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.firstName.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              autoComplete="family-name"
              placeholder="Johnson"
              aria-invalid={Boolean(errors.lastName)}
              {...register("lastName")}
            />
            {errors.lastName ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.lastName.message}
              </p>
            ) : null}
          </div>
        </div>

        {!isInviteMode && (
          <div className="space-y-2">
            <Label htmlFor="role">Account type</Label>
            <select
              id="role"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-invalid={Boolean(errors.role)}
              {...register("role")}
            >
              <option value="admin">Facility administrator</option>
              <option value="staff">Healthcare worker</option>
            </select>
            {errors.role ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.role.message}
              </p>
            ) : null}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@facility.com"
            readOnly={isInviteMode}
            className={isInviteMode ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        {!isInviteMode && selectedRole === "staff" ? (
          <div className="space-y-2">
            <Label htmlFor="facilityId">Facility ID</Label>
            <Input
              id="facilityId"
              placeholder="fac_001"
              aria-invalid={Boolean(errors.facilityId)}
              {...register("facilityId")}
            />
            <p className="text-xs text-muted-foreground">
              Provided by your facility administrator
            </p>
            {errors.facilityId ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.facilityId.message}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={signup.isPending}
        >
          {signup.isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8 flex items-center justify-center min-h-50"><div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div>}>
      <SignupContent />
    </Suspense>
  );
}
