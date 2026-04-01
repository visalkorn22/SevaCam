"use client";

import type React from "react";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  roleLabelMap,
  sidebarConfig,
  type Role,
} from "@/components/dashboard/sidebar-config";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const role = profile?.role || ((user as any)?.role as Role) || "customer";
  const displayName =
    profile?.full_name || user?.email?.split("@")[0] || "User";
  const displayRole =
    role === "superadmin" ? "Super Admin" : roleLabelMap[role];

  const pageTitle =
    title ||
    pathname
      .split("/")
      .pop()
      ?.replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase()) ||
    "Dashboard";

  const handleLogout = async () => {
    try {
      // Logout via backend (clears session + cookie)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      await fetch(`${apiUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include", // send auth_token cookie
      });
    } catch {
      // ignore errors; still redirect
    } finally {
      router.push("/auth/login");
      router.refresh();
    }
  };

  const navigationItems = sidebarConfig[role] ?? sidebarConfig.customer;
  const flatNavItems = navigationItems.flatMap((section) => section.items);
  const topNavItems =
    role === "admin" || role === "superadmin"
      ? [
          { title: "Dashboard", href: "/admin/dashboard" },
          { title: "Services", href: "/admin/services" },
          { title: "Bookings", href: "/admin/bookings" },
          { title: "Clients", href: "/admin/staff" },
          { title: "Settings", href: "/admin/settings" },
        ]
      : flatNavItems.map((item) => ({ title: item.title, href: item.href }));

  return (
    <div className="min-h-screen bg-(--bg-base)">
      <header className="sticky top-0 z-20 border-b border-(--border-muted) bg-(--bg-base)/95 backdrop-blur-sm supports-backdrop-filter:bg-(--bg-base)/80">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <Link href="/" className="text-base font-semibold tracking-tight">
              AICSER <span className="text-(--accent-primary)">Admin</span>
            </Link>

            <nav className="hidden items-center gap-6 md:flex">
              {topNavItems.map((item) => {
                const isActive =
                  item.href === "/admin/dashboard"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium motion-standard ${
                      isActive
                        ? "text-(--accent-primary)"
                        : "text-(--text-secondary) hover:text-(--text-primary)"
                    }`}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden w-64 md:block">
              <Input
                type="search"
                placeholder="Search..."
                className="h-10 rounded-full border-(--border-muted) bg-(--bg-surface) shadow-(--shadow-card)"
              />
            </div>
            {isMounted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="rounded-full px-4 text-sm font-medium"
                  >
                    {displayName}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{displayRole}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full md:hidden">
                  Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {topNavItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.title}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        {(title || subtitle) && (
          <div className="mb-6">
            {subtitle ? (
              <p className="text-sm text-(--text-secondary)">{subtitle}</p>
            ) : null}
            <h1 className="text-2xl font-semibold tracking-tight">
              {pageTitle}
            </h1>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
