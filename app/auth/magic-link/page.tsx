"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getRoleRedirectPath, useVerifyMagicLink } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/apiError";

function MagicLinkVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyMagicLink = useVerifyMagicLink();
  const hasAttempted = useRef(false);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      return;
    }
    if (hasAttempted.current) {
      return;
    }
    hasAttempted.current = true;

    void (async () => {
      try {
        const { user } = await verifyMagicLink.mutateAsync({ token });
        toast.success(`Welcome back, ${user.firstName}`);
        router.replace(getRoleRedirectPath(user.role));
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, "This sign-in link is invalid or expired"),
        );
      }
    })();
  }, [token, verifyMagicLink, router]);

  if (!token) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm md:p-8">
        <h2 className="text-lg font-semibold text-foreground">
          Invalid sign-in link
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This link is missing a token. Request a new magic link from the login
          page.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/auth/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  if (verifyMagicLink.isError) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm md:p-8">
        <h2 className="text-lg font-semibold text-foreground">
          Link expired or invalid
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {getApiErrorMessage(
            verifyMagicLink.error,
            "This sign-in link is no longer valid.",
          )}
        </p>
        <Button asChild className="mt-6">
          <Link href="/auth/login">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm md:p-8">
      <h2 className="text-lg font-semibold text-foreground">Signing you in…</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Verifying your magic link. You&apos;ll be redirected shortly.
      </p>
      <div className="mx-auto mt-6 size-6 animate-spin rounded-full border-2 border-muted border-t-accent" />
    </div>
  );
}

function MagicLinkFallback() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm md:p-8">
      <div className="mx-auto size-6 animate-spin rounded-full border-2 border-muted border-t-accent" />
    </div>
  );
}

export default function MagicLinkVerifyPage() {
  return (
    <Suspense fallback={<MagicLinkFallback />}>
      <MagicLinkVerifyContent />
    </Suspense>
  );
}
