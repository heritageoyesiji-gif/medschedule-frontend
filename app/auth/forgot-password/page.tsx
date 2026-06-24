"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPassword } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/apiError";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const [sent, setSent] = useState(false);
  const [sentToEmail, setSentToEmail] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await forgotPassword.mutateAsync(values);
      setSentToEmail(values.email);
      setSent(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to send reset link"));
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
      <h2 className="text-lg font-semibold text-foreground">Reset your password</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a reset link
      </p>

      {sent ? (
        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-6 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10">
            <Mail className="size-5 text-primary" />
          </div>
          <p className="font-medium text-foreground">Check your email</p>
          <p className="mt-2 text-sm text-muted-foreground">
            If{" "}
            <span className="font-medium text-foreground">{sentToEmail}</span>{" "}
            has an account, a reset link has been sent. It expires in 15 minutes.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSent(false);
              form.reset({ email: sentToEmail });
            }}
          >
            Send again
          </Button>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@facility.com"
              aria-invalid={Boolean(form.formState.errors.email)}
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={forgotPassword.isPending}
          >
            {forgotPassword.isPending ? "Sending link…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
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
