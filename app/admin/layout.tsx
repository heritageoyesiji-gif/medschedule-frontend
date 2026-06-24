"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { setAuthToken } from "@/lib/authToken";

function AdminLayoutSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-border px-6">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {[120, 140, 140, 120, 180].map((w, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <div className="size-4 animate-pulse rounded bg-muted" />
              <div className="h-4 animate-pulse rounded bg-muted" style={{ width: w }} />
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-4">
          <div className="space-y-1.5 px-3 py-2">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
          <div className="size-9 animate-pulse rounded-lg bg-muted md:hidden" />
          <div className="ml-auto size-9 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="space-y-8 p-6 md:p-8">
          <div className="h-8 w-56 animate-pulse rounded bg-muted" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isOnboardingRoute = pathname === "/admin/onboarding";
  const hasFacility = Boolean(user?.facilityId);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    if (role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    if (!user.facilityId && !isOnboardingRoute) {
      router.replace("/admin/onboarding");
      return;
    }
    if (user.facilityId && isOnboardingRoute) {
      router.replace("/admin");
    }
  }, [user, role, isLoading, isOnboardingRoute, router]);

  if (
    isLoading ||
    !user ||
    role !== "admin" ||
    (!hasFacility && !isOnboardingRoute) ||
    (hasFacility && isOnboardingRoute)
  ) {
    return <AdminLayoutSkeleton />;
  }

  const handleSignOut = () => {
    setAuthToken(null);
    router.push("/auth/login");
  };

  const navLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/schedule", label: "Schedule Builder", icon: Calendar },
    { href: "/admin/staff", label: "Staff Management", icon: Users },
    { href: "/admin/requests", label: "Swap & Time Off", icon: ClipboardList },
    { href: "/admin/requirements", label: "Staffing Requirements", icon: SlidersHorizontal },
  ];

  if (!hasFacility && isOnboardingRoute) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border bg-card">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
            <Link
              href="/admin/onboarding"
              className="flex items-center gap-2 text-lg font-semibold text-foreground"
            >
              <Building2 className="size-5 text-accent" />
              MedSchedule Admin
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
            >
              <LogOut className="size-4 shrink-0" />
              Sign Out
            </button>
          </div>
        </header>
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar for Desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center px-6 border-b border-border">
          <Link href="/admin" className="text-lg font-semibold text-foreground">
            MedSchedule Admin
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="mb-4 px-3 py-2">
            <p className="text-sm font-medium text-foreground truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          >
            <LogOut className="size-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header for Mobile & Navigation */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-lg p-2 hover:bg-muted md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open navigation menu"
            >
              <Menu className="size-5" />
            </button>
            <span className="text-lg font-semibold text-foreground md:hidden">
              MedSchedule Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-sm text-muted-foreground md:block">
              Facility ID:{" "}
              <span className="font-mono font-medium">{user.facilityId}</span>
            </div>
            <NotificationBell userId={user.userId} />
          </div>
        </header>

        {/* Content children */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-background/80 backdrop-blur-sm">
          <div className="w-64 border-r border-border bg-card p-4 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <span className="font-semibold text-foreground">Navigation</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close navigation menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="mt-4 flex-1 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border pt-4">
              <div className="mb-4 px-3">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="size-4 shrink-0" />
                Sign Out
              </button>
            </div>
          </div>
          <div
            className="flex-1"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
