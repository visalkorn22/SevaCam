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
import { Bell, LogOut, Search, Settings, UserCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  roleLabelMap,
  sidebarConfig,
  type Role,
  type SidebarItem,
} from "@/components/dashboard/sidebar-config";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

function isActivePath(pathname: string, href: string) {
  if (
    href === "/admin/dashboard" ||
    href === "/staff/dashboard" ||
    href === "/dashboard"
  ) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getPageTitle(pathname: string, title?: string) {
  if (title) {
    return title;
  }

  return (
    pathname
      .split("/")
      .pop()
      ?.replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Dashboard"
  );
}

export function DashboardLayout({
  children,
  title,
  subtitle,
}: DashboardLayoutProps) {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isAdminRoute = pathname.startsWith("/admin");
  const resolvedRole =
    profile?.role ||
    ((user as { role?: Role } | null)?.role as Role) ||
    "customer";
  const isAdminUser = resolvedRole === "admin" || resolvedRole === "superadmin";
  const useAdminShell = isAdminRoute || isAdminUser;
  const role: Role = useAdminShell
    ? resolvedRole === "superadmin"
      ? "superadmin"
      : "admin"
    : resolvedRole;

  const displayName =
    profile?.full_name || user?.email?.split("@")[0] || "User";
  const displayRole =
    role === "superadmin" ? "Super Admin" : roleLabelMap[role];
  const pageTitle = getPageTitle(pathname, title);
  const navigationSections = sidebarConfig[role] ?? sidebarConfig.customer;
  const flatNavItems = navigationSections.flatMap((section) => section.items);
  const settingsHref =
    role === "superadmin"
      ? "/admin/system-settings"
      : role === "admin"
        ? "/admin/settings"
        : "/settings";

  const handleLogout = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      await fetch(`${apiUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore logout errors and continue redirecting.
    } finally {
      router.push("/auth?mode=login");
      router.refresh();
    }
  };

  const renderNavLink = (item: SidebarItem, compact = false) => {
    const Icon = item.icon;
    const isActive = isActivePath(pathname, item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`group relative flex items-center transition-all duration-200 ${
          isActive
            ? "bg-(--seva-surface) text-(--seva-accent)"
            : "text-(--seva-text-soft) hover:bg-(--seva-surface) hover:text-(--seva-text)"
        } ${
          compact
            ? "gap-2 rounded-full px-2.5 py-2"
            : "gap-3 rounded-[0.95rem] px-3 py-2.5"
        }`}
      >
        <span
          className={`absolute left-0 rounded-full transition-colors ${
            isActive ? "bg-(--seva-accent)" : "bg-transparent"
          } ${compact ? "bottom-1 top-1 w-[1px]" : "inset-y-2 w-[2px]"}`}
        />
        <span
          className={`inline-flex shrink-0 items-center justify-center ${
            isActive
              ? "bg-(--accent-subtle) text-(--seva-accent)"
              : "bg-(--seva-surface) text-(--seva-text-soft)"
          } ${compact ? "h-7 w-7 rounded-full" : "h-9 w-9 rounded-[0.85rem]"}`}
        >
          <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </span>
        <span
          className={`min-w-0 font-medium ${
            compact
              ? "text-[0.66rem] uppercase tracking-[0.16em]"
              : "text-[0.86rem]"
          }`}
        >
          {item.title}
        </span>
      </Link>
    );
  };

  if (useAdminShell) {
    const currentItem =
      flatNavItems.find((item) => isActivePath(pathname, item.href)) ??
      flatNavItems[0];

    return (
      <div className="sevacam-home min-h-screen bg-(--seva-base) text-(--seva-text)">
        <div className="flex min-h-screen">
          <aside className="hidden fixed inset-y-0 left-0 z-30 w-[16.5rem] border-r border-(--border-subtle) bg-(--seva-base) lg:flex lg:flex-col">
            <div className="border-b border-(--border-subtle) px-5 py-6">
              <Link
                href="/admin/dashboard"
                className="sevacam-display text-[1.7rem] tracking-[-0.05em] text-(--seva-text)"
              >
                SevaCam
              </Link>
              <p className="mt-3 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-(--seva-accent)">
                {displayRole}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-5">
              <div className="space-y-1">
                {flatNavItems.map((item) => renderNavLink(item, true))}
              </div>
            </div>

            <div className="border-t border-(--border-subtle) px-4 py-4">
              <div className="flex items-center gap-3 rounded-[1rem] bg-(--seva-surface) px-3 py-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-(--seva-elevated) text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-(--seva-text)">
                  {displayName.slice(0, 2)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-(--seva-text)">
                    {displayName}
                  </p>
                  <p className="text-xs text-(--seva-text-soft)">
                    {displayRole}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 inline-flex w-full items-center justify-center rounded-[0.95rem] border border-(--border-muted) bg-(--seva-surface) px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-(--seva-text) transition-colors hover:border-(--border-interactive) hover:bg-(--seva-elevated)"
              >
                Logout
              </button>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col lg:pl-[16.5rem]">
            <header className="sticky top-0 z-20 border-b border-(--border-subtle) bg-(--seva-header-bg) backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 lg:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="rounded-full border border-(--border-muted) bg-(--seva-elevated) px-4 text-(--seva-text) hover:bg-(--seva-overlay)"
                        >
                          Sections
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-72 border-(--border-muted) bg-(--seva-dropdown-bg) text-(--seva-text)"
                      >
                        {navigationSections.map((section) => (
                          <div key={section.title}>
                            <DropdownMenuLabel className="text-[0.62rem] uppercase tracking-[0.18em] text-(--seva-text-muted)">
                              {section.title}
                            </DropdownMenuLabel>
                            {section.items.map((item) => (
                              <DropdownMenuItem key={item.href} asChild>
                                <Link href={item.href}>{item.title}</Link>
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator className="bg-(--border-subtle)" />
                          </div>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="min-w-0">
                      <p className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-(--seva-accent)">
                        {displayRole}
                      </p>
                      <p className="truncate text-sm text-(--seva-text-soft)">
                        {currentItem?.title}
                      </p>
                    </div>
                  </div>

                  <div className="hidden lg:block">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-(--seva-accent)">
                      {displayRole} workspace
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                  <div className="hidden max-w-[42rem] flex-1 lg:block">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-(--seva-text-muted)" />
                      <Input
                        type="text"
                        inputMode="search"
                        autoComplete="off"
                        placeholder="Search experiences, bookings, or guests..."
                        className="h-10 appearance-none rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) pl-12 pr-4 text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:border-(--border-focus) focus-visible:ring-1 focus-visible:ring-(--border-interactive) focus-visible:pl-12 focus-visible:pr-4"
                      />
                    </div>
                  </div>
                  <ThemeToggle compact />
                  <Link
                    href="/notifications"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-(--border-muted) bg-(--seva-surface) text-(--seva-text-muted) transition-colors hover:bg-(--seva-elevated) hover:text-(--seva-text)"
                  >
                    <Bell className="h-4 w-4" />
                  </Link>
                  {isMounted ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="rounded-full border border-(--border-muted) bg-(--seva-surface) px-3 text-sm font-medium text-(--seva-text) hover:bg-(--seva-elevated)"
                        >
                          <span className="mr-3 hidden text-(--seva-text-muted) lg:inline">
                            {displayRole}
                          </span>
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--seva-elevated) text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-(--seva-text)">
                            {displayName.slice(0, 2)}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        sideOffset={10}
                        className="w-60 rounded-[1.15rem] border border-(--border-subtle) bg-(--seva-dropdown-bg) p-2 text-(--seva-text) shadow-[0_28px_70px_rgba(0,0,0,0.2)] backdrop-blur-xl"
                      >
                        <div className="rounded-[0.95rem] border border-(--border-subtle) bg-(--seva-elevated) px-3 py-3">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-(--seva-overlay) text-[0.74rem] font-semibold uppercase tracking-[0.14em] text-(--seva-text)">
                              {displayName.slice(0, 2)}
                            </span>
                            <div className="min-w-0">
                              <DropdownMenuLabel className="truncate p-0 text-sm font-medium text-(--seva-text)">
                                {displayName}
                              </DropdownMenuLabel>
                              <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-(--seva-text-soft)">
                                {displayRole}
                              </p>
                            </div>
                          </div>
                        </div>
                        <DropdownMenuSeparator className="my-2 bg-(--border-subtle)" />
                        <DropdownMenuItem
                          asChild
                          className="rounded-[0.9rem] px-1.5 py-1 text-(--seva-text) focus:bg-(--accent-subtle) focus:text-(--seva-text) data-[highlighted]:bg-(--accent-subtle) data-[highlighted]:text-(--seva-text)"
                        >
                          <Link
                            href="/profile"
                            className="flex w-full items-center gap-3 rounded-[0.8rem] px-1.5 py-2"
                          >
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--seva-elevated) text-(--seva-text)">
                              <UserCircle2 className="h-4 w-4" />
                            </span>
                            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-(--seva-text)">
                              Profile
                            </span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          asChild
                          className="rounded-[0.9rem] px-1.5 py-1 text-(--seva-text) focus:bg-(--accent-subtle) focus:text-(--seva-text) data-[highlighted]:bg-(--accent-subtle) data-[highlighted]:text-(--seva-text)"
                        >
                          <Link
                            href={settingsHref}
                            className="flex w-full items-center gap-3 rounded-[0.8rem] px-1.5 py-2"
                          >
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--seva-elevated) text-(--seva-text)">
                              <Settings className="h-4 w-4" />
                            </span>
                            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-(--seva-text)">
                              Settings
                            </span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-2 bg-(--border-subtle)" />
                        <DropdownMenuItem
                          onClick={handleLogout}
                          className="rounded-[0.9rem] px-3 py-1 text-(--seva-text) focus:bg-(--state-warning-subtle) focus:text-(--seva-text) data-[highlighted]:bg-(--state-warning-subtle) data-[highlighted]:text-(--seva-text)"
                        >
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--seva-elevated) text-(--seva-text)">
                            <LogOut className="h-4 w-4" />
                          </span>
                          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-(--seva-text)">
                            Logout
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>
            </header>

            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {(title || subtitle) && (
                <div className="mb-5 border-b border-(--border-subtle) pb-4">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-(--seva-accent)">
                    {displayRole} dashboard
                  </p>
                  <div className="mt-3">
                    <div>
                      <h1 className="sevacam-display text-[clamp(1.8rem,2.8vw,2.8rem)] leading-[0.98] tracking-[-0.05em] text-(--seva-text)">
                        {pageTitle}
                      </h1>
                      {subtitle ? (
                        <p className="mt-2 max-w-2xl text-[0.84rem] leading-6 text-(--seva-text-soft)">
                          {subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
              {children}
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--bg-base)">
      <header className="sticky top-0 z-20 border-b border-(--border-muted) bg-(--bg-base)/95 backdrop-blur-sm supports-backdrop-filter:bg-(--bg-base)/80">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <Link href="/" className="text-base font-semibold tracking-tight">
              AICSER <span className="text-(--accent-primary)">Admin</span>
            </Link>

            <nav className="hidden items-center gap-6 md:flex">
              {flatNavItems.map((item) => {
                const isActive = isActivePath(pathname, item.href);
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
            <ThemeToggle />
            <div className="hidden w-64 md:block">
              <Input
                type="search"
                placeholder="Search..."
                className="h-10 rounded-full border-(--border-muted) bg-(--bg-surface) shadow-(--shadow-card)"
              />
            </div>
            {isMounted ? (
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
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={settingsHref}>Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full md:hidden">
                  Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {flatNavItems.map((item) => (
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
