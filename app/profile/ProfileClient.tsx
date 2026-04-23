"use client";

import { useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Clock3,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";
import { resolveAvatarUrl } from "@/lib/utils/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileUser = {
  id: string;
  email: string;
  role?: "customer" | "staff" | "admin" | "superadmin";
  full_name?: string | null;
  phone?: string | null;
  timezone?: string | null;
  avatar_url?: string | null;
};

type Message = { type: "success" | "error"; text: string } | null;

function getMonogram(fullName?: string | null, email?: string) {
  const source = (fullName || email || "U").trim();
  const words = source.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

const roleLabels: Record<NonNullable<ProfileUser["role"]>, string> = {
  customer: "Customer",
  staff: "Staff",
  admin: "Admin",
  superadmin: "Super Admin",
};

export default function ProfileClient({ user }: { user: ProfileUser }) {
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [timezone, setTimezone] = useState(() => {
    if (user.timezone) return user.timezone;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  });
  const [profileMessage, setProfileMessage] = useState<Message>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar_url ?? null);
  const [cacheBust, setCacheBust] = useState<number>(0);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<Message>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const initials = useMemo(
    () => getMonogram(fullName || user.full_name, user.email),
    [fullName, user.full_name, user.email],
  );

  const resolvedAvatarSrc = resolveAvatarUrl(avatarUrl, cacheBust || undefined);

  const timezonePreview = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: timezone || undefined,
      }).format(new Date());
    } catch {
      return null;
    }
  }, [timezone]);

  const passwordStrength = useMemo(() => {
    if (!newPassword) return "Awaiting new password";
    if (newPassword.length < 8) return "Weak";
    if (
      /[A-Z]/.test(newPassword) &&
      /[a-z]/.test(newPassword) &&
      /\d/.test(newPassword) &&
      /[^A-Za-z0-9]/.test(newPassword)
    ) {
      return "Strong";
    }
    return "Moderate";
  }, [newPassword]);

  const securityChecks = [
    {
      label: "Profile details are complete",
      ok: Boolean(fullName.trim() && phone.trim() && timezone.trim()),
    },
    {
      label: "Timezone format resolves correctly",
      ok: Boolean(timezonePreview),
    },
    {
      label: "New password passes minimum length",
      ok: !newPassword || newPassword.length >= 6,
    },
  ];

  const roleLabel = user.role ? roleLabels[user.role] : "Account";

  const triggerFilePicker = () => {
    if (!avatarUploading) fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setAvatarError("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("File too large — max 5 MB.");
      return;
    }

    setAvatarError(null);
    setAvatarUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${apiUrl}/api/me/avatar`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? "Upload failed — please try again.");
      }

      const data = await res.json();
      setAvatarUrl(data.avatar_url);
      setCacheBust(Date.now());
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarError(null);
    setAvatarUploading(true);

    try {
      const res = await fetch(`${apiUrl}/api/me/avatar`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Remove failed — please try again.");
      setAvatarUrl(null);
      setCacheBust(0);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    try {
      const res = await fetch(`${apiUrl}/api/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          timezone: timezone.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          data?.detail || data?.message || "Failed to update profile";
        throw new Error(message);
      }

      setProfileMessage({ type: "success", text: "Profile updated" });
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Update failed",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "Password must be at least 6 characters",
      });
      setPasswordSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match" });
      setPasswordSaving(false);
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          data?.detail || data?.message || "Failed to update password";
        throw new Error(message);
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({ type: "success", text: "Password updated" });
    } catch (error) {
      setPasswordMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Update failed",
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="sevacam-home relative overflow-hidden rounded-[1.1rem] border border-white/6 bg-(--seva-base) p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(122,213,221,0.16),transparent_68%)] blur-3xl" />
      <div className="pointer-events-none absolute -right-14 bottom-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,183,133,0.14),transparent_68%)] blur-3xl" />

      <div className="relative space-y-6">
        <section className="animate-fade-in relative overflow-hidden rounded-2xl border border-white/6 bg-(--seva-surface) px-5 py-6 sm:px-7 sm:py-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(122,213,221,0.11),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(255,183,133,0.08),transparent_35%)]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                  aria-label="Upload profile photo"
                />

                <button
                  type="button"
                  onClick={triggerFilePicker}
                  disabled={avatarUploading}
                  aria-label="Change profile photo"
                  className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-(--seva-elevated) focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-60"
                >
                  {resolvedAvatarSrc ? (
                    <img
                      src={resolvedAvatarSrc}
                      alt={fullName || user.email}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[0.86rem] font-semibold uppercase tracking-[0.16em] text-(--seva-text)">
                      {initials}
                    </span>
                  )}

                  <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    {avatarUploading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <Camera className="h-4 w-4 text-white" />
                    )}
                  </span>
                </button>

                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={triggerFilePicker}
                    disabled={avatarUploading}
                    className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-(--seva-text-soft) hover:text-(--seva-text) transition-colors disabled:opacity-40"
                  >
                    {avatarUploading ? "Uploading…" : "Change photo"}
                  </button>

                  {avatarUrl && !avatarUploading && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-[0.62rem] text-(--seva-text-muted) hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {avatarError && (
                  <p className="text-[0.72rem] text-[#ffd5b8] max-w-35 text-center leading-5">
                    {avatarError}
                  </p>
                )}
              </div>
              <div>
                <p className="sevacam-eyebrow text-(--seva-warm)">
                  Profile Control Surface
                </p>
                <h2 className="sevacam-display mt-2 text-[clamp(1.8rem,4vw,2.8rem)] leading-[0.92] text-(--seva-text)">
                  Personal identity and security.
                </h2>
                <p className="mt-3 max-w-2xl text-[0.84rem] leading-6 text-(--seva-text-soft)">
                  Keep contact details, timezone preferences, and password
                  policy aligned so booking communication and account access
                  stay predictable.
                </p>
              </div>
            </div>

            <div className="grid gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-(--seva-text-soft) sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[0.55rem] border border-white/8 bg-(--seva-elevated) px-3 py-2">
                <p className="text-(--seva-text-muted)">Role</p>
                <p className="mt-1 text-(--seva-accent)">{roleLabel}</p>
              </div>
              <div className="rounded-[0.55rem] border border-white/8 bg-(--seva-elevated) px-3 py-2">
                <p className="text-(--seva-text-muted)">Local Time</p>
                <p className="mt-1 text-(--seva-text)">
                  {timezonePreview ?? "Timezone unavailable"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.06fr)_18.5rem]">
          <div className="space-y-6">
            <div
              className="sevacam-rail animate-fade-in overflow-hidden"
              style={{ animationDelay: "80ms" }}
            >
              <div className="border-b border-white/6 px-5 py-4 sm:px-6 sm:py-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.65rem] bg-[rgba(122,213,221,0.14)] text-(--seva-accent)">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="sevacam-eyebrow">Personal Information</p>
                    <p className="mt-1 text-[0.78rem] text-(--seva-text-soft)">
                      Update the information used for communication and
                      appointment context.
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={updateProfile}
                className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6"
              >
                <div className="space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="email"
                    className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-(--seva-text-soft)"
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-(--seva-text-muted)" />
                    <Input
                      id="email"
                      type="email"
                      value={user.email}
                      disabled
                      className="sevacam-service-input border-white/8 bg-[rgba(23,23,23,0.9)] pl-11 text-(--seva-text-muted) disabled:opacity-100"
                      style={{ paddingLeft: "2.85rem" }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-(--seva-text-soft)"
                  >
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="sevacam-service-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-(--seva-text-soft)"
                  >
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-(--seva-text-muted)" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="sevacam-service-input pl-11"
                      style={{ paddingLeft: "2.85rem" }}
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="timezone"
                    className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-(--seva-text-soft)"
                  >
                    Timezone
                  </Label>
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-(--seva-text-muted)" />
                    <Input
                      id="timezone"
                      placeholder="Asia/Phnom_Penh"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="sevacam-service-input pl-11"
                      style={{ paddingLeft: "2.85rem" }}
                    />
                  </div>
                  <p className="text-[0.72rem] text-(--seva-text-muted)">
                    {timezonePreview
                      ? `Preview: ${timezonePreview}`
                      : "Timezone is not valid. Use an IANA value like Asia/Phnom_Penh."}
                  </p>
                </div>

                {profileMessage && (
                  <div
                    className={`sm:col-span-2 flex items-start gap-2 rounded-[0.65rem] border px-3.5 py-3 text-sm ${
                      profileMessage.type === "success"
                        ? "border-[rgba(127,209,165,0.34)] bg-[rgba(21,36,28,0.8)] text-(--seva-text)"
                        : "border-[rgba(229,115,115,0.34)] bg-[rgba(42,21,21,0.8)] text-(--seva-text)"
                    }`}
                  >
                    {profileMessage.type === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-(--state-success)" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-(--state-error)" />
                    )}
                    <span>{profileMessage.text}</span>
                  </div>
                )}

                <div className="sm:col-span-2 flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    disabled={profileSaving}
                    className="sevacam-primary-button min-h-10 rounded-[0.22rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] disabled:opacity-60"
                  >
                    {profileSaving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setFullName(user.full_name ?? "");
                      setPhone(user.phone ?? "");
                      setTimezone(user.timezone ?? "");
                      setProfileMessage(null);
                    }}
                    className="sevacam-secondary-button min-h-10 rounded-[0.22rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </div>

            <div
              className="sevacam-rail animate-fade-in overflow-hidden"
              style={{ animationDelay: "160ms" }}
            >
              <div className="border-b border-white/6 px-5 py-4 sm:px-6 sm:py-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.65rem] bg-[rgba(255,183,133,0.14)] text-(--seva-warm)">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="sevacam-eyebrow text-(--seva-warm)">
                      Password Rotation
                    </p>
                    <p className="mt-1 text-[0.78rem] text-(--seva-text-soft)">
                      Use a unique password and rotate it whenever access
                      policies change.
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={changePassword}
                className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6"
              >
                <div className="space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="currentPassword"
                    className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-(--seva-text-soft)"
                  >
                    Current Password
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    className="sevacam-service-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="newPassword"
                    className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-(--seva-text-soft)"
                  >
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Use at least 6 characters"
                    autoComplete="new-password"
                    className="sevacam-service-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-(--seva-text-soft)"
                  >
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat the new password"
                    autoComplete="new-password"
                    className="sevacam-service-input"
                  />
                </div>

                <div className="sm:col-span-2 rounded-[0.65rem] border border-white/8 bg-[rgba(37,37,36,0.7)] px-3.5 py-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-(--seva-text-muted)">
                    Password Signal
                  </p>
                  <p className="mt-1 text-sm text-(--seva-text)">
                    {passwordStrength}
                  </p>
                </div>

                {passwordMessage && (
                  <div
                    className={`sm:col-span-2 flex items-start gap-2 rounded-[0.65rem] border px-3.5 py-3 text-sm ${
                      passwordMessage.type === "success"
                        ? "border-[rgba(127,209,165,0.34)] bg-[rgba(21,36,28,0.8)] text-(--seva-text)"
                        : "border-[rgba(229,115,115,0.34)] bg-[rgba(42,21,21,0.8)] text-(--seva-text)"
                    }`}
                  >
                    {passwordMessage.type === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-(--state-success)" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-(--state-error)" />
                    )}
                    <span>{passwordMessage.text}</span>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    disabled={passwordSaving}
                    className="sevacam-primary-button min-h-10 rounded-[0.22rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] disabled:opacity-60"
                  >
                    {passwordSaving ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <aside
            className="space-y-4 animate-fade-in"
            style={{ animationDelay: "220ms" }}
          >
            <div className="sevacam-rail p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-(--seva-accent)" />
                <p className="sevacam-eyebrow">Account Snapshot</p>
              </div>
              <div className="mt-3 space-y-2">
                <div className="sevacam-side-stat">
                  <span>Identity</span>
                  <span>{fullName.trim() || "Not set"}</span>
                </div>
                <div className="sevacam-side-stat">
                  <span>Email</span>
                  <span>{user.email}</span>
                </div>
                <div className="sevacam-side-stat">
                  <span>Timezone</span>
                  <span>{timezone.trim() || "Not set"}</span>
                </div>
              </div>
            </div>

            <div className="sevacam-rail p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-(--seva-warm)" />
                <p className="sevacam-eyebrow text-(--seva-warm)">
                  Security Checklist
                </p>
              </div>
              <ul className="mt-3 space-y-2">
                {securityChecks.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-start gap-2 rounded-xl border border-white/8 bg-[rgba(37,37,36,0.75)] px-3 py-2 text-[0.76rem] text-(--seva-text-soft)"
                  >
                    {item.ok ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--state-success)" />
                    ) : (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--state-error)" />
                    )}
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
