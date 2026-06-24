"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPassword } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/apiError";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const resetPassword = useResetPassword();
  const [done, setDone] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      toast.error("Invalid or missing reset token");
      return;
    }
    try {
      await resetPassword.mutateAsync({ token, password: values.password });
      setDone(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Reset link is invalid or expired"));
    }
  };

  if (!token) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Invalid reset link.{" "}
          <Link href="/auth/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
            Request a new one
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
      <h2 className="text-lg font-semibold text-foreground">Set a new password</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a password at least 8 characters long
      </p>

      {done ? (
        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-6 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="size-5 text-primary" />
          </div>
          <p className="font-medium text-foreground">Password updated</p>
          <p className="mt-2 text-sm text-muted-foreground">
            You can now sign in with your new password.
          </p>
          <Button
            type="button"
            className="mt-4"
            onClick={() => router.push("/auth/login")}
          >
            Go to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={Boolean(form.formState.errors.password)}
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={Boolean(form.formState.errors.confirm)}
              {...form.register("confirm")}
            />
            {form.formState.errors.confirm ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.confirm.message}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={resetPassword.isPending}
          >
            {resetPassword.isPending ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          href="/auth/login"
          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8 flex items-center justify-center min-h-50"><div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
