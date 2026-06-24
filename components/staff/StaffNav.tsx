"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/dashboard", label: "Schedule" },
  { href: "/dashboard/requests", label: "Requests" },
  { href: "/dashboard/availability", label: "Availability" },
];

export function StaffNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/40 p-1"
      aria-label="Staff sections"
    >
      {navLinks.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
