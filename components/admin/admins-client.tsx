"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, User, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type StaffUser = {
  id: string;
  full_name: string | null;
  email: string;
  role: "staff" | "admin" | "superadmin";
  phone: string | null;
  is_active: boolean;
};

function roleBadgeVariant(role: string): "default" | "secondary" | "destructive" | "outline" {
  if (role === "superadmin") return "destructive";
  if (role === "admin") return "default";
  return "secondary";
}

function roleIcon(role: string) {
  if (role === "superadmin") return <ShieldAlert className="h-3.5 w-3.5" />;
  if (role === "admin") return <ShieldCheck className="h-3.5 w-3.5" />;
  return <User className="h-3.5 w-3.5" />;
}

async function patchRole(userId: string, newRole: string): Promise<{ ok: boolean; error?: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/api/users/${userId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data?.detail ?? "Failed to update role" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export function AdminsClient({
  users,
  currentUserId,
}: {
  users: StaffUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const admins = users.filter((u) => u.role === "admin" || u.role === "superadmin");
  const staff = users.filter((u) => u.role === "staff");

  async function handlePromote(user: StaffUser, targetRole: "admin" | "staff") {
    setError(null);
    setLoadingId(user.id);
    const result = await patchRole(user.id, targetRole);
    setLoadingId(null);
    if (!result.ok) {
      setError(result.error ?? "Unknown error");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Admins */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Administrators ({admins.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {admins.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">No admins found.</p>
          ) : (
            <div className="divide-y divide-border">
              {admins.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                      {(user.full_name ?? user.email).slice(0, 2)}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{user.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={roleBadgeVariant(user.role)} className="gap-1 capitalize text-xs">
                      {roleIcon(user.role)}
                      {user.role}
                    </Badge>
                    {user.role === "admin" && user.id !== currentUserId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={loadingId === user.id || pending}
                        onClick={() => handlePromote(user, "staff")}
                      >
                        {loadingId === user.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Demote to Staff"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staff — can be promoted */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Staff Members ({staff.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {staff.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">No staff members found.</p>
          ) : (
            <div className="divide-y divide-border">
              {staff.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                      {(user.full_name ?? user.email).slice(0, 2)}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{user.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <User className="h-3 w-3" />
                      Staff
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={loadingId === user.id || pending}
                      onClick={() => handlePromote(user, "admin")}
                    >
                      {loadingId === user.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Promote to Admin"
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Only one Admin and one SuperAdmin are allowed at a time. SuperAdmin cannot be changed from this page.
      </p>
    </div>
  );
}
