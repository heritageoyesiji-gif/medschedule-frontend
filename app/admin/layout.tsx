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
  Settings,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import {
  clearStoredFacilityId,
  getStoredFacilityId,
  useMyFacilities,
} from "@/hooks/useActiveFacility";
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
  const { data: myFacilities, isLoading: isFacilitiesLoading } = useMyFacilities();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isOnboardingRoute = pathname === "/admin/onboarding";
  const isSelectLocationRoute = pathname === "/admin/select-location";

  const activeFacilityId = getStoredFacilityId() ?? user?.facilityId ?? null;
  const activeFacility = myFacilities?.find((f) => f.facilityId === activeFacilityId);
  const hasMultipleFacilities = (myFacilities?.length ?? 0) > 1;

  useEffect(() => {
    if (isLoading || isFacilitiesLoading) return;
    if (!user) { router.replace("/auth/login"); return; }
    if (role !== "admin") { router.replace("/dashboard"); return; }

    const hasFacilityInDb = Boolean(user.facilityId);
    if (!hasFacilityInDb && !isOnboardingRoute) { router.replace("/admin/onboarding"); return; }
    if (hasFacilityInDb && isOnboardingRoute) { router.replace("/admin"); return; }

    // Multi-facility: force picker if no active selection stored
    if (hasFacilityInDb && hasMultipleFacilities && !getStoredFacilityId() && !isSelectLocationRoute) {
      router.replace("/admin/select-location");
      return;
    }
    if (hasFacilityInDb && isSelectLocationRoute && !hasMultipleFacilities) {
      router.replace("/admin");
    }
  }, [user, role, isLoading, isFacilitiesLoading, isOnboardingRoute, isSelectLocationRoute, hasMultipleFacilities, router]);

  const hasFacility = Boolean(user?.facilityId);

  if (
    isLoading ||
    isFacilitiesLoading ||
    !user ||
    role !== "admin" ||
    (!hasFacility && !isOnboardingRoute) ||
    (hasFacility && isOnboardingRoute)
  ) {
    return <AdminLayoutSkeleton />;
  }

  const handleSignOut = () => {
    clearStoredFacilityId();
    setAuthToken(null);
    router.push("/auth/login");
  };

  const handleSwitchLocation = () => {
    clearStoredFacilityId();
    router.push("/admin/select-location");
  };

  const navLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/schedule", label: "Schedule Builder", icon: Calendar },
    { href: "/admin/staff", label: "Staff Management", icon: Users },
    { href: "/admin/requests", label: "Swap & Time Off", icon: ClipboardList },
    { href: "/admin/requirements", label: "Staffing Requirements", icon: SlidersHorizontal },
    { href: "/admin/settings", label: "Settings", icon: Settings },
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
        <div className="border-t border-border p-4 space-y-1">
          {activeFacility && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-accent/5 border border-accent/20">
              <div className="flex items-center gap-2 mb-0.5">
                <Building2 className="size-3.5 text-accent shrink-0" />
                <p className="text-xs font-semibold text-accent truncate">{activeFacility.name}</p>
              </div>
              {hasMultipleFacilities && (
                <button
                  onClick={handleSwitchLocation}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Switch location
                </button>
              )}
            </div>
          )}
          <div className="px-3 py-2">
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
            {activeFacility && (
              <div className="hidden items-center gap-1.5 text-sm text-muted-foreground md:flex">
                <Building2 className="size-3.5 text-accent" />
                <span className="font-medium text-foreground">{activeFacility.name}</span>
                {hasMultipleFacilities && (
                  <button
                    onClick={handleSwitchLocation}
                    className="ml-1 text-xs text-accent hover:underline"
                  >
                    Switch
                  </button>
                )}
              </div>
            )}
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
            <div className="border-t border-border pt-4 space-y-1">
              {activeFacility && (
                <div className="mb-2 px-3 py-2 rounded-lg bg-accent/5 border border-accent/20">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-3.5 text-accent shrink-0" />
                    <p className="text-xs font-semibold text-accent truncate">{activeFacility.name}</p>
                  </div>
                  {hasMultipleFacilities && (
                    <button
                      onClick={() => { setIsMobileMenuOpen(false); handleSwitchLocation(); }}
                      className="mt-0.5 text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      Switch location
                    </button>
                  )}
                </div>
              )}
              <div className="px-3">
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
