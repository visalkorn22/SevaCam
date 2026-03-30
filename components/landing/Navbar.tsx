"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function Navbar() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const role = user?.role;
  const isStaff = role === "staff";
  const isAdmin = role === "admin" || role === "superadmin";
  const isCustomer = !!user && !isStaff && !isAdmin;
  const showStaffAdminButton = isStaff || isAdmin || !user;
  const showMyBookingsLink = !isStaff && !isAdmin;
  const staffAdminLabel = isStaff
    ? "Staff Dashboard"
    : isAdmin
      ? "Admin Dashboard"
      : "Staff/Admin Sign In";
  const staffAdminHref = isStaff
    ? "/staff/dashboard"
    : isAdmin
      ? "/admin/dashboard"
      : "/auth?mode=login";

  const handleLogout = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      await refreshProfile();
      router.refresh();
    }
  };

  const handleScroll = (
    event: MouseEvent<HTMLAnchorElement>,
    targetId: string,
  ) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    target?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
            <Image
              src="/logo.png"
              alt="AICSER"
              width={22}
              height={22}
              className="h-5.5 w-5.5"
              priority
            />
          </div>
          <span className="text-[13px] font-bold uppercase tracking-[0.15em]">
            AICSER
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-8 md:flex">
          {[
            { label: "Services", targetId: "services" },
            { label: "About", targetId: "about" },
            { label: "Contact", targetId: "contact" },
          ].map(({ label, targetId }) => (
            <Link
              key={label}
              href={`#${targetId}`}
              onClick={(event) => handleScroll(event, targetId)}
              className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {showMyBookingsLink && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-9 px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              <Link href="/bookings">My Bookings</Link>
            </Button>
          )}
          {isCustomer && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-9 px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              Logout
            </Button>
          )}
          {showStaffAdminButton && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden h-9 rounded-full border-border/60 px-4 text-[11px] font-semibold uppercase tracking-[0.2em] sm:flex"
            >
              <Link href={staffAdminHref}>{staffAdminLabel}</Link>
            </Button>
          )}
          <Button
            asChild
            size="sm"
            className="h-9 px-5 text-[11px] font-bold uppercase tracking-[0.2em]"
          >
            <Link
              href="#services"
              onClick={(event) => handleScroll(event, "services")}
            >
              Book Now
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
