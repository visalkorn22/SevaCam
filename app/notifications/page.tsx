import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, MessageSquare, CheckCircle2, XCircle, Clock } from "lucide-react";

type MeUser = {
  id: string;
  email: string;
  role: "customer" | "staff" | "admin" | "superadmin";
};

type Notification = {
  id: string;
  booking_id: string;
  channel: string;
  type: string;
  recipient: string;
  status: string;
  sent_at: string | null;
  created_at: string | null;
};

async function getMe(): Promise<MeUser | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  const res = await fetch(`${apiUrl}/api/auth/me`, {
    method: "GET",
    headers: { Cookie: cookie },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as MeUser;
}

async function getMyNotifications(cookie: string): Promise<Notification[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/api/notifications/me`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as Notification[];
  } catch {
    return [];
  }
}

function channelIcon(channel: string) {
  if (channel === "email") return <Mail className="h-4 w-4" />;
  if (channel === "sms") return <MessageSquare className="h-4 w-4" />;
  return <Bell className="h-4 w-4" />;
}

function statusIcon(status: string) {
  if (status === "sent") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5 text-red-500" />;
  return <Clock className="h-3.5 w-3.5 text-amber-500" />;
}

function typeBadgeVariant(type: string): "default" | "secondary" | "destructive" | "outline" {
  if (type === "confirmation") return "default";
  if (type === "cancellation") return "destructive";
  if (type === "reminder") return "secondary";
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

export default async function NotificationsPage() {
  const cookie = (await headers()).get("cookie") ?? "";
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role === "admin" || me.role === "superadmin") redirect("/admin/dashboard");

  const notifications = await getMyNotifications(cookie);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
        <p className="text-muted-foreground">
          Your booking updates, reminders, and alerts.
        </p>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Booking confirmations, reminders, and updates will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className="transition-colors hover:bg-muted/30">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      {channelIcon(n.channel)}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={typeBadgeVariant(n.type)} className="capitalize text-xs">
                          {n.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">{n.channel}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {statusIcon(n.status)}
                          {n.status}
                        </span>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        Booking <span className="font-mono text-xs">{n.booking_id.slice(0, 8)}…</span>
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(n.sent_at ?? n.created_at)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
        </p>
      </div>
    </DashboardLayout>
  );
}
