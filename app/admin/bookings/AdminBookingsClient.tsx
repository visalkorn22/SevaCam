"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Mail,
  Phone,
  RefreshCcw,
  Search,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type AdminBooking = {
  id: string;
  start_time_utc: string;
  status: string;
  payment_status: string;
  service: {
    id?: string | null;
    name?: string | null;
    price?: number | string | null;
    duration_minutes?: number | null;
  };
  staff?: {
    id?: string | null;
    full_name?: string | null;
  };
  customer?: {
    id?: string | null;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
};

type BookingLogRow = {
  id: string;
  booking_id: string;
  action: string;
  performed_by?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
};

type BookingChangeRow = {
  id: string;
  booking_id: string;
  old_start_time?: string | null;
  new_start_time?: string | null;
  change_type: string;
  changed_by?: string | null;
  reason?: string | null;
  created_at: string;
};

type AvailableSlot = {
  start_time: string;
  end_time: string;
  staff_id: string;
  staff_name?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No-show",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

const formatStatusLabel = (value: string | null | undefined) => {
  if (!value) return "Unknown";
  return (
    STATUS_LABELS[value] ||
    value
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
};

const formatDateTime = (value: string) =>
  format(new Date(value), "MMM d, yyyy 'at' h:mm a");

const formatDateOnly = (value: string) =>
  format(new Date(value), "MMM d, yyyy");

const formatTime = (value: string) => format(new Date(value), "h:mm a");

const formatMoney = (value: number | string | null | undefined) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "$0.00";
  return `$${amount.toFixed(2)}`;
};

const isTerminalStatus = (status: string) =>
  ["cancelled", "completed", "no-show"].includes(status);

const statusBadgeVariant = (status: string) => {
  if (status === "confirmed" || status === "completed") return "default";
  if (status === "cancelled" || status === "no-show") return "destructive";
  return "secondary";
};

const paymentBadgeVariant = (status: string) => {
  if (status === "paid") return "default";
  if (status === "failed" || status === "refunded") return "destructive";
  return "outline";
};

const formatDetailKey = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDetailValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function AdminBookingsClient({
  initialBookings,
}: {
  initialBookings: AdminBooking[];
}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [bookings, setBookings] = useState<AdminBooking[]>(initialBookings);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const [detailsBooking, setDetailsBooking] = useState<AdminBooking | null>(
    null,
  );
  const [detailsLogs, setDetailsLogs] = useState<BookingLogRow[]>([]);
  const [detailsChanges, setDetailsChanges] = useState<BookingChangeRow[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  const [rescheduleBooking, setRescheduleBooking] =
    useState<AdminBooking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailableSlot[]>([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState("");

  const [cancelBooking, setCancelBooking] = useState<AdminBooking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    setBookings(initialBookings);
  }, [initialBookings]);

  const syncOpenBookings = (nextBookings: AdminBooking[]) => {
    const pickCurrent = (current: AdminBooking | null) => {
      if (!current) return null;
      return nextBookings.find((item) => item.id === current.id) || current;
    };

    setDetailsBooking((current) => pickCurrent(current));
    setRescheduleBooking((current) => pickCurrent(current));
    setCancelBooking((current) => pickCurrent(current));
  };

  const loadBookings = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/admin/bookings`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Unable to load bookings");
      }

      const data = (await res.json()) as AdminBooking[];
      setBookings(data);
      syncOpenBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load bookings");
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadBookingTimeline = async (bookingId: string) => {
    setDetailsLoading(true);
    setDetailsError(null);

    try {
      const [logsRes, changesRes] = await Promise.all([
        fetch(`${apiUrl}/api/bookings/${bookingId}/logs`, {
          credentials: "include",
        }),
        fetch(`${apiUrl}/api/bookings/${bookingId}/changes`, {
          credentials: "include",
        }),
      ]);

      const logsData = logsRes.ok
        ? ((await logsRes.json()) as BookingLogRow[])
        : [];
      const changesData = changesRes.ok
        ? ((await changesRes.json()) as BookingChangeRow[])
        : [];

      setDetailsLogs(logsData);
      setDetailsChanges(changesData);
    } catch (err) {
      setDetailsError(
        err instanceof Error ? err.message : "Unable to load booking history",
      );
      setDetailsLogs([]);
      setDetailsChanges([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openDetails = async (booking: AdminBooking) => {
    setDetailsBooking(booking);
    await loadBookingTimeline(booking.id);
  };

  const openReschedule = (booking: AdminBooking) => {
    setRescheduleBooking(booking);
    setRescheduleDate(format(new Date(booking.start_time_utc), "yyyy-MM-dd"));
    setSelectedSlot("");
    setRescheduleError(null);
  };

  useEffect(() => {
    const loadSlots = async () => {
      if (
        !rescheduleBooking ||
        !rescheduleDate ||
        !rescheduleBooking.service?.id ||
        !rescheduleBooking.staff?.id
      ) {
        setRescheduleSlots([]);
        return;
      }

      setRescheduleLoading(true);
      setRescheduleError(null);

      try {
        const params = new URLSearchParams({
          service_id: rescheduleBooking.service.id,
          staff_id: rescheduleBooking.staff.id,
          date: rescheduleDate,
          timezone,
        });

        const res = await fetch(
          `${apiUrl}/api/availability/slots-v2?${params.toString()}`,
          {
            credentials: "include",
          },
        );

        if (!res.ok) {
          throw new Error("Unable to load available slots");
        }

        const data = (await res.json()) as AvailableSlot[];
        setRescheduleSlots(data);
      } catch (err) {
        setRescheduleSlots([]);
        setRescheduleError(
          err instanceof Error ? err.message : "Unable to load available slots",
        );
      } finally {
        setRescheduleLoading(false);
      }
    };

    void loadSlots();
  }, [apiUrl, rescheduleBooking, rescheduleDate, timezone]);

  useEffect(() => {
    setSelectedSlot("");
  }, [rescheduleDate, rescheduleBooking?.id]);

  const handleStatusUpdate = async (
    booking: AdminBooking,
    nextStatus: "confirmed" | "completed" | "no-show",
  ) => {
    setStatusLoadingId(booking.id);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/bookings/${booking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.detail || "Unable to update booking status");
      }

      await loadBookings();
      if (detailsBooking?.id === booking.id) {
        await loadBookingTimeline(booking.id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update booking status",
      );
    } finally {
      setStatusLoadingId(null);
    }
  };

  const submitReschedule = async () => {
    if (!rescheduleBooking || !selectedSlot) return;

    setRescheduleLoading(true);
    setRescheduleError(null);

    try {
      const res = await fetch(
        `${apiUrl}/api/bookings/${rescheduleBooking.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ start_time_utc: selectedSlot }),
        },
      );

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.detail || "Unable to reschedule booking");
      }

      const bookingId = rescheduleBooking.id;
      setRescheduleBooking(null);
      setSelectedSlot("");
      await loadBookings();
      if (detailsBooking?.id === bookingId) {
        await loadBookingTimeline(bookingId);
      }
    } catch (err) {
      setRescheduleError(
        err instanceof Error ? err.message : "Unable to reschedule booking",
      );
    } finally {
      setRescheduleLoading(false);
    }
  };

  const submitCancel = async () => {
    if (!cancelBooking) return;

    setCancelLoading(true);
    setError(null);

    try {
      const reason = cancelReason.trim();
      const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
      const res = await fetch(
        `${apiUrl}/api/bookings/${cancelBooking.id}${query}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!res.ok) {
        throw new Error("Unable to cancel booking");
      }

      const bookingId = cancelBooking.id;
      setCancelBooking(null);
      setCancelReason("");
      await loadBookings();
      if (detailsBooking?.id === bookingId) {
        await loadBookingTimeline(bookingId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel booking");
    } finally {
      setCancelLoading(false);
    }
  };

  const paymentStatuses = useMemo(
    () =>
      Array.from(
        new Set(
          bookings
            .map((booking) => booking.payment_status)
            .filter((status): status is string => Boolean(status)),
        ),
      ).sort(),
    [bookings],
  );

  const summary = useMemo(() => {
    const paid = bookings.filter(
      (booking) => booking.payment_status === "paid",
    ).length;
    const pending = bookings.filter(
      (booking) => booking.status === "pending",
    ).length;
    const confirmed = bookings.filter(
      (booking) => booking.status === "confirmed",
    ).length;
    const attention = bookings.filter(
      (booking) =>
        booking.status === "no-show" || booking.payment_status === "failed",
    ).length;

    return {
      total: bookings.length,
      pending,
      confirmed,
      paid,
      attention,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = bookings.filter((booking) => {
      if (statusFilter !== "all" && booking.status !== statusFilter) {
        return false;
      }

      if (paymentFilter !== "all" && booking.payment_status !== paymentFilter) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        booking.id,
        booking.service?.name,
        booking.customer?.full_name,
        booking.customer?.email,
        booking.customer?.phone,
        booking.staff?.full_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    const now = Date.now();

    return result.sort((left, right) => {
      const leftTime = new Date(left.start_time_utc).getTime();
      const rightTime = new Date(right.start_time_utc).getTime();
      const leftFuture = leftTime >= now;
      const rightFuture = rightTime >= now;

      if (leftFuture && !rightFuture) return -1;
      if (!leftFuture && rightFuture) return 1;
      if (leftFuture && rightFuture) return leftTime - rightTime;
      return rightTime - leftTime;
    });
  }, [bookings, paymentFilter, search, statusFilter]);

  const renderActionButtons = (booking: AdminBooking) => {
    const isStatusUpdating = statusLoadingId === booking.id;
    const canReschedule = !isTerminalStatus(booking.status);
    const canCancel =
      booking.status !== "cancelled" &&
      booking.status !== "completed" &&
      booking.status !== "no-show";

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void openDetails(booking)}
        >
          View Details
        </Button>

        {booking.status === "pending" ? (
          <Button
            size="sm"
            onClick={() => void handleStatusUpdate(booking, "confirmed")}
            disabled={isStatusUpdating}
          >
            {isStatusUpdating ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Confirm
          </Button>
        ) : null}

        {booking.status === "confirmed" ? (
          <>
            <Button
              size="sm"
              onClick={() => void handleStatusUpdate(booking, "completed")}
              disabled={isStatusUpdating}
            >
              {isStatusUpdating ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Complete
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handleStatusUpdate(booking, "no-show")}
              disabled={isStatusUpdating}
            >
              {isStatusUpdating ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              No-show
            </Button>
          </>
        ) : null}

        {canReschedule ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openReschedule(booking)}
            disabled={rescheduleLoading && rescheduleBooking?.id === booking.id}
          >
            Reschedule
          </Button>
        ) : null}

        {canCancel ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setCancelBooking(booking)}
            disabled={cancelLoading && cancelBooking?.id === booking.id}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-(--radius-md) bg-(--state-error-subtle) px-4 py-3 text-sm text-(--state-error)">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="">
          <CardHeader className="pb-2">
            <CardDescription>Total Bookings</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Calendar className="size-5 text-(--accent-primary)" />
              {summary.total}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="">
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl">{summary.pending}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="">
          <CardHeader className="pb-2">
            <CardDescription>Confirmed</CardDescription>
            <CardTitle className="text-2xl">{summary.confirmed}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="">
          <CardHeader className="pb-2">
            <CardDescription>Paid</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Wallet className="size-5 text-(--accent-primary)" />
              {summary.paid}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="">
          <CardHeader className="pb-2">
            <CardDescription>Needs Attention</CardDescription>
            <CardTitle className="text-2xl">{summary.attention}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Search by service, customer, staff, or booking ID.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_220px_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--text-secondary)" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search bookings..."
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no-show">No-show</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                {paymentStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => void loadBookings()}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <RefreshCcw className="size-4" />
              )}
              Refresh
            </Button>
          </div>

          <div className="flex items-center justify-between text-sm text-(--text-secondary)">
            <span>
              Showing {filteredBookings.length} of {bookings.length} bookings
            </span>
            {(search || statusFilter !== "all" || paymentFilter !== "all") && (
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setPaymentFilter("all");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {filteredBookings.length > 0 ? (
        <div className="grid gap-4">
          {filteredBookings.map((booking) => {
            const isPast =
              new Date(booking.start_time_utc).getTime() < Date.now();

            return (
              <Card
                key={booking.id}
                className={cn(
                  "border-border/50 bg-card/80 transition-colors",
                  isPast &&
                    booking.status === "pending" &&
                    "border-amber-500/40",
                )}
              >
                <CardHeader className="gap-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-xl">
                          {booking.service?.name || "Service"}
                        </CardTitle>
                        <Badge variant={statusBadgeVariant(booking.status)}>
                          {formatStatusLabel(booking.status)}
                        </Badge>
                        <Badge
                          variant={paymentBadgeVariant(booking.payment_status)}
                        >
                          {formatStatusLabel(booking.payment_status)}
                        </Badge>
                      </div>

                      <CardDescription className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="size-4" />
                          {formatDateTime(booking.start_time_utc)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="size-4" />
                          {booking.service?.duration_minutes || 0} mins
                        </span>
                        <span className="font-medium text-foreground">
                          {formatMoney(booking.service?.price)}
                        </span>
                      </CardDescription>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-2 text-right text-xs text-(--text-secondary)">
                      <div>Booking ID</div>
                      <div className="mt-1 font-mono text-foreground">
                        {booking.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">
                        Customer
                      </p>
                      <div className="mt-3 space-y-2 text-sm">
                        <p className="flex items-center gap-2 font-medium text-foreground">
                          <UserRound className="size-4 text-(--text-secondary)" />
                          {booking.customer?.full_name || "Customer"}
                        </p>
                        {booking.customer?.email ? (
                          <p className="flex items-center gap-2 text-(--text-secondary)">
                            <Mail className="size-4" />
                            {booking.customer.email}
                          </p>
                        ) : null}
                        {booking.customer?.phone ? (
                          <p className="flex items-center gap-2 text-(--text-secondary)">
                            <Phone className="size-4" />
                            {booking.customer.phone}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">
                        Staff
                      </p>
                      <div className="mt-3 space-y-2 text-sm">
                        <p className="flex items-center gap-2 font-medium text-foreground">
                          <UserRound className="size-4 text-(--text-secondary)" />
                          {booking.staff?.full_name || "Unassigned"}
                        </p>
                        <p className="text-(--text-secondary)">
                          Local timezone: {timezone}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">
                        Service
                      </p>
                      <div className="mt-3 space-y-2 text-sm">
                        <p className="font-medium text-foreground">
                          {booking.service?.name || "Service"}
                        </p>
                        <p className="text-(--text-secondary)">
                          Duration: {booking.service?.duration_minutes || 0}{" "}
                          mins
                        </p>
                        <p className="text-(--text-secondary)">
                          Price: {formatMoney(booking.service?.price)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">
                        Workflow
                      </p>
                      <div className="mt-3 space-y-2 text-sm">
                        <p className="font-medium text-foreground">
                          {isPast ? "Past booking" : "Upcoming booking"}
                        </p>
                        <p className="text-(--text-secondary)">
                          Payment: {formatStatusLabel(booking.payment_status)}
                        </p>
                        <p className="text-(--text-secondary)">
                          Status: {formatStatusLabel(booking.status)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {renderActionButtons(booking)}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <Calendar className="mb-4 size-12 text-(--text-secondary)" />
            <p className="text-lg font-semibold">
              No bookings match these filters
            </p>
            <p className="mt-2 text-sm text-(--text-secondary)">
              Try widening the search or clearing the active filters.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setPaymentFilter("all");
              }}
            >
              Reset filters
            </Button>
          </CardContent>
        </Card>
      )}

      <Sheet
        open={Boolean(detailsBooking)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsBooking(null);
            setDetailsLogs([]);
            setDetailsChanges([]);
            setDetailsError(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-xl"
        >
          <SheetHeader>
            <SheetTitle>Booking Details</SheetTitle>
            <SheetDescription>
              Review customer info, service details, and the full booking
              timeline.
            </SheetDescription>
          </SheetHeader>

          {detailsBooking ? (
            <div className="space-y-6 px-4 pb-8">
              <div className="rounded-3xl border border-border/60 bg-muted/30 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">
                    {detailsBooking.service?.name || "Service"}
                  </h2>
                  <Badge variant={statusBadgeVariant(detailsBooking.status)}>
                    {formatStatusLabel(detailsBooking.status)}
                  </Badge>
                  <Badge
                    variant={paymentBadgeVariant(detailsBooking.payment_status)}
                  >
                    {formatStatusLabel(detailsBooking.payment_status)}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-(--text-secondary)">
                  {formatDateTime(detailsBooking.start_time_utc)}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-background/80 p-4 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">
                      Customer
                    </p>
                    <p className="mt-2 font-medium">
                      {detailsBooking.customer?.full_name || "Customer"}
                    </p>
                    {detailsBooking.customer?.email ? (
                      <p className="mt-1 text-(--text-secondary)">
                        {detailsBooking.customer.email}
                      </p>
                    ) : null}
                    {detailsBooking.customer?.phone ? (
                      <p className="mt-1 text-(--text-secondary)">
                        {detailsBooking.customer.phone}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/80 p-4 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">
                      Service Info
                    </p>
                    <p className="mt-2 font-medium">
                      {formatMoney(detailsBooking.service?.price)}
                    </p>
                    <p className="mt-1 text-(--text-secondary)">
                      {detailsBooking.service?.duration_minutes || 0} minutes
                    </p>
                    <p className="mt-1 text-(--text-secondary)">
                      Staff: {detailsBooking.staff?.full_name || "Unassigned"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Actions</p>
                {renderActionButtons(detailsBooking)}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Change History</p>
                {detailsLoading ? (
                  <p className="flex items-center gap-2 text-sm text-(--text-secondary)">
                    <LoaderCircle className="size-4 animate-spin" />
                    Loading timeline...
                  </p>
                ) : detailsError ? (
                  <p className="text-sm text-destructive">{detailsError}</p>
                ) : detailsChanges.length === 0 ? (
                  <p className="text-sm text-(--text-secondary)">
                    No reschedule or cancellation history yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {detailsChanges.map((change) => (
                      <div
                        key={change.id}
                        className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">
                            {formatStatusLabel(change.change_type)}
                          </p>
                          <p className="text-xs text-(--text-secondary)">
                            {formatDateTime(change.created_at)}
                          </p>
                        </div>
                        {change.old_start_time && change.new_start_time ? (
                          <p className="mt-2 text-(--text-secondary)">
                            {formatDateOnly(change.old_start_time)}{" "}
                            {formatTime(change.old_start_time)} to{" "}
                            {formatDateOnly(change.new_start_time)}{" "}
                            {formatTime(change.new_start_time)}
                          </p>
                        ) : null}
                        {change.reason ? (
                          <p className="mt-2 text-(--text-secondary)">
                            Reason: {change.reason}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Activity Log</p>
                {detailsLoading ? null : detailsLogs.length === 0 ? (
                  <p className="text-sm text-(--text-secondary)">
                    No activity log recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {detailsLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">
                            {formatStatusLabel(log.action)}
                          </p>
                          <p className="text-xs text-(--text-secondary)">
                            {formatDateTime(log.created_at)}
                          </p>
                        </div>

                        {log.details && Object.keys(log.details).length > 0 ? (
                          <div className="mt-3 space-y-1 text-xs text-(--text-secondary)">
                            {Object.entries(log.details).map(([key, value]) => (
                              <p key={key}>
                                <span className="font-medium text-foreground">
                                  {formatDetailKey(key)}:
                                </span>{" "}
                                {formatDetailValue(value)}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(rescheduleBooking)}
        onOpenChange={(open) => {
          if (!open) {
            setRescheduleBooking(null);
            setRescheduleDate("");
            setSelectedSlot("");
            setRescheduleSlots([]);
            setRescheduleError(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle>Reschedule Booking</SheetTitle>
            <SheetDescription>
              Choose a new date and one of the available appointment slots.
            </SheetDescription>
          </SheetHeader>

          {rescheduleBooking ? (
            <div className="space-y-5 px-4 pb-8">
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <p className="text-sm font-semibold">
                  {rescheduleBooking.service?.name || "Service"}
                </p>
                <p className="mt-1 text-sm text-(--text-secondary)">
                  Current time:{" "}
                  {formatDateTime(rescheduleBooking.start_time_utc)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">New date</label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(event) => setRescheduleDate(event.target.value)}
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Available times</p>
                {rescheduleLoading ? (
                  <p className="flex items-center gap-2 text-sm text-(--text-secondary)">
                    <LoaderCircle className="size-4 animate-spin" />
                    Loading slots...
                  </p>
                ) : rescheduleSlots.length === 0 ? (
                  <p className="text-sm text-(--text-secondary)">
                    No slots found for that date. Try another day.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {rescheduleSlots.map((slot) => (
                      <button
                        key={slot.start_time}
                        type="button"
                        onClick={() => setSelectedSlot(slot.start_time)}
                        className={cn(
                          "rounded-full border px-3 py-2 text-sm font-semibold transition",
                          selectedSlot === slot.start_time
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:border-primary",
                        )}
                      >
                        {formatTime(slot.start_time)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {rescheduleError ? (
                <p className="text-sm text-destructive">{rescheduleError}</p>
              ) : null}

              <SheetFooter>
                <Button
                  onClick={submitReschedule}
                  disabled={!selectedSlot || rescheduleLoading}
                >
                  {rescheduleLoading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : null}
                  Confirm Reschedule
                </Button>
              </SheetFooter>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(cancelBooking)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelBooking(null);
            setCancelReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the booking as cancelled and store the optional
              reason in the audit history.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            {cancelBooking ? (
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
                <p className="font-medium">
                  {cancelBooking.service?.name || "Service"}
                </p>
                <p className="mt-1 text-(--text-secondary)">
                  {cancelBooking.customer?.full_name || "Customer"} on{" "}
                  {formatDateTime(cancelBooking.start_time_utc)}
                </p>
              </div>
            ) : null}

            <Textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Optional cancellation reason"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelLoading}>
              Keep booking
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={submitCancel}
              disabled={cancelLoading}
            >
              {cancelLoading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              Cancel booking
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
