"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRoleRedirectPath, useAuth } from "@/hooks/useAuth";

export default function Home() {
  const router = useRouter();
  const { user, role, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user || !role) {
      router.replace("/auth/login");
      return;
    }

    router.replace(getRoleRedirectPath(role));
  }, [isLoading, user, role, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-accent" />
    </div>
  );
}
