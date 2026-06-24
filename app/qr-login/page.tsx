"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getRoleRedirectPath, useVerifyQrLogin } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/apiError";

function QrLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyQrLogin = useVerifyQrLogin();
  const hasAttempted = useRef(false);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token || hasAttempted.current) {
      return;
    }
    hasAttempted.current = true;

    void (async () => {
      try {
        const { user } = await verifyQrLogin.mutateAsync({ token });
        toast.success(`Welcome, ${user.firstName}`);
        router.replace(getRoleRedirectPath(user.role));
      } catch (err) {
        toast.error(
          getApiErrorMessage(err, "This QR code is invalid or expired"),
        );
      }
    })();
  }, [token, verifyQrLogin, router]);

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm md:p-8">
          <h1 className="text-lg font-semibold text-foreground">Invalid QR link</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This link is missing a token. Generate a new QR code from your
            schedule page.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/auth/login">Sign in with password</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (verifyQrLogin.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm md:p-8">
          <h1 className="text-lg font-semibold text-foreground">
            QR code expired
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {getApiErrorMessage(
              verifyQrLogin.error,
              "This QR code is no longer valid.",
            )}
          </p>
          <Button asChild className="mt-6">
            <Link href="/auth/login">Sign in manually</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm md:p-8">
        <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        <h1 className="text-lg font-semibold text-foreground">Signing you in…</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Verifying your QR code. You&apos;ll be redirected to your schedule.
        </p>
      </div>
    </div>
  );
}

export default function QrLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="size-6 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      }
    >
      <QrLoginContent />
    </Suspense>
  );
}
