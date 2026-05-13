import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ShieldAlert, Pencil, Trash2, Plus } from "lucide-react";

type MeUser = {
  id: string;
  role: "customer" | "staff" | "admin" | "superadmin";
};

type AuditLog = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  created_at: string | null;
};

type AuditLogsResponse = {
  total: number;
  items: AuditLog[];
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

async function getAuditLogs(cookie: string, limit = 50): Promise<AuditLogsResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/api/admin/audit-logs?limit=${limit}`, {
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!res.ok) return { total: 0, items: [] };
    return (await res.json()) as AuditLogsResponse;
  } catch {
    return { total: 0, items: [] };
  }
}

function actionIcon(action: string) {
  if (action === "create") return <Plus className="h-3.5 w-3.5" />;
  if (action === "update") return <Pencil className="h-3.5 w-3.5" />;
  if (action === "delete") return <Trash2 className="h-3.5 w-3.5" />;
  return <ShieldAlert className="h-3.5 w-3.5" />;
}

function actionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action === "create") return "default";
  if (action === "update") return "secondary";
  if (action === "delete") return "destructive";
  return "outline";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AuditLogsPage() {
  const cookie = (await headers()).get("cookie") ?? "";
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "superadmin") redirect("/dashboard");

  const { total, items } = await getAuditLogs(cookie);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
        <p className="text-muted-foreground">
          Review all administrative actions across the system.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <FileText className="h-4 w-4" />
        <span>{total} total event{total !== 1 ? "s" : ""}</span>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No audit events yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Administrative actions will be logged here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity Feed</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {items.map((log) => (
                <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    {actionIcon(log.action)}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={actionVariant(log.action)} className="capitalize text-xs gap-1">
                        {actionIcon(log.action)}
                        {log.action}
                      </Badge>
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs capitalize text-muted-foreground">
                        {log.entity_type}
                      </span>
                      {log.entity_id && (
                        <span className="font-mono text-xs text-muted-foreground/60">
                          {log.entity_id.slice(0, 8)}…
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      by{" "}
                      <span className="font-medium text-foreground">
                        {log.actor_name ?? log.actor_email ?? "system"}
                      </span>
                      {log.actor_email && log.actor_name && (
                        <span className="ml-1 text-xs text-muted-foreground/60">({log.actor_email})</span>
                      )}
                    </p>

                    {log.changes && Object.keys(log.changes).length > 0 && (
                      <details className="group mt-1">
                        <summary className="cursor-pointer text-xs text-muted-foreground/70 hover:text-muted-foreground list-none flex items-center gap-1">
                          <span className="group-open:hidden">▶ Show changes</span>
                          <span className="hidden group-open:inline">▼ Hide changes</span>
                        </summary>
                        <pre className="mt-2 overflow-auto rounded bg-muted p-3 text-xs text-muted-foreground">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>

                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
