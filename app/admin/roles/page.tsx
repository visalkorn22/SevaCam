import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  ShieldAlert,
  User,
  Users,
  Briefcase,
  ArrowRight,
} from "lucide-react";

type MeUser = {
  id: string;
  role: "customer" | "staff" | "admin" | "superadmin";
};

type UserRow = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
};

type RoleCounts = {
  customer: number;
  staff: number;
  admin: number;
  superadmin: number;
};

async function getMe(): Promise<MeUser | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  const res = await fetch(`${apiUrl}/api/auth/me`, {
    headers: { Cookie: cookie },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as MeUser;
}

async function getAllUsers(cookie: string): Promise<UserRow[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/api/users`, {
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const ROLE_META: Record<
  string,
  { label: string; icon: React.ElementType; description: string; color: string }
> = {
  superadmin: {
    label: "Super Admin",
    icon: ShieldAlert,
    description: "Full system access. Can manage admins, view audit logs, and configure the system.",
    color: "text-red-500",
  },
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    description: "Manage services, staff, bookings, and view analytics. Cannot access system settings.",
    color: "text-primary",
  },
  staff: {
    label: "Staff",
    icon: Briefcase,
    description: "Manage their assigned services and availability. Can view their bookings.",
    color: "text-blue-500",
  },
  customer: {
    label: "Customer",
    icon: User,
    description: "Book services, view their own bookings and payment history.",
    color: "text-muted-foreground",
  },
};

function RoleCard({
  role,
  count,
  users,
}: {
  role: string;
  count: number;
  users: UserRow[];
}) {
  const meta = ROLE_META[role] ?? { label: role, icon: User, description: "", color: "text-muted-foreground" };
  const Icon = meta.icon;
  const preview = users.slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className={`flex items-center gap-2 text-base ${meta.color}`}>
            <Icon className="h-4 w-4" />
            {meta.label}
          </span>
          <Badge variant="outline" className="text-sm font-semibold">
            {count}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{meta.description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {preview.length > 0 ? (
          <>
            {preview.map((u) => (
              <div key={u.id} className="flex items-center gap-2 text-sm">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase">
                  {(u.full_name ?? u.email).slice(0, 2)}
                </span>
                <span className="min-w-0 truncate text-muted-foreground">
                  {u.full_name ?? u.email}
                </span>
                {!u.is_active && (
                  <Badge variant="outline" className="ml-auto text-[10px]">inactive</Badge>
                )}
              </div>
            ))}
            {count > 3 && (
              <p className="text-xs text-muted-foreground">+{count - 3} more</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No users with this role.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function RoleManagementPage() {
  const cookie = (await headers()).get("cookie") ?? "";
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "admin" && me.role !== "superadmin") redirect("/dashboard");

  const users = await getAllUsers(cookie);

  const counts: RoleCounts = { customer: 0, staff: 0, admin: 0, superadmin: 0 };
  const byRole: Record<string, UserRow[]> = { customer: [], staff: [], admin: [], superadmin: [] };

  for (const u of users) {
    const r = u.role as keyof RoleCounts;
    if (r in counts) {
      counts[r]++;
      byRole[r].push(u);
    }
  }

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Role Management</h2>
        <p className="text-muted-foreground">
          Overview of all roles and their current assignments.
        </p>
      </div>

      {/* Summary bar */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-6 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{totalUsers} total users</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {activeUsers} active · {totalUsers - activeUsers} inactive
          </div>
          {me.role === "superadmin" && (
            <Button asChild variant="outline" size="sm" className="ml-auto gap-1 text-xs">
              <Link href="/admin/admins">
                Manage Admins <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className={me.role !== "superadmin" ? "ml-auto" : ""} style={{ gap: "0.25rem", fontSize: "0.75rem" }}>
            <Link href="/admin/staff">
              Manage Staff <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["superadmin", "admin", "staff", "customer"] as const).map((role) => (
          <RoleCard
            key={role}
            role={role}
            count={counts[role]}
            users={byRole[role]}
          />
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="mb-2 text-sm font-semibold">Role Hierarchy</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="destructive" className="gap-1 text-xs">
            <ShieldAlert className="h-3 w-3" /> SuperAdmin
          </Badge>
          <span>›</span>
          <Badge variant="default" className="gap-1 text-xs">
            <ShieldCheck className="h-3 w-3" /> Admin
          </Badge>
          <span>›</span>
          <Badge variant="secondary" className="gap-1 text-xs">
            <Briefcase className="h-3 w-3" /> Staff
          </Badge>
          <span>›</span>
          <Badge variant="outline" className="gap-1 text-xs">
            <User className="h-3 w-3" /> Customer
          </Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Role promotions require SuperAdmin access. Only one Admin and one SuperAdmin are allowed at a time.
        </p>
      </div>
    </DashboardLayout>
  );
}
