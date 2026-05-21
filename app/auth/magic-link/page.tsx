"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "error";

function MagicLinkContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Login token is missing.");
      return;
    }

    const confirm = async () => {
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        const res = await fetch(`${apiUrl}/api/auth/magic-link/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          let detail = "Unable to complete sign in.";
          try {
            const data = await res.json();
            detail = data?.detail || data?.message || detail;
          } catch {}
          setStatus("error");
          setMessage(detail);
          return;
        }

        const data = await res.json();
        const role = data?.user?.role;
        setStatus("success");
        setMessage("Signed in successfully.");

        if (role === "admin" || role === "superadmin") {
          router.replace("/admin/dashboard");
        } else if (role === "staff") {
          router.replace("/staff/dashboard");
        } else {
          router.replace("/#services");
        }
      } catch {
        setStatus("error");
        setMessage("Unable to complete sign in.");
      }
    };

    void confirm();
  }, [router, token]);

  const icon =
    status === "loading" ? (
      <Loader2 className="h-8 w-8 animate-spin text-(--accent-primary)" />
    ) : status === "success" ? (
      <CheckCircle2 className="h-8 w-8 text-(--state-success)" />
    ) : (
      <XCircle className="h-8 w-8 text-(--state-error)" />
    );

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-(--bg-base) p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-(--bg-elevated)">
              {icon}
            </div>
            <CardTitle className="text-2xl">Email Sign-In</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full" disabled={status === "loading"}>
              <Link href="/auth/login">Back to Login</Link>
            </Button>
            {status === "error" && (
              <p className="text-center text-xs text-(--text-secondary)">
                If the link expired, request a new sign-in link from the login
                page.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <MagicLinkContent />
    </Suspense>
  );
}
