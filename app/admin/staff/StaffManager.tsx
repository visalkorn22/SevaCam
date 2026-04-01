"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";
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
};

type StaffManagerProps = {
  currentUser: MeUser;
  users: UserRow[];
};

export default function StaffManager({
  currentUser,
  users,
}: StaffManagerProps) {
  const normalizeUser = (user: UserRow): UserRow => ({
    ...user,
    id: user?.id ? String(user.id) : "",
  });

  const [userList, setUserList] = useState<UserRow[]>(
    users.map((user) => normalizeUser(user))
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

  const isInvalidId = (id?: string) => !id || id === "undefined";

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
          : "Unable to create staff account"
      );
    }
  };

  const startEdit = (user: UserRow) => {
    setSelectedUser(user);
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
      setUserList((prev) =>
        prev.map((user) => (user.id === updated.id ? updated : user))
      );
      setSelectedUser(updated);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update staff"
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
      setUserList((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
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
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update status"
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
      setUserList((prev) =>
        prev.map((user) => (user.id === userId ? updated : user))
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update role"
      );
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="container py-8">
      <div className="space-y-6">
        <Card className="">
          <CardHeader>
            <CardTitle>Create Staff Account</CardTitle>
            <CardDescription>
              Add a new staff member and assign a starting role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="staff-full-name">Full Name</Label>
                <Input
                  id="staff-full-name"
                  value={createForm.full_name}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      full_name: event.target.value,
                    }))
                  }
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-email">Email</Label>
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
                  placeholder="jane@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-phone">Phone</Label>
                <Input
                  id="staff-phone"
                  value={createForm.phone}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="+1 555 0100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-role">Role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      role: value as Role,
                    }))
                  }
                >
                  <SelectTrigger id="staff-role" className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-password">Temporary Password</Label>
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
                  placeholder="Set a temporary password"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={createForm.is_active}
                  onCheckedChange={(checked) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      is_active: checked,
                    }))
                  }
                />
                <span className="text-sm text-muted-foreground">
                  Active account
                </span>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleCreateUser}>Create Staff</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader>
            <CardTitle>Staff Directory</CardTitle>
            <CardDescription>
              Search, filter, and manage staff accounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {actionError && (
              <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
                {actionError}
              </div>
            )}

            <div className="mb-4 grid gap-3 md:grid-cols-4">
              <Input
                placeholder="Search by name, email, or phone"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">SuperAdmin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort by name</SelectItem>
                  <SelectItem value="created">Sort by created date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sortedUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {row.full_name || "User"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {row.phone || "No phone"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.role === "staff" ? "secondary" : "outline"
                            }
                          >
                            {row.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={row.is_active ? "default" : "destructive"}
                          >
                            {row.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.created_at
                            ? format(new Date(row.created_at), "MMM d, yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(row)}
                              disabled={hasInvalidId}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant={row.is_active ? "outline" : "default"}
                              disabled={actionId === row.id || hasInvalidId}
                              onClick={() => handleStatusToggle(row)}
                            >
                              {row.is_active ? "Deactivate" : "Activate"}
                            </Button>
                            {isLocked || isSelf || hasInvalidId ? (
                              <span className="text-xs text-muted-foreground self-center">
                                {isSelf
                                  ? "You"
                                  : hasInvalidId
                                  ? "Missing ID"
                                  : "Locked"}
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant={
                                    row.role === "customer"
                                      ? "default"
                                      : "outline"
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
                                  variant={
                                    row.role === "staff" ? "default" : "outline"
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
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">No users found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedUser && (
          <Card className="">
            <CardHeader>
              <CardTitle>Staff Details</CardTitle>
              <CardDescription>
                Update profile details, status, and role assignments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-full-name">Full Name</Label>
                  <Input
                    id="edit-full-name"
                    value={editForm.full_name}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        full_name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        phone: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
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
                    <SelectTrigger id="edit-role" className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    checked={editForm.is_active}
                    onCheckedChange={(checked) =>
                      setEditForm((prev) => ({
                        ...prev,
                        is_active: checked,
                      }))
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    Active account
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Editing: {selectedUser.full_name || selectedUser.email}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedUser(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateUser}
                    disabled={actionId === selectedUser.id}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
