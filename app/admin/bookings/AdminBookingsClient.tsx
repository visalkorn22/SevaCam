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
import { Button } from "@/components/ui/button";
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

const formatDetailKey = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDetailValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const panelClass =
  "rounded-[1.1rem] border border-[rgba(240,238,235,0.08)] bg-[#1c1b1b] text-[#f0eeeb] shadow-[0_8px_32px_rgba(0,0,0,0.35)]";
const insetPanelClass =
  "rounded-[0.8rem] border border-[rgba(240,238,235,0.08)] bg-[#171717]";
const fieldClass =
  "h-10 rounded-[0.55rem] border border-[rgba(240,238,235,0.08)] bg-[#171717] text-[#f0eeeb] placeholder:text-[#8a837c] focus-visible:border-[rgba(122,213,221,0.4)] focus-visible:ring-1 focus-visible:ring-[#7ad5dd]";
const triggerClass =
  "h-10 rounded-[0.55rem] border border-[rgba(240,238,235,0.08)] bg-[#171717] text-[#f0eeeb] data-[placeholder]:text-[#8a837c]";
const primaryButtonClass =
  "sevacam-primary-button h-10 rounded-[0.45rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.16em]";
const secondaryButtonClass =
  "h-10 rounded-[0.55rem] border border-[rgba(240,238,235,0.08)] bg-[#171717] px-4 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#f0eeeb] transition-colors hover:border-[rgba(122,213,221,0.3)] hover:text-[#7ad5dd]";
const actionButtonClass =
  "h-8 rounded-[0.5rem] border border-[rgba(240,238,235,0.08)] bg-[#171717] px-3 text-[0.56rem] font-semibold uppercase tracking-[0.16em] text-[#c7c2bb] transition-colors hover:border-[rgba(122,213,221,0.3)] hover:text-[#7ad5dd]";
const actionPrimaryClass =
  "sevacam-primary-button h-8 rounded-[0.5rem] px-3 text-[0.56rem] font-semibold uppercase tracking-[0.16em] shadow-none";
const actionWarmClass =
  "h-8 rounded-[0.5rem] border border-[#ffb785]/30 bg-[#ffb785]/10 px-3 text-[0.56rem] font-semibold uppercase tracking-[0.16em] text-[#ffcfaf] transition-colors hover:bg-[#ffb785]/14";
const actionDangerClass =
  "h-8 rounded-[0.5rem] border border-[rgba(255,125,125,0.24)] bg-[rgba(255,125,125,0.10)] px-3 text-[0.56rem] font-semibold uppercase tracking-[0.16em] text-[#ff9c9c] transition-colors hover:bg-[rgba(255,125,125,0.14)]";

const statusChipClass = (status: string) => {
  if (status === "confirmed" || status === "completed") {
    return "border-[rgba(122,213,221,0.3)] bg-[rgba(122,213,221,0.10)] text-[#7ad5dd]";
  }
  if (status === "pending") {
    return "border-[#ffb785]/30 bg-[#ffb785]/10 text-[#ffb785]";
  }
  if (status === "cancelled" || status === "no-show") {
    return "border-[rgba(255,125,125,0.24)] bg-[rgba(255,125,125,0.10)] text-[#ff9c9c]";
  }
  return "border-[rgba(240,238,235,0.08)] bg-[#171717] text-[#c7c2bb]";
};

const paymentChipClass = (status: string) => {
  if (status === "paid") {
    return "border-[rgba(122,213,221,0.3)] bg-[rgba(122,213,221,0.10)] text-[#7ad5dd]";
  }
  if (status === "failed") {
    return "border-[rgba(255,125,125,0.24)] bg-[rgba(255,125,125,0.10)] text-[#ff9c9c]";
  }
  if (status === "refunded") {
    return "border-[#ffb785]/30 bg-[#ffb785]/10 text-[#ffb785]";
  }
  return "border-[rgba(240,238,235,0.08)] bg-[#171717] text-[#c7c2bb]";
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

  const renderActionButtons = (
    booking: AdminBooking,
    options?: { includeDetails?: boolean },
  ) => {
    const includeDetails = options?.includeDetails ?? true;
    const isStatusUpdating = statusLoadingId === booking.id;
    const canReschedule = !isTerminalStatus(booking.status);
    const canCancel =
      booking.status !== "cancelled" &&
      booking.status !== "completed" &&
      booking.status !== "no-show";

    return (
      <div className="flex flex-wrap gap-2">
        {includeDetails ? (
          <Button
            size="sm"
            variant="ghost"
            className={actionButtonClass}
            onClick={() => void openDetails(booking)}
          >
            View Details
          </Button>
        ) : null}

        {booking.status === "pending" ? (
          <Button
            size="sm"
            variant="ghost"
            className={actionPrimaryClass}
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
              variant="ghost"
              className={actionPrimaryClass}
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
              variant="ghost"
              className={actionWarmClass}
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
            variant="ghost"
            className={actionButtonClass}
            onClick={() => openReschedule(booking)}
            disabled={rescheduleLoading && rescheduleBooking?.id === booking.id}
          >
            Reschedule
          </Button>
        ) : null}

        {canCancel ? (
          <Button
            size="sm"
            variant="ghost"
            className={actionDangerClass}
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
        <div className="rounded-[0.8rem] border border-[#ffb785]/25 bg-[#ffb785]/10 px-4 py-3 text-sm text-[#ffcfaf]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {/* Total Bookings — teal */}
        <div className="relative overflow-hidden rounded-[0.9rem] border border-[rgba(122,213,221,0.2)] bg-[rgba(122,213,221,0.07)] p-4">
          <div className="absolute inset-x-0 top-0 h-[2.5px] bg-[var(--seva-accent)]" />
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[rgba(122,213,221,0.08)] blur-xl" />
          <p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-[var(--seva-accent)]">Total Bookings</p>
          <div className="mt-3 flex items-center gap-2">
            <Calendar className="size-4 text-[var(--seva-accent)]" />
            <span className="text-[1.65rem] font-medium leading-none tracking-[-0.05em] text-(--text-primary)">{summary.total}</span>
          </div>
        </div>

        {/* Pending — warm/amber */}
        <div className="relative overflow-hidden rounded-[0.9rem] border border-[rgba(255,183,133,0.2)] bg-[rgba(255,183,133,0.07)] p-4">
          <div className="absolute inset-x-0 top-0 h-[2.5px] bg-[var(--seva-warm)]" />
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[rgba(255,183,133,0.08)] blur-xl" />
          <p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-[var(--seva-warm)]">Pending</p>
          <span className="mt-3 block text-[1.65rem] font-medium leading-none tracking-[-0.05em] text-[var(--seva-warm)]">{summary.pending}</span>
        </div>

        {/* Confirmed — violet */}
        <div className="relative overflow-hidden rounded-[0.9rem] border border-[rgba(196,176,253,0.2)] bg-[rgba(196,176,253,0.07)] p-4">
          <div className="absolute inset-x-0 top-0 h-[2.5px] bg-[var(--seva-violet)]" />
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[rgba(196,176,253,0.08)] blur-xl" />
          <p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-[var(--seva-violet)]">Confirmed</p>
          <span className="mt-3 block text-[1.65rem] font-medium leading-none tracking-[-0.05em] text-[var(--seva-violet)]">{summary.confirmed}</span>
        </div>

        {/* Paid — teal */}
        <div className="relative overflow-hidden rounded-[0.9rem] border border-[rgba(122,213,221,0.2)] bg-[rgba(122,213,221,0.07)] p-4">
          <div className="absolute inset-x-0 top-0 h-[2.5px] bg-[var(--seva-accent)]" />
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[rgba(122,213,221,0.08)] blur-xl" />
          <p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-[var(--seva-accent)]">Paid</p>
          <div className="mt-3 flex items-center gap-2">
            <Wallet className="size-4 text-[var(--seva-accent)]" />
            <span className="text-[1.65rem] font-medium leading-none tracking-[-0.05em] text-(--text-primary)">{summary.paid}</span>
          </div>
        </div>

        {/* Needs Attention — rose */}
        <div className="relative overflow-hidden rounded-[0.9rem] border border-[rgba(249,168,196,0.2)] bg-[rgba(249,168,196,0.07)] p-4">
          <div className="absolute inset-x-0 top-0 h-[2.5px] bg-[var(--seva-rose)]" />
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[rgba(249,168,196,0.08)] blur-xl" />
          <p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-[var(--seva-rose)]">Needs Attention</p>
          <span className="mt-3 block text-[1.65rem] font-medium leading-none tracking-[-0.05em] text-[var(--seva-rose)]">{summary.attention}</span>
        </div>
      </div>

      <div className="sevacam-rail overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-white/5 px-5 py-4">
          <div>
            <p className="sevacam-eyebrow">Filters</p>
            <p className="mt-1 text-[0.76rem] text-(--seva-text-muted)">
              Search by service, customer, staff, or booking ID.
            </p>
          </div>
          <Button
            variant="ghost"
            className={secondaryButtonClass}
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
        <div className="space-y-4 p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--text-disabled)" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search bookings..."
                className={`${fieldClass} pl-9`}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={triggerClass}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="border border-(--border-subtle) bg-(--bg-elevated) text-(--text-primary)">
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no-show">No-show</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className={triggerClass}>
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent className="border border-(--border-subtle) bg-(--bg-elevated) text-(--text-primary)">
                <SelectItem value="all">All payments</SelectItem>
                {paymentStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between text-[0.78rem] text-(--text-secondary)">
            <span>
              Showing <span className="font-semibold text-(--text-primary)">{filteredBookings.length}</span> of {bookings.length} bookings
            </span>
            {(search || statusFilter !== "all" || paymentFilter !== "all") && (
              <button
                type="button"
                className="font-semibold text-(--accent-primary) hover:underline"
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
        </div>
      </div>

      {filteredBookings.length > 0 ? (
        <div className="overflow-hidden rounded-[1.1rem] border border-(--border-subtle) bg-(--bg-elevated) shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
          {filteredBookings.map((booking, idx) => {
            const isPast = new Date(booking.start_time_utc).getTime() < Date.now();
            const isLast = idx === filteredBookings.length - 1;

            return (
              <button
                key={booking.id}
                type="button"
                onClick={() => void openDetails(booking)}
                className={cn(
                  "flex w-full cursor-pointer flex-col gap-2 px-5 py-4 text-left transition-colors hover:bg-(--bg-inset)/50 sm:flex-row sm:items-center sm:justify-between",
                  !isLast && "border-b border-(--border-subtle)",
                  isPast && booking.status === "pending" && "border-l-2 border-l-[#ffb785]/60",
                )}
              >
                {/* Left: identity */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-(--text-primary)">
                      {booking.service?.name || "Service"}
                    </span>
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[0.56rem] font-semibold uppercase tracking-[0.14em]", statusChipClass(booking.status))}>
                      {formatStatusLabel(booking.status)}
                    </span>
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[0.56rem] font-semibold uppercase tracking-[0.14em]", paymentChipClass(booking.payment_status))}>
                      {formatStatusLabel(booking.payment_status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-(--text-secondary)">
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="size-3" />
                      {booking.customer?.full_name || "—"}
                    </span>
                    <span className="text-(--text-disabled)">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formatDateTime(booking.start_time_utc)}
                    </span>
                    <span className="text-(--text-disabled)">·</span>
                    <span>{booking.service?.duration_minutes || 0} min</span>
                    <span className="text-(--text-disabled)">·</span>
                    <span className="font-medium text-(--accent-primary)">{formatMoney(booking.service?.price)}</span>
                  </div>
                </div>

                {/* Right: chevron hint */}
                <div className="shrink-0 text-xs font-medium text-(--text-disabled)">
                  View →
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className={panelClass}>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="mb-4 size-12 text-(--text-disabled)" />
            <p className="text-[1rem] font-semibold text-(--text-primary)">No bookings match these filters</p>
            <p className="mt-2 text-sm text-(--text-secondary)">Try widening the search or clearing the active filters.</p>
            <Button
              variant="ghost"
              className={`mt-5 ${secondaryButtonClass}`}
              onClick={() => { setSearch(""); setStatusFilter("all"); setPaymentFilter("all"); }}
            >
              Reset filters
            </Button>
          </div>
        </div>
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
          className="flex w-full flex-col overflow-hidden border-l border-(--border-subtle) bg-(--bg-surface) p-0 text-(--text-primary) sm:max-w-120"
        >
          {detailsBooking ? (
            <>
              {/* ── Header: bg-surface (lifted from page) ── */}
              <div className="shrink-0 border-b border-(--border-subtle) bg-(--bg-surface) px-6 pb-5 pt-6">
                <SheetTitle className="sr-only">Booking Details</SheetTitle>
                <SheetDescription className="sr-only">Booking record detail view</SheetDescription>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.14em]", statusChipClass(detailsBooking.status))}>
                    {formatStatusLabel(detailsBooking.status)}
                  </span>
                  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.14em]", paymentChipClass(detailsBooking.payment_status))}>
                    {formatStatusLabel(detailsBooking.payment_status)}
                  </span>
                </div>
                <p className="mt-3 text-[1.2rem] font-semibold leading-tight tracking-[-0.03em] text-(--text-primary)">
                  {detailsBooking.service?.name || "—"}
                </p>
                <p className="mt-0.5 font-mono text-[0.7rem] text-(--text-disabled)">
                  #{detailsBooking.id.slice(0, 8).toUpperCase()}
                </p>

                {/* Schedule strip — elevated card inside surface header */}
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[0.7rem] bg-(--bg-elevated) px-4 py-3 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-(--text-primary)">
                    <Calendar className="size-3.5 text-(--accent-primary)" />
                    {formatDateOnly(detailsBooking.start_time_utc)}
                  </span>
                  <span className="text-(--border-subtle)">·</span>
                  <span className="flex items-center gap-1.5 text-(--text-secondary)">
                    <Clock3 className="size-3.5 text-(--text-disabled)" />
                    {formatTime(detailsBooking.start_time_utc)}
                  </span>
                  <span className="text-(--border-subtle)">·</span>
                  <span className="text-(--text-secondary)">{detailsBooking.service?.duration_minutes || 0} min</span>
                </div>
              </div>

              {/* ── Scrollable body ── */}
              <div className="flex-1 overflow-y-auto bg-(--bg-surface) px-5 py-5">
                <div className="space-y-3">

                  {/* Customer card */}
                  <div className="rounded-[0.75rem] bg-(--bg-elevated) px-4 py-4">
                    <p className="mb-3 text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-(--text-disabled)">Customer</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 text-sm">
                        <UserRound className="size-4 shrink-0 text-(--text-disabled)" />
                        <span className="font-medium text-(--text-primary)">{detailsBooking.customer?.full_name || "—"}</span>
                      </div>
                      {detailsBooking.customer?.email && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <Mail className="size-4 shrink-0 text-(--text-disabled)" />
                          <span className="text-(--text-secondary)">{detailsBooking.customer.email}</span>
                        </div>
                      )}
                      {detailsBooking.customer?.phone && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <Phone className="size-4 shrink-0 text-(--text-disabled)" />
                          <span className="text-(--text-secondary)">{detailsBooking.customer.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Staff + Price cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[0.75rem] bg-(--bg-elevated) px-4 py-4">
                      <p className="mb-3 text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-(--text-disabled)">Staff</p>
                      <div className="flex items-center gap-2 text-sm">
                        <UserRound className="size-4 shrink-0 text-(--text-disabled)" />
                        <span className="font-medium text-(--text-primary)">{detailsBooking.staff?.full_name || "Unassigned"}</span>
                      </div>
                    </div>
                    <div className="rounded-[0.75rem] bg-(--bg-elevated) px-4 py-4">
                      <p className="mb-3 text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-(--text-disabled)">Price</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Wallet className="size-4 shrink-0 text-(--text-disabled)" />
                        <span className="font-semibold text-(--accent-primary)">{formatMoney(detailsBooking.service?.price)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions card */}
                  <div className="rounded-[0.75rem] bg-(--bg-elevated) px-4 py-4">
                    <p className="mb-3 text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-(--text-disabled)">Actions</p>
                    {renderActionButtons(detailsBooking, { includeDetails: false })}
                  </div>

                  {/* Change History */}
                  <div className="rounded-[0.75rem] bg-(--bg-elevated) px-4 py-4">
                    <p className="mb-3 text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-(--text-disabled)">Change History</p>
                    {detailsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-(--text-secondary)">
                        <LoaderCircle className="size-4 animate-spin" />Loading…
                      </div>
                    ) : detailsError ? (
                      <p className="text-sm text-[#ffcfaf]">{detailsError}</p>
                    ) : detailsChanges.length === 0 ? (
                      <p className="text-sm text-(--text-disabled)">No changes recorded.</p>
                    ) : (
                      <div className="space-y-4">
                        {detailsChanges.map((change) => (
                          <div key={change.id} className="relative border-l-2 border-(--accent-primary)/30 pl-4">
                            <div className="absolute -left-1.25 top-1 h-2.5 w-2.5 rounded-full border-2 border-(--accent-primary) bg-(--bg-elevated)" />
                            <div className="flex flex-wrap items-baseline justify-between gap-1">
                              <p className="text-sm font-semibold text-(--text-primary)">{formatStatusLabel(change.change_type)}</p>
                              <p className="text-xs text-(--text-disabled)">{formatDateTime(change.created_at)}</p>
                            </div>
                            {change.old_start_time && change.new_start_time && (
                              <p className="mt-1 text-xs text-(--text-secondary)">
                                {formatDateOnly(change.old_start_time)} {formatTime(change.old_start_time)}
                                {" → "}
                                {formatDateOnly(change.new_start_time)} {formatTime(change.new_start_time)}
                              </p>
                            )}
                            {change.reason && (
                              <p className="mt-1 text-xs text-(--text-secondary)">Reason: {change.reason}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Activity Log */}
                  <div className="rounded-[0.75rem] bg-(--bg-elevated) px-4 py-4">
                    <p className="mb-3 text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-(--text-disabled)">Activity Log</p>
                    {detailsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-(--text-secondary)">
                        <LoaderCircle className="size-4 animate-spin" />Loading…
                      </div>
                    ) : detailsLogs.length === 0 ? (
                      <p className="text-sm text-(--text-disabled)">No activity recorded.</p>
                    ) : (
                      <div className="space-y-4">
                        {detailsLogs.map((log) => (
                          <div key={log.id} className="relative border-l-2 border-(--border-subtle) pl-4">
                            <div className="absolute -left-1.25 top-1 h-2.5 w-2.5 rounded-full border-2 border-(--border-subtle) bg-(--bg-elevated)" />
                            <div className="flex flex-wrap items-baseline justify-between gap-1">
                              <p className="text-sm font-semibold text-(--text-primary)">{formatStatusLabel(log.action)}</p>
                              <p className="text-xs text-(--text-disabled)">{formatDateTime(log.created_at)}</p>
                            </div>
                            {log.performed_by && (
                              <p className="mt-0.5 text-xs text-(--text-secondary)">by {log.performed_by}</p>
                            )}
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {Object.entries(log.details).map(([key, value]) => (
                                  <span key={key} className="inline-flex items-baseline gap-1 rounded-[0.4rem] border border-(--border-subtle) bg-(--bg-inset) px-2 py-1 text-xs">
                                    <span className="text-(--text-disabled)">{formatDetailKey(key)}:</span>
                                    <span className="text-(--text-secondary)">{formatDetailValue(value)}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </>
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
          className="w-full overflow-y-auto border-l border-(--border-subtle) bg-(--bg-elevated) text-(--text-primary) sm:max-w-lg"
        >
          <SheetHeader className="border-b border-(--border-subtle) pb-4">
            <SheetTitle className="text-[1.2rem] tracking-[-0.03em] text-(--text-primary)">
              Reschedule Booking
            </SheetTitle>
            <SheetDescription className="text-(--text-secondary)">
              Choose a new date and one of the available appointment slots.
            </SheetDescription>
          </SheetHeader>

          {rescheduleBooking ? (
            <div className="space-y-5 px-4 pb-8">
              <div className={`${panelClass} p-4`}>
                <p className="text-sm font-semibold text-(--text-primary)">
                  {rescheduleBooking.service?.name || "Service"}
                </p>
                <p className="mt-1 text-sm text-(--text-secondary)">
                  Current time:{" "}
                  {formatDateTime(rescheduleBooking.start_time_utc)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)">
                  New date
                </label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(event) => setRescheduleDate(event.target.value)}
                  className={fieldClass}
                />
              </div>

              <div className="space-y-3">
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)">
                  Available times
                </p>
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
                          "rounded-[0.55rem] border px-3 py-2 text-sm font-semibold transition-colors",
                          selectedSlot === slot.start_time
                            ? "border-(--accent-primary)/30 bg-(--accent-primary) text-[#06292d]"
                            : "border-(--border-subtle) bg-(--bg-inset) text-(--text-primary) hover:border-(--accent-primary)/30",
                        )}
                      >
                        {formatTime(slot.start_time)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {rescheduleError ? (
                <p className="text-sm text-[#ffcfaf]">{rescheduleError}</p>
              ) : null}

              <SheetFooter>
                <Button
                  onClick={submitReschedule}
                  disabled={!selectedSlot || rescheduleLoading}
                  className={primaryButtonClass}
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
        <AlertDialogContent
          className="w-[min(92vw,30rem)] rounded-[1.1rem] border border-(--border-subtle) bg-(--bg-elevated) p-6 shadow-[0_20px_60px_rgba(0,0,0,0.48)]"
          overlayClassName="bg-black/78 backdrop-blur-sm"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              This will mark the booking as cancelled and store the optional
              reason in the audit history.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            {cancelBooking ? (
              <div className={`${insetPanelClass} p-4 text-sm`}>
                <p className="font-medium text-(--text-primary)">
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
              className="min-h-28 rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:border-(--accent-primary)/40 focus-visible:ring-1 focus-visible:ring-(--accent-primary)"
            />
          </div>

          <AlertDialogFooter className="mt-5 gap-2">
            <AlertDialogCancel
              disabled={cancelLoading}
              className="!mt-0 !h-10 !rounded-[0.55rem] !border-[var(--border-subtle)] !bg-[var(--bg-inset)] !px-4 !text-[0.62rem] !font-semibold !uppercase !tracking-[0.16em] !text-[var(--text-primary)] hover:!border-[rgba(122,213,221,0.3)] hover:!text-[var(--accent-primary)]"
            >
              Keep booking
            </AlertDialogCancel>
            <Button
              variant="ghost"
              onClick={submitCancel}
              disabled={cancelLoading}
              className="h-10 rounded-[0.55rem] border border-[rgba(255,125,125,0.24)] bg-[rgba(255,125,125,0.10)] px-4 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[#ff9c9c] hover:bg-[rgba(255,125,125,0.14)]"
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
