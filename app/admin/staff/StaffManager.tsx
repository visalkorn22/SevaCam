"use client";

import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { resolveAvatarUrl } from "@/lib/utils/avatar";
import { StarRating } from "@/components/ui/star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { format } from "date-fns";

type Role = "customer" | "staff" | "admin" | "superadmin";

type MeUser = {
  id: string;
  email: string;
  role: Role;
};

type UserRow = {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  role: Role;
  is_active: boolean;
  created_at?: string;
  average_rating?: number | null;
  review_count?: number;
  completed_bookings?: number;
  experience_level?: string | null;
};

type StaffManagerProps = {
  currentUser: MeUser;
  users: UserRow[];
};

const labelClass =
  "text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)";
const fieldClass =
  "h-10 rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:border-(--accent-primary)/40 focus-visible:ring-1 focus-visible:ring-(--accent-primary)";
const triggerClass =
  "!h-10 rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-primary) data-[placeholder]:text-(--text-disabled)";
const selectContentClass =
  "border border-(--border-subtle) bg-(--bg-elevated) text-(--text-primary)";
const switchClass =
  "data-[state=checked]:bg-(--accent-primary) data-[state=unchecked]:bg-(--bg-inset)";
const primaryButtonClass =
  "sevacam-primary-button h-10 rounded-[0.45rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.16em]";
const secondaryButtonClass =
  "h-10 rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) px-4 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-primary) transition-colors hover:border-(--accent-primary)/30 hover:text-(--accent-primary)";
const rowButtonClass =
  "h-8 rounded-full border border-(--border-subtle) bg-(--bg-inset) px-3 text-[0.56rem] font-semibold uppercase tracking-[0.16em] text-(--text-secondary) transition-colors hover:border-(--accent-primary)/30 hover:text-(--accent-primary)";
const activeRowButtonClass =
  "sevacam-primary-button h-8 rounded-full px-3 text-[0.56rem] font-semibold uppercase tracking-[0.16em] shadow-none";

const roleMeta: Record<
  Role,
  { label: string; chipClass: string; dotClass: string }
> = {
  customer: {
    label: "Customer",
    chipClass:
      "border-(--border-subtle) bg-(--bg-inset) text-(--text-secondary)",
    dotClass: "bg-(--text-disabled)",
  },
  staff: {
    label: "Staff",
    chipClass:
      "border-(--accent-primary)/30 bg-(--accent-primary)/10 text-(--accent-primary)",
    dotClass: "bg-(--accent-primary)",
  },
  admin: {
    label: "Admin",
    chipClass: "border-[#ffb785]/30 bg-[#ffb785]/10 text-[#ffb785]",
    dotClass: "bg-[#ffb785]",
  },
  superadmin: {
    label: "Super Admin",
    chipClass: "border-[#ffb785]/30 bg-[#ffb785]/12 text-[#ffb785]",
    dotClass: "bg-[#ffb785]",
  },
};

function getInitials(name?: string | null, email?: string) {
  const source = (name || email || "User").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function StaffManager({
  currentUser,
  users,
}: StaffManagerProps) {
  const normalizeUser = (user: UserRow): UserRow => ({
    ...user,
    id: user?.id ? String(user.id) : "",
  });

  const [userList, setUserList] = useState<UserRow[]>(
    users.map((user) => normalizeUser(user)),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [createForm, setCreateForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "staff" as Role,
    password: "",
    is_active: true,
  });
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    role: "staff" as Role,
    is_active: true,
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarCacheBust, setAvatarCacheBust] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isInvalidId = (id?: string) => !id || id === "undefined";
  const isPerformanceRole = (role: Role) =>
    role === "staff" || role === "admin" || role === "superadmin";

  const syncUserState = (updated: UserRow) => {
    setUserList((prev) =>
      prev.map((user) => (user.id === updated.id ? updated : user)),
    );
    if (selectedUser?.id === updated.id) {
      setSelectedUser(updated);
      setEditForm({
        full_name: updated.full_name || "",
        phone: updated.phone || "",
        role: updated.role,
        is_active: updated.is_active,
      });
    }
  };

  const sortedUsers = useMemo(() => {
    let filtered = [...userList];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((user) => {
        return (
          user.email.toLowerCase().includes(term) ||
          (user.full_name || "").toLowerCase().includes(term) ||
          (user.phone || "").toLowerCase().includes(term)
        );
      });
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      filtered = filtered.filter((user) => user.is_active === isActive);
    }

    const sorted = filtered.sort((a, b) => {
      if (sortBy === "created") {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate;
      }

      const nameA = (a.full_name || a.email).toLowerCase();
      const nameB = (b.full_name || b.email).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return sorted;
  }, [userList, searchTerm, roleFilter, statusFilter, sortBy]);

  const canManageRoles =
    currentUser.role === "admin" || currentUser.role === "superadmin";
  const canAssignSuperAdmin = currentUser.role === "superadmin";
  const assignableRoles: Role[] = canAssignSuperAdmin
    ? ["customer", "staff", "admin", "superadmin"]
    : ["customer", "staff"];

  const totalActive = userList.filter((user) => user.is_active).length;
  const totalStaff = userList.filter((user) => user.role === "staff").length;
  const totalPrivileged = userList.filter(
    (user) => user.role === "admin" || user.role === "superadmin",
  ).length;
  const selectedAvatarSrc = resolveAvatarUrl(
    selectedUser?.avatar_url,
    avatarCacheBust || undefined,
  );

  const handleCreateUser = async () => {
    setActionError(null);

    if (!createForm.full_name || !createForm.email || !createForm.password) {
      setActionError("Full name, email, and temporary password are required.");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: createForm.full_name,
          email: createForm.email,
          phone: createForm.phone || null,
          role: createForm.role,
          password: createForm.password,
          is_active: createForm.is_active,
        }),
      });

      if (!res.ok) {
        let message = "Unable to create staff account";
        try {
          const data = await res.json();
          message = data?.detail || data?.message || message;
        } catch {}
        throw new Error(message);
      }

      const created = (await res.json()) as UserRow;
      setUserList((prev) => [normalizeUser(created), ...prev]);
      setCreateForm({
        full_name: "",
        email: "",
        phone: "",
        role: "staff",
        password: "",
        is_active: true,
      });
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to create staff account",
      );
    }
  };

  const startEdit = (user: UserRow) => {
    setSelectedUser(user);
    setAvatarCacheBust(0);
    setEditForm({
      full_name: user.full_name || "",
      phone: user.phone || "",
      role: user.role,
      is_active: user.is_active,
    });
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    if (isInvalidId(selectedUser.id)) {
      setActionError("User ID is missing. Please refresh and try again.");
      return;
    }
    setActionError(null);
    setActionId(selectedUser.id);

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: editForm.full_name || null,
          phone: editForm.phone || null,
          role: editForm.role,
          is_active: editForm.is_active,
        }),
      });

      if (!res.ok) {
        let message = "Unable to update staff";
        try {
          const data = await res.json();
          message = data?.detail || data?.message || message;
        } catch {}
        throw new Error(message);
      }

      const updated = normalizeUser((await res.json()) as UserRow);
      syncUserState(updated);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update staff",
      );
    } finally {
      setActionId(null);
    }
  };

  const handleStatusToggle = async (user: UserRow) => {
    setActionError(null);
    if (isInvalidId(user.id)) {
      setActionError("User ID is missing. Please refresh and try again.");
      return;
    }
    setActionId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: !user.is_active }),
      });

      if (!res.ok) {
        let message = "Unable to update status";
        try {
          const data = await res.json();
          message = data?.detail || data?.message || message;
        } catch {}
        throw new Error(message);
      }

      const updated = normalizeUser((await res.json()) as UserRow);
      syncUserState(updated);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update status",
      );
    } finally {
      setActionId(null);
    }
  };

  const handleRoleChange = async (userId: string, role: Role) => {
    setActionError(null);
    if (isInvalidId(userId)) {
      setActionError("User ID is missing. Please refresh and try again.");
      return;
    }
    setActionId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        let message = "Unable to update role";
        try {
          const data = await res.json();
          message = data?.detail || data?.message || message;
        } catch {}
        throw new Error(message);
      }

      const updated = normalizeUser((await res.json()) as UserRow);
      syncUserState(updated);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update role",
      );
    } finally {
      setActionId(null);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!selectedUser) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setActionError("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setActionError("File too large, max 5 MB.");
      return;
    }

    setActionError(null);
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/users/${selectedUser.id}/avatar`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || data?.message || "Upload failed");
      }

      const updated = normalizeUser((await res.json()) as UserRow);
      syncUserState(updated);
      setAvatarCacheBust(Date.now());
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to upload photo",
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    await handleAvatarUpload(file);
  };

  const handleRemoveAvatar = async () => {
    if (!selectedUser) return;
    setActionError(null);
    setAvatarUploading(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/avatar`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || data?.message || "Remove failed");
      }
      const updated = normalizeUser((await res.json()) as UserRow);
      syncUserState(updated);
      setAvatarCacheBust(0);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to remove photo",
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const overviewTiles = [
    {
      title: "Accounts",
      value: userList.length.toString(),
      note: `${sortedUsers.length} visible in current view`,
      icon: Users,
      tone: "text-(--seva-accent)",
      badge: "bg-[rgba(122,213,221,0.18)]",
      bg: "bg-[rgba(122,213,221,0.07)]",
      border: "border-[rgba(122,213,221,0.2)]",
      strip: "bg-(--seva-accent)",
      glow: "rgba(122,213,221,0.08)",
    },
    {
      title: "Active",
      value: totalActive.toString(),
      note: "Accounts currently enabled for access",
      icon: ShieldCheck,
      tone: "text-(--seva-violet)",
      badge: "bg-[rgba(196,176,253,0.18)]",
      bg: "bg-[rgba(196,176,253,0.07)]",
      border: "border-[rgba(196,176,253,0.2)]",
      strip: "bg-(--seva-violet)",
      glow: "rgba(196,176,253,0.08)",
    },
    {
      title: "Staff",
      value: totalStaff.toString(),
      note: "Operational accounts assigned to services",
      icon: UserPlus,
      tone: "text-(--seva-warm)",
      badge: "bg-[rgba(255,183,133,0.18)]",
      bg: "bg-[rgba(255,183,133,0.07)]",
      border: "border-[rgba(255,183,133,0.2)]",
      strip: "bg-(--seva-warm)",
      glow: "rgba(255,183,133,0.08)",
    },
    {
      title: "Privileged",
      value: totalPrivileged.toString(),
      note: "Admin and superadmin level access",
      icon: ShieldCheck,
      tone: "text-(--seva-rose)",
      badge: "bg-[rgba(249,168,196,0.18)]",
      bg: "bg-[rgba(249,168,196,0.07)]",
      border: "border-[rgba(249,168,196,0.2)]",
      strip: "bg-(--seva-rose)",
      glow: "rgba(249,168,196,0.08)",
    },
  ];

  return (
    <div className="space-y-6 text-(--text-primary)">
      {actionError && (
        <div className="rounded-[0.8rem] border border-[#ffb785]/25 bg-[#ffb785]/10 px-4 py-3 text-sm text-[#ffcfaf]">
          {actionError}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {overviewTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.title}
              className={`relative overflow-hidden rounded-[0.9rem] border ${tile.border} ${tile.bg} p-5`}
            >
              <div
                className={`absolute inset-x-0 top-0 h-[2.5px] ${tile.strip}`}
              />
              <div
                className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full blur-xl"
                style={{ background: tile.glow }}
              />
              <div className="flex items-start justify-between gap-3">
                <p
                  className={`text-[0.56rem] font-semibold uppercase tracking-[0.18em] ${tile.tone}`}
                >
                  {tile.title}
                </p>
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.65rem] ${tile.badge} ${tile.tone}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-4 text-[1.9rem] font-medium leading-none tracking-[-0.05em] text-(--text-primary)">
                {tile.value}
              </p>
              <p className={`mt-2 text-[0.74rem] leading-5 ${tile.tone}`}>
                {tile.note}
              </p>
            </div>
          );
        })}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_22rem]">
        <div className="sevacam-rail overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--seva-border-subtle) px-5 py-4">
            <div>
              <p className="sevacam-eyebrow">Directory</p>
              <h2 className="sevacam-display mt-2 text-[1.35rem] leading-none text-(--text-primary)">
                Staff directory
              </h2>
              <p className="mt-1.5 text-[0.76rem] text-(--text-disabled)">
                Search accounts, adjust roles, and review account state.
              </p>
            </div>
            <div className="rounded-full bg-(--bg-inset) px-3 py-2 text-[0.56rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled) ring-1 ring-(--border-subtle)">
              {sortedUsers.length} visible
            </div>
          </div>
          <div className="space-y-4 p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_repeat(3,minmax(0,0.72fr))]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-disabled)" />
                <Input
                  placeholder="Search by name, email, or phone"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className={`${fieldClass} pl-12 pr-4 focus-visible:pl-12 focus-visible:pr-4`}
                />
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className={triggerClass}>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={triggerClass}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className={triggerClass}>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem value="name">Sort by name</SelectItem>
                  <SelectItem value="created">Sort by created date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sortedUsers.length > 0 ? (
              <div className="overflow-hidden rounded-[0.95rem] border border-(--border-subtle) bg-(--bg-inset)">
                {/* Column headers */}
                <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr] gap-4 border-b border-(--seva-border-subtle) px-5 py-2.5 text-[0.54rem] font-semibold uppercase tracking-[0.18em] text-(--text-disabled) md:grid">
                  <span>User</span>
                  <span>Role</span>
                  <span>Status</span>
                  <span>Created</span>
                  <span>Last login</span>
                  <span className="text-right">Actions</span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-white/5">
                  {sortedUsers.map((row) => {
                    const isSelf = row.id === currentUser.id;
                    const hasInvalidId = isInvalidId(row.id);
                    const isLocked =
                      (row.role === "admin" &&
                        currentUser.role !== "superadmin") ||
                      (row.role === "superadmin" &&
                        currentUser.role !== "superadmin");
                    const canToggle =
                      canManageRoles && !isLocked && !isSelf && !hasInvalidId;

                    return (
                      <div
                        key={row.id}
                        className="grid gap-x-4 gap-y-1.5 px-5 py-3.5 transition-colors hover:bg-(--seva-elevated) md:grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr] md:items-center"
                      >
                        {/* User */}
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--border-subtle) bg-(--bg-elevated) text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-(--text-primary)">
                            {resolveAvatarUrl(row.avatar_url) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={resolveAvatarUrl(row.avatar_url) ?? undefined}
                                alt={row.full_name || row.email}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getInitials(row.full_name, row.email)
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-(--text-primary)">
                              {row.full_name || "User"}
                            </p>
                            <p className="truncate text-xs text-(--text-secondary)">
                              {row.email}
                            </p>
                            <p className="truncate text-xs text-(--text-disabled)">
                              {row.phone || "No phone"}
                            </p>
                            {isPerformanceRole(row.role) && (
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.68rem] text-(--text-disabled)">
                                <span>{row.experience_level || "Beginner"}</span>
                                {row.average_rating != null ? (
                                  <StarRating
                                    rating={row.average_rating}
                                    showValue
                                    className="text-[0.68rem]"
                                    valueClassName="text-[0.68rem] text-(--text-disabled)"
                                  />
                                ) : (
                                  <span>No rating</span>
                                )}
                                <span>{row.completed_bookings ?? 0} completed</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Role */}
                        <div>
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.14em] ${roleMeta[row.role].chipClass}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${roleMeta[row.role].dotClass}`}
                            />
                            {roleMeta[row.role].label}
                          </span>
                        </div>

                        {/* Status */}
                        <div>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.14em] ${
                              row.is_active
                                ? "border-(--accent-primary)/30 bg-(--accent-primary)/10 text-(--accent-primary)"
                                : "border-(--border-subtle) bg-(--bg-elevated) text-(--text-disabled)"
                            }`}
                          >
                            {row.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        {/* Created */}
                        <span className="whitespace-nowrap text-xs text-(--text-secondary)">
                          {row.created_at
                            ? format(new Date(row.created_at), "MMM d, yyyy")
                            : "--"}
                        </span>

                        {/* Last login */}
                        <span className="whitespace-nowrap text-xs text-(--text-secondary)">
                          --
                        </span>

                        {/* Actions */}
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className={rowButtonClass}
                            onClick={() => startEdit(row)}
                            disabled={hasInvalidId}
                          >
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className={
                              row.is_active
                                ? rowButtonClass
                                : activeRowButtonClass
                            }
                            disabled={actionId === row.id || hasInvalidId}
                            onClick={() => handleStatusToggle(row)}
                          >
                            {row.is_active ? "Deactivate" : "Activate"}
                          </Button>

                          {isLocked || isSelf || hasInvalidId ? (
                            <span className="inline-flex items-center px-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-(--text-disabled)">
                              {isSelf
                                ? "You"
                                : hasInvalidId
                                  ? "Missing ID"
                                  : "Locked"}
                            </span>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className={
                                  row.role === "customer"
                                    ? activeRowButtonClass
                                    : rowButtonClass
                                }
                                disabled={!canToggle || actionId === row.id}
                                onClick={() =>
                                  handleRoleChange(row.id, "customer")
                                }
                              >
                                Customer
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={
                                  row.role === "staff"
                                    ? activeRowButtonClass
                                    : rowButtonClass
                                }
                                disabled={!canToggle || actionId === row.id}
                                onClick={() =>
                                  handleRoleChange(row.id, "staff")
                                }
                              >
                                Staff
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-[0.95rem] border border-(--border-subtle) bg-(--bg-inset) px-6 py-14 text-center">
                <Users className="mb-4 h-10 w-10 text-(--text-disabled)" />
                <p className="text-base font-medium text-(--text-primary)">
                  No users match the current filters
                </p>
                <p className="mt-2 max-w-md text-sm text-(--text-secondary)">
                  Adjust search, role, or status filters to reveal more
                  accounts.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="sevacam-rail overflow-hidden">
            <div className="border-b border-(--seva-border-subtle) px-5 py-4">
              <p className="sevacam-eyebrow">New account</p>
              <h2 className="sevacam-display mt-2 text-[1.18rem] leading-none text-(--text-primary)">
                Create staff account
              </h2>
              <p className="mt-1.5 text-[0.76rem] text-(--text-disabled)">
                Add a new team or customer record without leaving the admin
                workspace.
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div className="space-y-2">
                <Label htmlFor="staff-full-name" className={labelClass}>
                  Full name
                </Label>
                <Input
                  id="staff-full-name"
                  value={createForm.full_name}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      full_name: event.target.value,
                    }))
                  }
                  placeholder="  Jane Doe"
                  className={fieldClass}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-email" className={labelClass}>
                  Email
                </Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  placeholder="  jane@example.com"
                  className={fieldClass}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-phone" className={labelClass}>
                  Phone
                </Label>
                <Input
                  id="staff-phone"
                  value={createForm.phone}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                  placeholder=" +855 1234 5678"
                  className={fieldClass}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-role" className={labelClass}>
                  Role
                </Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      role: value as Role,
                    }))
                  }
                >
                  <SelectTrigger id="staff-role" className={triggerClass}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    {assignableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleMeta[role].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-password" className={labelClass}>
                  Temporary password
                </Label>
                <Input
                  id="staff-password"
                  type="password"
                  value={createForm.password}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  placeholder="  Set a temporary password"
                  className={fieldClass}
                />
              </div>

              <div className="flex items-center justify-between rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-inset) px-3 py-3">
                <div>
                  <p className="text-sm font-medium text-(--text-primary)">
                    Active account
                  </p>
                  <p className="text-xs text-(--text-secondary)">
                    New account can sign in immediately.
                  </p>
                </div>
                <Switch
                  checked={createForm.is_active}
                  onCheckedChange={(checked) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      is_active: checked,
                    }))
                  }
                  className={switchClass}
                />
              </div>

              <Button onClick={handleCreateUser} className={primaryButtonClass}>
                Create account
              </Button>
            </div>
          </div>

          {selectedUser ? (
            <div className="sevacam-rail overflow-hidden">
              <div className="flex items-start gap-3 border-b border-(--seva-border-subtle) px-5 py-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--border-subtle) bg-(--bg-inset) text-sm font-semibold uppercase tracking-[0.12em] text-(--text-primary)">
                  {selectedAvatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedAvatarSrc}
                      alt={selectedUser.full_name || selectedUser.email}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(selectedUser.full_name, selectedUser.email)
                  )}
                </span>
                <div className="min-w-0">
                  <p className="sevacam-eyebrow">Selected account</p>
                  <h2 className="sevacam-display mt-2 text-[1.16rem] leading-none text-(--text-primary)">
                    {selectedUser.full_name || "Account details"}
                  </h2>
                  <p className="truncate text-[0.76rem] text-(--text-disabled)">
                    {selectedUser.email}
                  </p>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid gap-2 rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-inset) p-3 text-xs text-(--text-secondary)">
                  <div className="flex items-center justify-between gap-3">
                    <span>Created</span>
                    <span className="text-(--text-primary)">
                      {selectedUser.created_at
                        ? format(
                            new Date(selectedUser.created_at),
                            "MMM d, yyyy",
                          )
                        : "--"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Status</span>
                    <span className="text-(--text-primary)">
                      {selectedUser.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
                <div className="space-y-3 rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-inset) p-3">
                  <div>
                    <p className="text-sm font-medium text-(--text-primary)">
                      Profile photo
                    </p>
                    <p className="text-xs text-(--text-secondary)">
                      Upload a staff photo customers will see during booking.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className={secondaryButtonClass}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                    >
                      <Camera className="mr-2 h-3.5 w-3.5" />
                      {avatarUploading ? "Uploading..." : "Upload photo"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className={secondaryButtonClass}
                      onClick={handleRemoveAvatar}
                      disabled={avatarUploading || !selectedUser.avatar_url}
                    >
                      Remove photo
                    </Button>
                  </div>
                </div>

                {isPerformanceRole(selectedUser.role) && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-inset) p-3">
                      <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-(--text-disabled)">
                        Experience
                      </p>
                      <p className="mt-2 text-sm font-medium text-(--text-primary)">
                        {selectedUser.experience_level || "Beginner"}
                      </p>
                    </div>
                    <div className="rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-inset) p-3">
                      <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-(--text-disabled)">
                        Average rating
                      </p>
                      <div className="mt-2 text-sm font-medium text-(--text-primary)">
                        {selectedUser.average_rating != null ? (
                          <StarRating
                            rating={selectedUser.average_rating}
                            showValue
                            valueClassName="text-sm font-medium text-(--text-primary)"
                          />
                        ) : (
                          "No rating"
                        )}
                      </div>
                    </div>
                    <div className="rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-inset) p-3">
                      <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-(--text-disabled)">
                        Completed
                      </p>
                      <p className="mt-2 text-sm font-medium text-(--text-primary)">
                        {selectedUser.completed_bookings ?? 0}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="edit-full-name" className={labelClass}>
                    Full name
                  </Label>
                  <Input
                    id="edit-full-name"
                    value={editForm.full_name}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        full_name: event.target.value,
                      }))
                    }
                    className={fieldClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-phone" className={labelClass}>
                    Phone
                  </Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        phone: event.target.value,
                      }))
                    }
                    className={fieldClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-role" className={labelClass}>
                    Role
                  </Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(value) =>
                      setEditForm((prev) => ({
                        ...prev,
                        role: value as Role,
                      }))
                    }
                    disabled={selectedUser.id === currentUser.id}
                  >
                    <SelectTrigger id="edit-role" className={triggerClass}>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className={selectContentClass}>
                      {assignableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleMeta[role].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-inset) px-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-(--text-primary)">
                      Active account
                    </p>
                    <p className="text-xs text-(--text-secondary)">
                      Control whether this account can access the platform.
                    </p>
                  </div>
                  <Switch
                    checked={editForm.is_active}
                    onCheckedChange={(checked) =>
                      setEditForm((prev) => ({
                        ...prev,
                        is_active: checked,
                      }))
                    }
                    className={switchClass}
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="ghost"
                    className={secondaryButtonClass}
                    onClick={() => {
                      setSelectedUser(null);
                      setAvatarCacheBust(0);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateUser}
                    disabled={actionId === selectedUser.id}
                    className={primaryButtonClass}
                  >
                    Save changes
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="sevacam-rail overflow-hidden">
              <div className="border-b border-(--seva-border-subtle) px-5 py-4">
                <p className="sevacam-eyebrow">Inspector</p>
                <h2 className="sevacam-display mt-2 text-[1.16rem] leading-none text-(--text-primary)">
                  Review an account
                </h2>
                <p className="mt-1.5 text-[0.76rem] text-(--text-disabled)">
                  Select Edit on any row to inspect profile details and update
                  role or access state.
                </p>
              </div>
              <div className="p-5">
                <div className="rounded-[0.7rem] border border-dashed border-(--border-subtle) bg-(--bg-inset) px-4 py-10 text-center">
                  <Users className="mx-auto h-8 w-8 text-(--text-disabled)" />
                  <p className="mt-4 text-sm font-medium text-(--text-primary)">
                    No account selected
                  </p>
                  <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
                    The edit panel stays here so staff changes remain easy to
                    review without leaving the directory.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
