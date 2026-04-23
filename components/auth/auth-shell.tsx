"use client";

import type React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";

type Mode = "login" | "signup";

type DemoAccount = {
  role: string;
  label: string;
  email: string;
  password: string;
};

type AuthShellProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onLoginSubmit: (event: React.FormEvent) => void;
  onSignupSubmit: (event: React.FormEvent) => void;
  onMagicLink: () => void;
  onGoogleLogin: () => void;
  onResendVerification: () => void;
  onDemoLogin: (email: string, password: string) => void;
  loginEmailRef: React.RefObject<HTMLInputElement | null>;
  loginEmail: string;
  loginPassword: string;
  loginError: string | null;
  loginLoading: boolean;
  resendLoading: boolean;
  resendMessage: string | null;
  magicLinkLoading: boolean;
  magicLinkMessage: string | null;
  magicLinkStatus: "success" | "error" | null;
  googleEnabled: boolean;
  fullName: string;
  signupEmail: string;
  signupPassword: string;
  confirmPassword: string;
  phone: string;
  signupError: string | null;
  signupLoading: boolean;
  onLoginEmailChange: (value: string) => void;
  onLoginPasswordChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onSignupEmailChange: (value: string) => void;
  onSignupPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  demoEnabled: boolean;
  demoAccounts: DemoAccount[];
};

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

export function AuthShell({
  mode,
  onModeChange,
  onLoginSubmit,
  onSignupSubmit,
  onMagicLink,
  onGoogleLogin,
  onResendVerification,
  onDemoLogin,
  loginEmailRef,
  loginEmail,
  loginPassword,
  loginError,
  loginLoading,
  resendLoading,
  resendMessage,
  magicLinkLoading,
  magicLinkMessage,
  magicLinkStatus,
  googleEnabled,
  fullName,
  signupEmail,
  signupPassword,
  confirmPassword,
  phone,
  signupError,
  signupLoading,
  onLoginEmailChange,
  onLoginPasswordChange,
  onFullNameChange,
  onSignupEmailChange,
  onSignupPasswordChange,
  onConfirmPasswordChange,
  onPhoneChange,
  demoEnabled,
  demoAccounts,
}: AuthShellProps) {
  const modeTitle =
    mode === "login" ? "Authorize your session" : "Create your account";
  const modeDescription =
    mode === "login"
      ? "Sign in to manage upcoming reservations, payments, and service details."
      : "Create access to reserve services, review receipts, and manage your bookings.";
  const panelTitle =
    mode === "login"
      ? "Calm entry for returning guests."
      : "Begin with a quieter sign-up experience.";
  const panelDescription =
    mode === "login"
      ? "A refined access point for customers, staff, and admin teams moving through the SevaCam booking flow."
      : "Set up your profile once, then move directly into booking, payment, and confirmation without friction.";
  const fieldLabelClass =
    "text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-white/62";
  const fieldClass =
    "h-14 w-full rounded-[1rem] border border-white/12 bg-white/[0.06] px-4 text-[0.95rem] text-[var(--seva-text)] placeholder:text-white/35 outline-none transition-[border-color,background-color,box-shadow] duration-200 ease-out focus:border-[rgba(122,213,221,0.35)] focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(122,213,221,0.08)] disabled:cursor-not-allowed disabled:opacity-55";
  const iconFieldClass = `${fieldClass} pl-12`;
  const secondaryButtonClass =
    "inline-flex h-13 w-full items-center justify-center gap-3 rounded-[1rem] border border-white/12 bg-white/[0.04] px-4 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[var(--seva-text)] transition-all duration-200 hover:border-[rgba(122,213,221,0.24)] hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-55";
  const primaryButtonClass =
    "inline-flex h-14 w-full items-center justify-center gap-3 rounded-[1rem] bg-[var(--seva-accent)] px-5 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#07292d] shadow-[0_18px_40px_rgba(122,213,221,0.2)] transition-all duration-200 hover:bg-[#92dfe5] disabled:cursor-not-allowed disabled:opacity-55";
  const dividerClass =
    "flex items-center gap-3 text-[0.64rem] font-semibold uppercase tracking-[0.28em] text-white/34";

  return (
    <div className="sevacam-home relative min-h-screen overflow-hidden bg-[var(--seva-base)] text-[var(--seva-text)]">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/Office.webp"
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      >
        <source src="/Background_video.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(9,12,14,0.82),rgba(19,19,19,0.72)_42%,rgba(8,17,19,0.88))]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(122,213,221,0.12),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,183,133,0.08),transparent_28%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[78rem] items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="grid w-full max-w-[67rem] overflow-hidden rounded-[1.8rem] border border-white/10 bg-[rgba(18,18,18,0.78)] shadow-[0_36px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:grid-cols-[minmax(17rem,0.82fr)_minmax(20rem,1fr)] xl:scale-[0.92] xl:origin-center 2xl:scale-[0.88]">
          <section className="relative flex min-h-[17rem] flex-col justify-between overflow-hidden border-b border-white/8 bg-[linear-gradient(180deg,rgba(122,213,221,0.12),rgba(15,15,15,0.08)_24%,rgba(15,15,15,0.48))] p-6 sm:p-7 lg:min-h-[39rem] lg:border-b-0 lg:border-r lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(122,213,221,0.18),transparent_34%),linear-gradient(180deg,rgba(19,19,19,0.08),rgba(19,19,19,0.58))]" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="sevacam-display text-[2rem] leading-none tracking-[-0.05em] text-[var(--seva-text)] sm:text-[2.4rem]">
                  SevaCam
                </p>
                <p className="mt-3 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[var(--seva-accent)]">
                  Private guest access
                </p>
              </div>

              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--seva-text)] transition-colors hover:border-[rgba(122,213,221,0.22)] hover:bg-white/[0.12]"
              >
                Back to landing
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="relative mt-10 max-w-[23rem] lg:mt-0">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[var(--seva-warm)]">
                Access protocol / 2026
              </p>
              <h2 className="sevacam-display mt-5 text-[clamp(2.25rem,4.4vw,4rem)] leading-[0.92] tracking-[-0.06em] text-[var(--seva-text)]">
                {panelTitle}
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-white/72 sm:text-base">
                {panelDescription}
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1rem] border border-white/10 bg-black/18 px-4 py-4">
                  <p className="text-[0.6rem] uppercase tracking-[0.18em] text-white/42">
                    Booking
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--seva-text)]">
                    Direct service entry
                  </p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-black/18 px-4 py-4">
                  <p className="text-[0.6rem] uppercase tracking-[0.18em] text-white/42">
                    Payment
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--seva-text)]">
                    Receipt-first flow
                  </p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-black/18 px-4 py-4">
                  <p className="text-[0.6rem] uppercase tracking-[0.18em] text-white/42">
                    Support
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--seva-text)]">
                    Account recovery ready
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <span className="h-1.5 w-10 rounded-full bg-[var(--seva-accent)]" />
                <span className="h-1.5 w-6 rounded-full bg-white/30" />
                <span className="h-1.5 w-12 rounded-full bg-white/18" />
              </div>
            </div>
          </section>

          <section className="relative flex min-h-[38rem] items-center p-6 sm:p-7 lg:p-8 xl:p-9">
            <div className="mx-auto w-full max-w-[30rem]">
              <div className="mb-7">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[var(--seva-accent)]">
                  Authorized access
                </p>
                <h1 className="mt-4 text-[clamp(2.1rem,5vw,3.7rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-[var(--seva-text)]">
                  {modeTitle}
                </h1>
                <p className="mt-4 max-w-[32rem] text-sm leading-7 text-white/68 sm:text-base">
                  {modeDescription}
                </p>
              </div>

              <div className="relative mb-8 flex rounded-full border border-white/8 bg-white/[0.04] p-1 text-[0.64rem] font-semibold uppercase tracking-[0.28em] text-white/52">
                <span
                  className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-[var(--seva-accent)] shadow-[0_0_18px_rgba(122,213,221,0.24)] transition-transform duration-500 ${
                    mode === "signup" ? "translate-x-full" : "translate-x-0"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => onModeChange("login")}
                  className={`relative z-10 flex-1 rounded-full px-4 py-3 text-center transition-colors ${
                    mode === "login"
                      ? "text-[#07292d]"
                      : "text-white/58 hover:text-white/84"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange("signup")}
                  className={`relative z-10 flex-1 rounded-full px-4 py-3 text-center transition-colors ${
                    mode === "signup"
                      ? "text-[#07292d]"
                      : "text-white/58 hover:text-white/84"
                  }`}
                >
                  Register
                </button>
              </div>

              {mode === "login" ? (
                <form onSubmit={onLoginSubmit} className="space-y-6">
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={onMagicLink}
                      disabled={loginLoading || magicLinkLoading}
                      className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
                    >
                      <Mail className="h-3 w-3" />
                      {magicLinkLoading ? "Sending…" : "or continue with email"}
                    </button>
                  </div>

                  {magicLinkMessage && (
                    <div
                      className={`rounded-[1rem] border px-4 py-3 text-sm leading-6 ${
                        magicLinkStatus === "error"
                          ? "border-[#ffb785]/25 bg-[#ffb785]/10 text-[#ffd5b8]"
                          : "border-white/10 bg-white/[0.04] text-white/72"
                      }`}
                    >
                      {magicLinkMessage}
                    </div>
                  )}

                  <div className="grid gap-5">
                    <div className="grid gap-2">
                      <label htmlFor="login-email" className={fieldLabelClass}>
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
                        <input
                          id="login-email"
                          type="email"
                          placeholder="name@organization.com"
                          required
                          value={loginEmail}
                          onChange={(event) =>
                            onLoginEmailChange(event.target.value)
                          }
                          disabled={loginLoading}
                          ref={loginEmailRef}
                          className={iconFieldClass}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-4">
                        <label
                          htmlFor="login-password"
                          className={fieldLabelClass}
                        >
                          Password
                        </label>
                        <Link
                          href="/auth/reset-password"
                          className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[var(--seva-accent)] transition-colors hover:text-[var(--seva-text)]"
                        >
                          Recovery
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
                        <input
                          id="login-password"
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(event) =>
                            onLoginPasswordChange(event.target.value)
                          }
                          disabled={loginLoading}
                          className={iconFieldClass}
                        />
                      </div>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/62">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-white/18 bg-white/[0.06] accent-[var(--seva-accent)]"
                    />
                    Remember credentials
                  </label>

                  {loginError && (
                    <div className="rounded-[1rem] border border-[#ffb785]/24 bg-[#ffb785]/10 px-4 py-4 text-sm leading-6 text-[#ffd5b8]">
                      {loginError}
                      {loginError === "Email not verified" && (
                        <div className="mt-4 space-y-3">
                          <button
                            type="button"
                            onClick={onResendVerification}
                            disabled={resendLoading}
                            className={secondaryButtonClass}
                          >
                            {resendLoading
                              ? "Sending verification..."
                              : "Resend verification email"}
                          </button>
                          {resendMessage && (
                            <p className="text-xs leading-5 text-white/70">
                              {resendMessage}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className={primaryButtonClass}
                  >
                    {loginLoading ? "Authorizing..." : "Authorize session"}
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  {googleEnabled && (
                    <>
                      <div className={dividerClass}>
                        <span className="h-px flex-1 bg-white/10" />
                        or continue with
                        <span className="h-px flex-1 bg-white/10" />
                      </div>
                      <button
                        type="button"
                        onClick={onGoogleLogin}
                        disabled={loginLoading}
                        className={secondaryButtonClass}
                      >
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white">
                          <GoogleLogo className="h-4 w-4" />
                        </span>
                        Continue with Google
                      </button>
                    </>
                  )}

                  {demoEnabled && (
                    <div className="rounded-[1.15rem] border border-dashed border-white/12 bg-white/[0.03] p-4 sm:p-5">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-white/56">
                        Demo accounts
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/62">
                        Tap to prefill a test account.
                      </p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        {demoAccounts.map((account) => (
                          <button
                            key={account.role}
                            type="button"
                            onClick={() =>
                              onDemoLogin(account.email, account.password)
                            }
                            className="inline-flex h-11 items-center justify-center rounded-[0.9rem] border border-white/10 bg-black/18 px-3 text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-[var(--seva-text)] transition-colors hover:border-[rgba(122,213,221,0.24)] hover:bg-white/[0.06]"
                          >
                            {account.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-center text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-white/56">
                    New here?{" "}
                    <button
                      type="button"
                      onClick={() => onModeChange("signup")}
                      className="text-[var(--seva-accent)] transition-colors hover:text-[var(--seva-text)]"
                    >
                      Create access
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={onSignupSubmit} className="space-y-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label htmlFor="fullName" className={fieldLabelClass}>
                        Full name
                      </label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
                        <input
                          id="fullName"
                          type="text"
                          placeholder="John Doe"
                          required
                          value={fullName}
                          onChange={(event) => onFullNameChange(event.target.value)}
                          disabled={signupLoading}
                          className={iconFieldClass}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label htmlFor="phone" className={fieldLabelClass}>
                        Phone number
                      </label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
                        <input
                          id="phone"
                          type="tel"
                          placeholder="+1234567890"
                          value={phone}
                          onChange={(event) => onPhoneChange(event.target.value)}
                          disabled={signupLoading}
                          className={iconFieldClass}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label htmlFor="signup-email" className={fieldLabelClass}>
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
                      <input
                        id="signup-email"
                        type="email"
                        placeholder="name@organization.com"
                        required
                        value={signupEmail}
                        onChange={(event) =>
                          onSignupEmailChange(event.target.value)
                        }
                        disabled={signupLoading}
                        className={iconFieldClass}
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label
                        htmlFor="signup-password"
                        className={fieldLabelClass}
                      >
                        Create password
                      </label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
                        <input
                          id="signup-password"
                          type="password"
                          required
                          value={signupPassword}
                          onChange={(event) =>
                            onSignupPasswordChange(event.target.value)
                          }
                          disabled={signupLoading}
                          className={iconFieldClass}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label
                        htmlFor="confirmPassword"
                        className={fieldLabelClass}
                      >
                        Confirm password
                      </label>
                      <div className="relative">
                        <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
                        <input
                          id="confirmPassword"
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(event) =>
                            onConfirmPasswordChange(event.target.value)
                          }
                          disabled={signupLoading}
                          className={iconFieldClass}
                        />
                      </div>
                    </div>
                  </div>

                  {signupError && (
                    <div className="rounded-[1rem] border border-[#ffb785]/24 bg-[#ffb785]/10 px-4 py-4 text-sm leading-6 text-[#ffd5b8]">
                      {signupError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={signupLoading}
                    className={primaryButtonClass}
                  >
                    {signupLoading ? "Creating access..." : "Create account"}
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  {googleEnabled && (
                    <>
                      <div className={dividerClass}>
                        <span className="h-px flex-1 bg-white/10" />
                        or continue with
                        <span className="h-px flex-1 bg-white/10" />
                      </div>
                      <button
                        type="button"
                        onClick={onGoogleLogin}
                        disabled={signupLoading}
                        className={secondaryButtonClass}
                      >
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white">
                          <GoogleLogo className="h-4 w-4" />
                        </span>
                        Continue with Google
                      </button>
                    </>
                  )}

                  {demoEnabled && (
                    <div className="rounded-[1.15rem] border border-dashed border-white/12 bg-white/[0.03] p-4 sm:p-5">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-white/56">
                        Demo accounts
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/62">
                        Use a configured account to preview the experience.
                      </p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        {demoAccounts.map((account) => (
                          <button
                            key={account.role}
                            type="button"
                            onClick={() =>
                              onDemoLogin(account.email, account.password)
                            }
                            className="inline-flex h-11 items-center justify-center rounded-[0.9rem] border border-white/10 bg-black/18 px-3 text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-[var(--seva-text)] transition-colors hover:border-[rgba(122,213,221,0.24)] hover:bg-white/[0.06]"
                          >
                            {account.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-center text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-white/56">
                    Already cleared?{" "}
                    <button
                      type="button"
                      onClick={() => onModeChange("login")}
                      className="text-[var(--seva-accent)] transition-colors hover:text-[var(--seva-text)]"
                    >
                      Sign in
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
