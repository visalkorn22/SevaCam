"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing.");
      return;
    }

    const verify = async () => {
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        const res = await fetch(`${apiUrl}/api/auth/verify-email/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          let detail = "Unable to verify email.";
          try {
            const data = await res.json();
            detail = data?.detail || data?.message || detail;
          } catch {}
          setStatus("error");
          setMessage(detail);
          return;
        }

        setStatus("success");
        setMessage("Your email has been verified.");
      } catch {
        setStatus("error");
        setMessage("Unable to verify email.");
      }
    };

    void verify();
  }, [token]);

  const icon =
    status === "loading" ? (
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    ) : status === "success" ? (
      <CheckCircle2 className="h-8 w-8 text-green-600" />
    ) : (
      <XCircle className="h-8 w-8 text-red-600" />
    );

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              {icon}
            </div>
            <CardTitle className="text-2xl">Email Verification</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full" disabled={status === "loading"}>
              <Link href="/auth/login">Back to Login</Link>
            </Button>
            {status === "error" && (
              <p className="text-center text-xs text-muted-foreground">
                If the link expired, request a new verification email from the
                login page.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
