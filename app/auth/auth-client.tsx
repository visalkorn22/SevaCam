"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  DEMO_AUTO_SUBMIT,
  DEMO_ENABLED,
  demoAccounts,
} from "@/lib/demo-accounts";

type Mode = "login" | "signup";

type AuthClientProps = {
  initialMode: Mode;
};

export default function AuthClient({ initialMode }: AuthClientProps) {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const [mode, setMode] = useState<Mode>(initialMode);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(
    searchParams.get("error"),
  );
  const [loginLoading, setLoginLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [magicLinkMessage, setMagicLinkMessage] = useState<string | null>(null);
  const [magicLinkStatus, setMagicLinkStatus] = useState<
    "success" | "error" | null
  >(null);
  const loginEmailRef = useRef<HTMLInputElement | null>(null);
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

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
      router.push("/#home-services");
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

  const handleGoogleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    window.location.href = `${apiUrl}/api/auth/google/start?mode=${mode}`;
  };

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
    <AuthShell
      mode={mode}
      onModeChange={handleModeChange}
      onLoginSubmit={handleLogin}
      onSignupSubmit={handleSignup}
      onMagicLink={requestMagicLink}
      onGoogleLogin={handleGoogleLogin}
      onResendVerification={handleResendVerification}
      onDemoLogin={handleDemoLogin}
      loginEmailRef={loginEmailRef}
      loginEmail={loginEmail}
      loginPassword={loginPassword}
      loginError={loginError}
      loginLoading={loginLoading}
      resendLoading={resendLoading}
      resendMessage={resendMessage}
      magicLinkLoading={magicLinkLoading}
      magicLinkMessage={magicLinkMessage}
      magicLinkStatus={magicLinkStatus}
      googleEnabled={googleEnabled}
      fullName={fullName}
      signupEmail={signupEmail}
      signupPassword={signupPassword}
      confirmPassword={confirmPassword}
      phone={phone}
      signupError={signupError}
      signupLoading={signupLoading}
      onLoginEmailChange={setLoginEmail}
      onLoginPasswordChange={setLoginPassword}
      onFullNameChange={setFullName}
      onSignupEmailChange={setSignupEmail}
      onSignupPasswordChange={setSignupPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onPhoneChange={setPhone}
      demoEnabled={DEMO_ENABLED}
      demoAccounts={demoAccounts}
    />
  );
}
