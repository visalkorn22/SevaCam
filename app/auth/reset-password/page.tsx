"use client";

import type React from "react";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const res = await fetch(`${apiUrl}/api/auth/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          data?.detail || data?.message || "Failed to send reset email";
        throw new Error(message);
      }

      setResetToken(data?.reset_token ?? null);
      setEmailSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-(--bg-base) p-6 md:p-10">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-(--state-success-subtle)">
                <CheckCircle2 className="h-8 w-8 text-(--state-success)" />
              </div>
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
              <CardDescription>Password reset link sent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-(--text-secondary)">
                We&apos;ve sent a password reset link to{" "}
                <strong>{email}</strong>. Please check your inbox and follow the
                instructions to reset your password.
              </p>
              {resetToken && (
                <div className="rounded-(--radius-md) bg-(--bg-inset) p-3 text-sm">
                  <div className="mb-1 font-medium">Dev reset token</div>
                  <div className="break-all">{resetToken}</div>
                  <div className="mt-2 text-xs text-(--text-secondary)">
                    Open{" "}
                    <Link
                      href={`/auth/update-password?token=${resetToken}`}
                      className="underline underline-offset-4"
                    >
                      update password
                    </Link>
                    .
                  </div>
                </div>
              )}
              <div className="pt-4">
                <Button asChild className="w-full">
                  <Link href="/auth/login">Back to Login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-(--bg-base) p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Reset Password
            </h1>
            <p className="text-(--text-secondary)">
              Enter your email to receive a reset link
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Password Reset</CardTitle>
              <CardDescription>
                We&apos;ll send you instructions to reset your password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  {error && (
                    <div className="rounded-(--radius-md) bg-(--state-error-subtle) p-3 text-sm text-(--state-error)">
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </div>

                <div className="mt-6 text-center text-sm">
                  Remember your password?{" "}
                  <Link
                    href="/auth/login"
                    className="font-medium text-(--accent-primary) underline-offset-4 hover:underline"
                  >
                    Sign in
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
