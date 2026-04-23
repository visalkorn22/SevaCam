"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_not_configured: "Google login is not configured on this server.",
  state_invalid: "Login session expired or invalid. Please try again.",
  google_failed: "Google authentication failed. Please try again.",
  account_inactive: "Your account is disabled. Please contact support.",
};

export default function GoogleCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const error = searchParams.get("error");
    if (error) {
      const message = ERROR_MESSAGES[error] ?? "An error occurred. Please try again.";
      router.replace(`/auth?mode=login&error=${encodeURIComponent(message)}`);
      return;
    }

    // Cookie is already set by the backend redirect. Resolve role and navigate.
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const role = data?.user?.role;
        if (role === "admin" || role === "superadmin") {
          router.replace("/admin/dashboard");
        } else if (role === "staff") {
          router.replace("/staff/dashboard");
        } else {
          router.replace("/#home-services");
        }
      })
      .catch(() => {
        router.replace("/auth?mode=login&error=Login+failed.+Please+try+again.");
      });
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Signing you in…</p>
    </div>
  );
}
