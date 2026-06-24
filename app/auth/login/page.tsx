"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getRoleRedirectPath,
  useLogin,
  useRequestMagicLink,
} from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/apiError";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const magicLinkSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type MagicLinkFormValues = z.infer<typeof magicLinkSchema>;
type LoginMode = "password" | "magic-link";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const requestMagicLink = useRequestMagicLink();
  const [mode, setMode] = useState<LoginMode>("password");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sentToEmail, setSentToEmail] = useState("");

  const passwordForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const magicLinkForm = useForm<MagicLinkFormValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: "" },
  });

  const onPasswordSubmit = async (values: LoginFormValues) => {
    try {
      const { user } = await login.mutateAsync(values);
      toast.success(`Welcome back, ${user.firstName}`);
      router.push(getRoleRedirectPath(user.role));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Invalid email or password"));
    }
  };

  const onMagicLinkSubmit = async (values: MagicLinkFormValues) => {
    try {
      const result = await requestMagicLink.mutateAsync(values);
      setSentToEmail(values.email);
      setMagicLinkSent(true);
      toast.success(result.message);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to send magic link"));
    }
  };

  const switchMode = (nextMode: LoginMode) => {
    setMode(nextMode);
    setMagicLinkSent(false);
    setSentToEmail("");
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
      <h2 className="text-lg font-semibold text-foreground">Sign in</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "password"
          ? "Enter your credentials to access your schedule"
          : "We'll email you a secure sign-in link"}
      </p>

      <div className="mt-6 flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => switchMode("password")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
            mode === "password"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => switchMode("magic-link")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
            mode === "magic-link"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Magic link
        </button>
      </div>

      {mode === "password" ? (
        <form
          onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
          className="mt-6 space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@facility.com"
              aria-invalid={Boolean(passwordForm.formState.errors.email)}
              {...passwordForm.register("email")}
            />
            {passwordForm.formState.errors.email ? (
              <p className="text-sm text-destructive" role="alert">
                {passwordForm.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={Boolean(passwordForm.formState.errors.password)}
              {...passwordForm.register("password")}
            />
            {passwordForm.formState.errors.password ? (
              <p className="text-sm text-destructive" role="alert">
                {passwordForm.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={login.isPending}
          >
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      ) : magicLinkSent ? (
        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-6 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10">
            <Mail className="size-5 text-primary" />
          </div>
          <p className="font-medium text-foreground">Check your email</p>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a sign-in link to{" "}
            <span className="font-medium text-foreground">{sentToEmail}</span>.
            Click the link in the email to access your account.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => {
              setMagicLinkSent(false);
              magicLinkForm.reset({ email: sentToEmail });
            }}
          >
            Send again
          </Button>
        </div>
      ) : (
        <form
          onSubmit={magicLinkForm.handleSubmit(onMagicLinkSubmit)}
          className="mt-6 space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="magic-email">Email</Label>
            <Input
              id="magic-email"
              type="email"
              autoComplete="email"
              placeholder="you@facility.com"
              aria-invalid={Boolean(magicLinkForm.formState.errors.email)}
              {...magicLinkForm.register("email")}
            />
            {magicLinkForm.formState.errors.email ? (
              <p className="text-sm text-destructive" role="alert">
                {magicLinkForm.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={requestMagicLink.isPending}
          >
            {requestMagicLink.isPending ? "Sending link…" : "Email me a sign-in link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/signup"
          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Create one
        </Link>
      </p>

    </div>
  );
}
