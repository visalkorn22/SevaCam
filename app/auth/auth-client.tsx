"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";
import {
  DEMO_AUTO_SUBMIT,
  DEMO_ENABLED,
  demoAccounts,
} from "@/lib/demo-accounts";

type Mode = "login" | "signup";

type AuthClientProps = {
  initialMode: Mode;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          prompt: (notification?: unknown) => void;
        };
      };
    };
  }
}

const GoogleLogo = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 48 48" className={className}>
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-3-.76-4.59s.27-3.14.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.92.94 7.63 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.14 15.9-5.81l-7.73-6c-2.15 1.45-4.9 2.3-8.17 2.3-6.26 0-11.57-3.58-13.47-8.64l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

export default function AuthClient({ initialMode }: AuthClientProps) {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const [mode, setMode] = useState<Mode>(initialMode);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [magicLinkMessage, setMagicLinkMessage] = useState<string | null>(null);
  const [magicLinkStatus, setMagicLinkStatus] = useState<
    "success" | "error" | null
  >(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleInitialized = useRef(false);
  const loginEmailRef = useRef<HTMLInputElement | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);

  const redirectAfterAuth = useCallback(async () => {
    const meRes = await fetch("/api/auth/me", { cache: "no-store" });
    const me = await meRes.json();

    const userRole = me?.user?.role;
    if (userRole === "admin" || userRole === "superadmin") {
      router.push("/admin/dashboard");
    } else if (userRole === "staff") {
      router.push("/staff/dashboard");
    } else {
      router.push("/#services");
    }
  }, [router]);

  useEffect(() => {
    if (modeParam === "login" || modeParam === "signup") {
      setMode(modeParam);
    }
  }, [modeParam]);

  const handleModeChange = (nextMode: Mode) => {
    if (nextMode === mode) {
      return;
    }

    setMode(nextMode);
    setLoginError(null);
    setSignupError(null);
    setMagicLinkMessage(null);
    setMagicLinkStatus(null);

    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", nextMode);
    const query = params.toString();
    router.replace(query ? `/auth?${query}` : "/auth", { scroll: false });
  };

  const submitLogin = async (email: string, password: string) => {
    setLoginLoading(true);
    setLoginError(null);
    setResendMessage(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        let message = "Unable to sign in. Please try again.";
        if (res.status === 401) {
          message = "Invalid email or password";
        } else if (res.status === 403) {
          message = "Your account cannot sign in yet.";
        }
        try {
          const data = await res.json();
          const detail = data?.detail || data?.message;
          if (typeof detail === "string" && detail.trim()) {
            if (detail === "Email not verified") {
              message = "Email not verified";
            } else if (res.status === 403 && detail === "Account is disabled") {
              message = "Your account is disabled. Please contact support.";
            } else {
              message = detail;
            }
          }
        } catch {}
        throw new Error(message);
      }

      await refreshProfile();
      await redirectAfterAuth();
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        setLoginError("Unable to connect to the server. Please try again.");
      } else {
        setLoginError(err instanceof Error ? err.message : "An error occurred");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setGoogleLoading(true);
      setLoginError(null);

      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ credential }),
        });

        if (!res.ok) {
          let message = "Google login failed";
          try {
            const data = await res.json();
            message = data?.detail || data?.message || message;
          } catch {}
          throw new Error(message);
        }

        await refreshProfile();
        await redirectAfterAuth();
      } catch (err: unknown) {
        setLoginError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setGoogleLoading(false);
      }
    },
    [redirectAfterAuth, refreshProfile],
  );

  const handleGoogleLogin = () => {
    if (!googleClientId) {
      setLoginError("Google login is not configured.");
      return;
    }
    if (!window.google?.accounts?.id) {
      setLoginError("Google login is unavailable.");
      return;
    }
    if (!googleInitialized.current) {
      setLoginError("Google login is still loading.");
      return;
    }
    window.google.accounts.id.prompt();
  };

  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id || googleInitialized.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (response?.credential) {
            void handleGoogleCredential(response.credential);
          }
        },
      });
      googleInitialized.current = true;
      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => initializeGoogle();
    script.onerror = () => setLoginError("Google login is unavailable.");
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [googleClientId, handleGoogleCredential]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitLogin(loginEmail, loginPassword);
  };

  const handleEmailLogin = () => {
    if (!loginEmailRef.current) {
      return;
    }
    loginEmailRef.current.focus();
    loginEmailRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const requestMagicLink = async () => {
    if (!loginEmail) {
      handleEmailLogin();
      setMagicLinkStatus("error");
      setMagicLinkMessage("Enter your email address to receive a login link.");
      return;
    }

    setMagicLinkLoading(true);
    setMagicLinkMessage(null);
    setMagicLinkStatus(null);
    setLoginError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/auth/magic-link/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail }),
      });

      if (!res.ok) {
        let message = "Unable to send login link.";
        try {
          const data = await res.json();
          message = data?.detail || data?.message || message;
        } catch {}
        throw new Error(message);
      }

      setMagicLinkStatus("success");
      setMagicLinkMessage("Check your email for a sign-in link.");
    } catch (err: unknown) {
      setMagicLinkStatus("error");
      setMagicLinkMessage(
        err instanceof Error ? err.message : "An error occurred",
      );
    } finally {
      setMagicLinkLoading(false);
    }
  };

  const handleDemoLogin = (email: string, password: string) => {
    setLoginEmail(email);
    setLoginPassword(password);
    setLoginError(null);
    setResendMessage(null);
    setSignupError(null);

    if (mode !== "login") {
      handleModeChange("login");
    }

    if (DEMO_AUTO_SUBMIT) {
      setTimeout(() => {
        if (!loginLoading) {
          void submitLogin(email, password);
        }
      }, 0);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError(null);

    if (signupPassword !== confirmPassword) {
      setSignupError("Passwords do not match");
      setSignupLoading(false);
      return;
    }

    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters");
      setSignupLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const res = await fetch(`${apiUrl}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          full_name: fullName,
          phone,
        }),
      });

      if (!res.ok) {
        let message = "Unable to create your account. Please try again.";
        if (res.status === 409) {
          message =
            "An account with this email already exists. Try logging in instead.";
        }
        try {
          const data = await res.json();
          const detail = data?.detail || data?.message;
          if (
            typeof detail === "string" &&
            detail.trim() &&
            !(res.status === 409 && detail === "Email already exists")
          ) {
            message = detail;
          }
        } catch {}
        throw new Error(message);
      }

      router.push("/auth/signup-success");
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        setSignupError("Unable to connect to the server. Please try again.");
      } else {
        setSignupError(
          err instanceof Error ? err.message : "An error occurred",
        );
      }
    } finally {
      setSignupLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!loginEmail) {
      setResendMessage("Enter your email address first.");
      return;
    }

    setResendLoading(true);
    setResendMessage(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/auth/verify-email/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail }),
      });

      if (!res.ok) {
        let message = "Unable to send verification email.";
        try {
          const data = await res.json();
          message = data?.detail || data?.message || message;
        } catch {}
        throw new Error(message);
      }

      setResendMessage(
        "If the account exists, a verification email has been sent.",
      );
    } catch (err: unknown) {
      setResendMessage(
        err instanceof Error ? err.message : "An error occurred",
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-(--bg-base) text-(--text-primary)"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(122,213,221,0.08),transparent_70%)]" />
      <div className="pointer-events-none absolute left-1/2 -top-40 h-72 w-130 -translate-x-1/2 rounded-full bg-(--accent-primary)/10 blur-[140px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-center">
            <Button
              asChild
              variant="ghost"
              className="rounded-full text-[0.6rem] font-semibold uppercase tracking-[0.35em] hover:-translate-y-0.5"
            >
              <Link href="/">
                <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                Back to landing
              </Link>
            </Button>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-(--accent-primary)/30 bg-(--accent-subtle) text-(--accent-primary) shadow-[0_12px_24px_rgba(122,213,221,0.15)]">
              <span className="text-2xl font-semibold">A</span>
            </div>
            <p className="text-2xl font-semibold tracking-tight">
              Aicser Booking <span className="text-(--accent-primary)">System</span>
            </p>
            <p className="mt-2 text-[0.65rem] uppercase tracking-[0.45em] text-(--text-secondary)">
              Authorized access only
            </p>
          </div>

          <Card className="shadow-(--shadow-lg)">
            <CardContent className="px-6 py-8 sm:px-8">
              <div className="relative mb-6 flex rounded-full bg-(--bg-inset) p-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-(--text-secondary)">
                <span
                  className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-(--accent-primary) shadow-[0_0_16px_rgba(122,213,221,0.25)] transition-transform duration-500 ${
                    mode === "signup" ? "translate-x-full" : "translate-x-0"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => handleModeChange("login")}
                  className={`relative z-10 flex-1 rounded-full px-3 py-2 text-center transition-colors duration-150 ${
                    mode === "login"
                      ? "text-(--text-on-accent)"
                      : "text-(--text-secondary) hover:text-(--text-primary)"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("signup")}
                  className={`relative z-10 flex-1 rounded-full px-3 py-2 text-center transition-colors duration-150 ${
                    mode === "signup"
                      ? "text-(--text-on-accent)"
                      : "text-(--text-secondary) hover:text-(--text-primary)"
                  }`}
                >
                  Register
                </button>
              </div>

              <div>
                {mode === "login" ? (
                  <form onSubmit={handleLogin}>
                    <div className="flex flex-col gap-5">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full rounded-(--radius-md) text-[0.7rem] font-semibold uppercase tracking-[0.2em]"
                        onClick={requestMagicLink}
                        disabled={loginLoading || magicLinkLoading}
                      >
                        <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-(--border-muted) bg-(--bg-elevated) text-(--text-primary)">
                          <Mail className="h-3.5 w-3.5" />
                        </span>
                        {magicLinkLoading
                          ? "Sending link..."
                          : "Continue with email"}
                      </Button>
                      {magicLinkMessage && (
                        <div
                          className={`rounded-(--radius-md) px-4 py-3 text-xs ${
                            magicLinkStatus === "error"
                              ? "bg-(--state-error-subtle) text-(--state-error)"
                              : "bg-(--bg-elevated) text-(--text-secondary)"
                          }`}
                        >
                          {magicLinkMessage}
                        </div>
                      )}

                      <div className="grid gap-2">
                        <Label
                          htmlFor="login-email"
                          className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-(--text-secondary)"
                        >
                          Institutional email
                        </Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-disabled)" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="name@organization.com"
                            required
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            disabled={loginLoading}
                            ref={loginEmailRef}
                            className="h-11 border border-(--border-subtle) rounded-(--radius-md) bg-(--bg-elevated) pl-10 pr-3 focus-visible:border-(--border-focus) focus-visible:shadow-[inset_0_0_0_1px_var(--border-focus)] focus-visible:rounded-(--radius-md) focus-visible:bg-(--bg-elevated) focus-visible:pl-10 focus-visible:pr-3"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="login-password"
                            className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-(--text-secondary)"
                          >
                            Master password
                          </Label>
                          <Link
                            href="/auth/reset-password"
                            className="text-xs font-semibold uppercase tracking-[0.2em] text-(--accent-primary) transition hover:opacity-80"
                          >
                            Recovery
                          </Link>
                        </div>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-disabled)" />
                          <Input
                            id="login-password"
                            type="password"
                            required
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            disabled={loginLoading}
                            className="h-11 border border-(--border-subtle) rounded-(--radius-md) bg-(--bg-elevated) pl-10 pr-3 focus-visible:border-(--border-focus) focus-visible:shadow-[inset_0_0_0_1px_var(--border-focus)] focus-visible:rounded-(--radius-md) focus-visible:bg-(--bg-elevated) focus-visible:pl-10 focus-visible:pr-3"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-(--text-secondary)">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-(--border-subtle) bg-(--bg-elevated) accent-(--accent-primary)"
                        />
                        Remember credentials
                      </label>

                      {loginError && (
                        <div className="rounded-(--radius-md) bg-(--state-error-subtle) px-4 py-3 text-sm text-(--state-error)">
                          {loginError}
                          {loginError === "Email not verified" && (
                            <div className="mt-3 space-y-2 text-xs text-(--text-secondary)">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 w-full rounded-(--radius-md) text-[0.6rem] font-semibold uppercase tracking-[0.25em]"
                                onClick={handleResendVerification}
                                disabled={resendLoading}
                              >
                                {resendLoading
                                  ? "Sending..."
                                  : "Resend verification email"}
                              </Button>
                              {resendMessage && (
                                <p className="text-center text-xs text-(--text-secondary)">
                                  {resendMessage}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="h-11 w-full rounded-(--radius-md) hover:-translate-y-0.5"
                        disabled={loginLoading}
                      >
                        {loginLoading ? "Authorizing..." : "Authorize session"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>

                      {googleClientId && (
                        <>
                          <div className="flex items-center gap-3 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-(--text-secondary)">
                            <span className="h-px flex-1 bg-(--border-muted)" />
                            or
                            <span className="h-px flex-1 bg-(--border-muted)" />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 w-full rounded-(--radius-md) text-[0.7rem] font-semibold uppercase tracking-[0.2em]"
                            onClick={handleGoogleLogin}
                            disabled={
                              !googleReady || googleLoading || loginLoading
                            }
                          >
                            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-(--border-muted) bg-white">
                              <GoogleLogo className="h-4 w-4" />
                            </span>
                            {googleLoading
                              ? "Connecting..."
                              : "Continue with Google"}
                          </Button>
                        </>
                      )}
                    </div>

                    {DEMO_ENABLED && (
                      <div className="mt-6 rounded-(--radius-md) border border-dashed border-(--border-muted) bg-(--bg-inset) px-4 py-4">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-(--text-secondary)">
                          Demo accounts (testing only)
                        </p>
                        <p className="mt-2 text-xs text-(--text-secondary)">
                          Tap to auto-fill demo credentials.
                        </p>
                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          {demoAccounts.map((account) => (
                            <Button
                              key={account.role}
                              type="button"
                              variant="outline"
                              className="h-10 rounded-full text-[0.65rem] font-semibold uppercase tracking-[0.2em]"
                              onClick={() =>
                                handleDemoLogin(account.email, account.password)
                              }
                            >
                              {account.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-6 text-center text-xs uppercase tracking-[0.3em] text-(--text-secondary)">
                      New here?{" "}
                      <button
                        type="button"
                        onClick={() => handleModeChange("signup")}
                        className="text-(--accent-primary) transition hover:opacity-80"
                      >
                        Create access
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSignup}>
                    <div className="flex flex-col gap-5">
                      <div className="grid gap-2">
                        <Label
                          htmlFor="fullName"
                          className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-(--text-secondary)"
                        >
                          Full name
                        </Label>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-disabled)" />
                          <Input
                            id="fullName"
                            type="text"
                            placeholder="John Doe"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            disabled={signupLoading}
                            className="h-11 border border-(--border-subtle) rounded-(--radius-md) bg-(--bg-elevated) pl-10 pr-3 focus-visible:border-(--border-focus) focus-visible:shadow-[inset_0_0_0_1px_var(--border-focus)] focus-visible:rounded-(--radius-md) focus-visible:bg-(--bg-elevated) focus-visible:pl-10 focus-visible:pr-3"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label
                          htmlFor="signup-email"
                          className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-(--text-secondary)"
                        >
                          Email address
                        </Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-disabled)" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="name@organization.com"
                            required
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                            disabled={signupLoading}
                            className="h-11 border border-(--border-subtle) rounded-(--radius-md) bg-(--bg-elevated) pl-10 pr-3 focus-visible:border-(--border-focus) focus-visible:shadow-[inset_0_0_0_1px_var(--border-focus)] focus-visible:rounded-(--radius-md) focus-visible:bg-(--bg-elevated) focus-visible:pl-10 focus-visible:pr-3"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label
                          htmlFor="phone"
                          className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-(--text-secondary)"
                        >
                          Phone number
                        </Label>
                        <div className="relative">
                          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-disabled)" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+1234567890"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            disabled={signupLoading}
                            className="h-11 border border-(--border-subtle) rounded-(--radius-md) bg-(--bg-elevated) pl-10 pr-3 focus-visible:border-(--border-focus) focus-visible:shadow-[inset_0_0_0_1px_var(--border-focus)] focus-visible:rounded-(--radius-md) focus-visible:bg-(--bg-elevated) focus-visible:pl-10 focus-visible:pr-3"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label
                          htmlFor="signup-password"
                          className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-(--text-secondary)"
                        >
                          Create password
                        </Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-disabled)" />
                          <Input
                            id="signup-password"
                            type="password"
                            required
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            disabled={signupLoading}
                            className="h-11 border border-(--border-subtle) rounded-(--radius-md) bg-(--bg-elevated) pl-10 pr-3 focus-visible:border-(--border-focus) focus-visible:shadow-[inset_0_0_0_1px_var(--border-focus)] focus-visible:rounded-(--radius-md) focus-visible:bg-(--bg-elevated) focus-visible:pl-10 focus-visible:pr-3"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label
                          htmlFor="confirmPassword"
                          className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-(--text-secondary)"
                        >
                          Confirm password
                        </Label>
                        <div className="relative">
                          <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-disabled)" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={signupLoading}
                            className="h-11 border border-(--border-subtle) rounded-(--radius-md) bg-(--bg-elevated) pl-10 pr-3 focus-visible:border-(--border-focus) focus-visible:shadow-[inset_0_0_0_1px_var(--border-focus)] focus-visible:rounded-(--radius-md) focus-visible:bg-(--bg-elevated) focus-visible:pl-10 focus-visible:pr-3"
                          />
                        </div>
                      </div>

                      {signupError && (
                        <div className="rounded-(--radius-md) bg-(--state-error-subtle) px-4 py-3 text-sm text-(--state-error)">
                          {signupError}
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="h-11 w-full rounded-(--radius-md) hover:-translate-y-0.5"
                        disabled={signupLoading}
                      >
                        {signupLoading
                          ? "Creating access..."
                          : "Authorize account"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>

                      {googleClientId && (
                        <>
                          <div className="flex items-center gap-3 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-(--text-secondary)">
                            <span className="h-px flex-1 bg-(--border-muted)" />
                            or
                            <span className="h-px flex-1 bg-(--border-muted)" />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 w-full rounded-(--radius-md) text-[0.7rem] font-semibold uppercase tracking-[0.2em]"
                            onClick={handleGoogleLogin}
                            disabled={
                              !googleReady || googleLoading || signupLoading
                            }
                          >
                            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-(--border-muted) bg-white">
                              <GoogleLogo className="h-4 w-4" />
                            </span>
                            {googleLoading
                              ? "Connecting..."
                              : "Continue with Google"}
                          </Button>
                        </>
                      )}
                    </div>

                    {DEMO_ENABLED && (
                      <div className="mt-6 rounded-(--radius-md) border border-dashed border-(--border-muted) bg-(--bg-inset) px-4 py-4">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-(--text-secondary)">
                          Demo accounts (testing only)
                        </p>
                        <p className="mt-2 text-xs text-(--text-secondary)">
                          Use a configured demo account to preview the
                          experience.
                        </p>
                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          {demoAccounts.map((account) => (
                            <Button
                              key={account.role}
                              type="button"
                              variant="outline"
                              className="h-10 rounded-full text-[0.65rem] font-semibold uppercase tracking-[0.2em]"
                              onClick={() =>
                                handleDemoLogin(account.email, account.password)
                              }
                            >
                              {account.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-6 text-center text-xs uppercase tracking-[0.3em] text-(--text-secondary)">
                      Already cleared?{" "}
                      <button
                        type="button"
                        onClick={() => handleModeChange("login")}
                        className="text-(--accent-primary) transition hover:opacity-80"
                      >
                        Sign in
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
