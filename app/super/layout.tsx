"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { setAuthToken } from "@/lib/authToken";

export default function SuperLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, role, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    if (role !== "superadmin") {
      router.replace("/auth/login");
    }
  }, [user, role, isLoading, router]);

  if (isLoading || !user || role !== "superadmin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  const handleSignOut = () => {
    setAuthToken(null);
    router.push("/auth/login");
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
          <Shield className="size-4 text-primary" />
          <span className="text-lg font-semibold text-foreground">Platform Admin</span>
        </div>
        <nav className="flex-1 p-4">
          <Link
            href="/super"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Building2 className="size-4 shrink-0" />
            Facilities
          </Link>
        </nav>
        <div className="border-t border-border p-4">
          <div className="mb-4 px-3 py-2">
            <p className="text-sm font-medium text-foreground">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="size-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-16 items-center border-b border-border bg-card px-6">
          <Shield className="size-4 text-primary mr-2 md:hidden" />
          <span className="font-semibold text-foreground md:hidden">Platform Admin</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
