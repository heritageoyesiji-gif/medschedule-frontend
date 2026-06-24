"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { setAuthToken } from "@/lib/authToken";
import type { User } from "@/types/api";

type StaffHeaderProps = {
  user: User;
};

export function StaffHeader({ user }: StaffHeaderProps) {
  const router = useRouter();

  const handleSignOut = () => {
    setAuthToken(null);
    router.push("/auth/login");
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div>
          <Link
            href="/dashboard"
            className="text-lg font-semibold text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            MedSchedule
          </Link>
          <p className="text-sm text-muted-foreground">
            {user.firstName} {user.lastName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-sm text-muted-foreground sm:block">
            {user.email}
          </p>
          <NotificationBell userId={user.userId} />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
