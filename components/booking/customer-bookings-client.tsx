"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookingCard } from "@/components/booking/BookingCard";
import LocationMapView from "@/components/booking/LocationMapView";
import { ReviewDialog } from "@/components/booking/ReviewDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import {
  formatDateInTimeZone,
  formatDateInputInTimeZone,
  formatTimeInTimeZone,
  parseDateValue,
} from "@/lib/timezone";

export type CustomerBookingsUser = {
  id: string;
  email: string;
  full_name?: string | null;
  timezone?: string | null;
};

type BookingReviewSummary = {
  id: string;
  rating: number;
};

type BookingLocation = {
  id: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
};

type BookingRow = {
  id: string;
  service_id: string;
  staff_id: string;
  customer_id: string;
  start_time_utc: string;
  end_time_utc: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no-show";
  payment_status: string;
  booking_source: string;
  customer_timezone: string;
  created_at: string;
  service_name?: string | null;
  staff_name?: string | null;
  customer_name?: string | null;
  service_price?: number | string | null;
  location?: BookingLocation | null;
  review?: BookingReviewSummary | null;
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

type WaitlistRow = {
  id: string;
  service_id: string;
  customer_id: string;
  preferred_date?: string | null;
  status: string;
  created_at: string;
};

type ServiceSummary = {
  id: string;
  name: string;
  public_name?: string | null;
};

type AvailableSlot = {
  start_time: string;
  end_time: string;
  staff_id: string;
  staff_name?: string | null;
};

export default function CustomerBookingsClient({
  user,
}: {
  user: CustomerBookingsUser;
}) {
  const DEFAULT_CUSTOMER_TIMEZONE = "Asia/Phnom_Penh";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const router = useRouter();
  const timezone =
    user.timezone && user.timezone !== "UTC"
      ? user.timezone
      : DEFAULT_CUSTOMER_TIMEZONE;
  const getBookingTimestamp = (value: string) =>
    parseDateValue(value)?.getTime() ?? Number.NaN;
  const getLocationLabel = (location?: BookingLocation | null) => {
    if (!location) return undefined;
    return location.name;
  };

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [serviceLookup, setServiceLookup] = useState<Record<string, string>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detailsBooking, setDetailsBooking] = useState<BookingRow | null>(null);
  const [detailsLogs, setDetailsLogs] = useState<BookingLogRow[]>([]);
  const [detailsChanges, setDetailsChanges] = useState<BookingChangeRow[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [rescheduleBooking, setRescheduleBooking] = useState<BookingRow | null>(
    null,
  );
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailableSlot[]>([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  const [cancelBooking, setCancelBooking] = useState<BookingRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [rebookLoadingId, setRebookLoadingId] = useState<string | null>(null);
  const [reviewBooking, setReviewBooking] = useState<BookingRow | null>(null);

  const loadBookings = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/bookings`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Unable to load bookings");
      }
      const data = (await res.json()) as BookingRow[];
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load bookings");
    }
  }, [apiUrl]);

  const onReviewSubmitted = (
    bookingId: string,
    review: BookingReviewSummary,
  ) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, review } : b)),
    );
    setReviewBooking(null);
  };

  const loadWaitlist = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/waitlist/`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setWaitlist([]);
        return;
      }
      const data = (await res.json()) as WaitlistRow[];
      setWaitlist(data);
    } catch {
      setWaitlist([]);
    }
  }, [apiUrl]);

  const loadServiceName = useCallback(async (serviceId: string) => {
    if (!serviceId || serviceLookup[serviceId]) return;
    try {
      const res = await fetch(`${apiUrl}/api/services/${serviceId}`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as ServiceSummary;
      setServiceLookup((prev) => ({
        ...prev,
        [serviceId]: data.public_name || data.name,
      }));
    } catch {
      return;
    }
  }, [apiUrl, serviceLookup]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([loadBookings(), loadWaitlist()]).finally(() => {
      setIsLoading(false);
    });
  }, [loadBookings, loadWaitlist]);

  useEffect(() => {
    waitlist.forEach((entry) => {
      void loadServiceName(entry.service_id);
    });
  }, [loadServiceName, waitlist]);

  const now = Date.now();
  const upcomingBookings = useMemo(
    () =>
      bookings
        .filter((booking) => getBookingTimestamp(booking.start_time_utc) >= now)
        .sort(
          (a, b) =>
            getBookingTimestamp(a.start_time_utc) -
            getBookingTimestamp(b.start_time_utc),
        ),
    [bookings, now],
  );

  const pastBookings = useMemo(
    () =>
      bookings
        .filter((booking) => getBookingTimestamp(booking.start_time_utc) < now)
        .sort(
          (a, b) =>
            getBookingTimestamp(b.start_time_utc) -
            getBookingTimestamp(a.start_time_utc),
        ),
    [bookings, now],
  );

  const openDetails = async (booking: BookingRow) => {
    setDetailsBooking(booking);
    setDetailsLoading(true);
    try {
      const [logsRes, changesRes] = await Promise.all([
        fetch(`${apiUrl}/api/bookings/${booking.id}/logs`, {
          credentials: "include",
        }),
        fetch(`${apiUrl}/api/bookings/${booking.id}/changes`, {
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
    } finally {
      setDetailsLoading(false);
    }
  };

  const openReschedule = (booking: BookingRow) => {
    setRescheduleBooking(booking);
    setRescheduleDate(
      formatDateInputInTimeZone(booking.start_time_utc, timezone),
    );
    setSelectedSlot("");
    setRescheduleError(null);
  };

  useEffect(() => {
    const loadSlots = async () => {
      if (!rescheduleBooking || !rescheduleDate) return;
      setRescheduleLoading(true);
      setRescheduleError(null);
      try {
        const res = await fetch(
          `${apiUrl}/api/availability/slots-v2?service_id=${rescheduleBooking.service_id}&date=${rescheduleDate}&timezone=${encodeURIComponent(
            timezone,
          )}&staff_id=${rescheduleBooking.staff_id}`,
          {
            credentials: "include",
          },
        );
        if (!res.ok) {
          setRescheduleSlots([]);
          return;
        }
        const data = (await res.json()) as AvailableSlot[];
        setRescheduleSlots(data);
      } catch {
        setRescheduleSlots([]);
      } finally {
        setRescheduleLoading(false);
      }
    };

    void loadSlots();
  }, [apiUrl, rescheduleBooking, rescheduleDate, timezone]);

  useEffect(() => {
    setSelectedSlot("");
  }, [rescheduleDate, rescheduleBooking?.id]);

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
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.detail || "Unable to reschedule booking");
      }
      setRescheduleBooking(null);
      setSelectedSlot("");
      await loadBookings();
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
      setCancelBooking(null);
      setCancelReason("");
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel booking");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRebook = async (booking: BookingRow) => {
    if (rebookLoadingId) return;
    setRebookLoadingId(booking.id);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/bookings/${booking.id}/rebook`, {
        method: "POST",
        credentials: "include",
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.detail || "Unable to rebook");
      }
      router.push(`/payment/${payload.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to rebook");
    } finally {
      setRebookLoadingId(null);
    }
  };

  const renderBookings = (items: BookingRow[], allowBookAgain: boolean) => {
    if (items.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
          <p className="text-base font-semibold text-foreground">
            No bookings yet
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse services and book your next appointment.
          </p>
          <Button
            asChild
            size="sm"
            className="mt-6 rounded-full px-6 text-[11px] font-bold uppercase tracking-[0.2em]"
          >
            <a href="/services">Explore Services</a>
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {items.map((booking) => {
          const isFuture = getBookingTimestamp(booking.start_time_utc) >= now;
          const canEdit =
            isFuture &&
            booking.status !== "cancelled" &&
            booking.status !== "completed" &&
            booking.status !== "no-show";
          const canBookAgain =
            allowBookAgain &&
            (booking.status === "completed" ||
              booking.status === "cancelled" ||
              booking.status === "no-show");

          return (
            <BookingCard
              key={booking.id}
              id={booking.id}
              serviceName={booking.service_name || "Service"}
              date={formatDateInTimeZone(booking.start_time_utc, timezone)}
              time={formatTimeInTimeZone(booking.start_time_utc, timezone)}
              price={Number(booking.service_price || 0)}
              status={booking.status}
              location={getLocationLabel(booking.location)}
              providerName={booking.staff_name || "Staff"}
              onViewDetails={() => openDetails(booking)}
              onEdit={canEdit ? () => openReschedule(booking) : undefined}
              onCancel={canEdit ? () => setCancelBooking(booking) : undefined}
              onBook={canBookAgain ? () => handleRebook(booking) : undefined}
              review={booking.review ?? null}
              onReviewSubmit={
                booking.status === "completed" && !booking.review
                  ? () => setReviewBooking(booking)
                  : undefined
              }
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">
            My Account
          </p>
          <h1 className="mt-3 font-serif text-4xl font-normal tracking-tight text-foreground">
            Your Bookings
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage upcoming appointments, reschedule, or join waitlists.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {error ? (
          <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
            <TabsTrigger value="waitlist">
              Waitlist ({waitlist.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              renderBookings(upcomingBookings, false)
            )}
          </TabsContent>

          <TabsContent value="past">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              renderBookings(pastBookings, true)
            )}
          </TabsContent>

          <TabsContent value="waitlist">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : waitlist.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-8 text-center">
                <p className="text-lg font-semibold text-foreground">
                  You are not on any waitlists
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  If a service is full, you can join its waitlist during
                  booking.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {waitlist.map((entry) => (
                  <Card key={entry.id} className="shadow-[var(--shadow-card)]">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {serviceLookup[entry.service_id] || "Service"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Preferred date
                        </span>
                        <span className="font-semibold">
                          {entry.preferred_date
                            ? formatDateInTimeZone(
                                `${entry.preferred_date}T00:00:00`,
                                timezone,
                              )
                            : "Flexible"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant="secondary">{entry.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Sheet
        open={Boolean(detailsBooking)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsBooking(null);
            setDetailsLogs([]);
            setDetailsChanges([]);
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Booking Details</SheetTitle>
            <SheetDescription>
              Review the booking timeline and status.
            </SheetDescription>
          </SheetHeader>
          {detailsBooking ? (
            <div className="space-y-6 px-4 pb-8">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Service</p>
                <p className="text-lg font-semibold">
                  {detailsBooking.service_name || "Service"}
                </p>
                <p className="text-sm text-muted-foreground">
                  with {detailsBooking.staff_name || "Staff"}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-semibold">
                    {formatDateInTimeZone(
                      detailsBooking.start_time_utc,
                      timezone,
                    )}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-semibold">
                    {formatTimeInTimeZone(
                      detailsBooking.start_time_utc,
                      timezone,
                    )}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline">{detailsBooking.status}</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <Badge variant="secondary">
                    {detailsBooking.payment_status}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <Badge variant="outline">
                    {detailsBooking.booking_source}
                  </Badge>
                </div>
                {detailsBooking.location ? (
                  <div className="mt-2 flex items-start justify-between gap-4">
                    <span className="text-muted-foreground">Location</span>
                    <div className="max-w-[70%] text-right">
                      <p className="font-semibold">{detailsBooking.location.name}</p>
                      {detailsBooking.location.address ? (
                        <p className="text-xs text-muted-foreground">
                          {detailsBooking.location.address}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              {detailsBooking.location ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Booking location</p>
                  {detailsBooking.location.latitude != null &&
                  detailsBooking.location.longitude != null ? (
                    <LocationMapView
                      location={{
                        name: detailsBooking.location.name,
                        address:
                          detailsBooking.location.address || "Address unavailable",
                        latitude: detailsBooking.location.latitude,
                        longitude: detailsBooking.location.longitude,
                      }}
                      height={220}
                      compact
                    />
                  ) : (
                    <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm">
                      <p className="font-semibold text-foreground">
                        {detailsBooking.location.name}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {detailsBooking.location.address || "Address unavailable"}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="space-y-3">
                <p className="text-sm font-semibold">History</p>
                {detailsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : (
                  <div className="space-y-3">
                    {detailsChanges.length === 0 && detailsLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No history available.
                      </p>
                    ) : (
                      <>
                        {detailsChanges.map((change) => (
                          <div
                            key={change.id}
                            className="rounded-xl border border-border bg-background/60 p-3 text-xs"
                          >
                            <p className="font-semibold uppercase tracking-wide">
                              {change.change_type}
                            </p>
                            {change.old_start_time && change.new_start_time ? (
                              <p className="mt-1 text-muted-foreground">
                                {formatDateInTimeZone(
                                  change.old_start_time,
                                  timezone,
                                )}{" "}
                                {formatTimeInTimeZone(
                                  change.old_start_time,
                                  timezone,
                                )}{" "}
                                ?{" "}
                                {formatDateInTimeZone(
                                  change.new_start_time,
                                  timezone,
                                )}{" "}
                                {formatTimeInTimeZone(
                                  change.new_start_time,
                                  timezone,
                                )}
                              </p>
                            ) : null}
                            {change.reason ? (
                              <p className="mt-1 text-muted-foreground">
                                Reason: {change.reason}
                              </p>
                            ) : null}
                            <p className="mt-1 text-muted-foreground">
                              {formatDateInTimeZone(
                                change.created_at,
                                timezone,
                              )}{" "}
                              {formatTimeInTimeZone(
                                change.created_at,
                                timezone,
                              )}
                            </p>
                          </div>
                        ))}
                        {detailsLogs.map((log) => (
                          <div
                            key={log.id}
                            className="rounded-xl border border-border bg-background/60 p-3 text-xs"
                          >
                            <p className="font-semibold uppercase tracking-wide">
                              {log.action}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              {formatDateInTimeZone(log.created_at, timezone)}{" "}
                              {formatTimeInTimeZone(log.created_at, timezone)}
                            </p>
                          </div>
                        ))}
                      </>
                    )}
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
            setRescheduleSlots([]);
            setRescheduleError(null);
            setSelectedSlot("");
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Reschedule Booking</SheetTitle>
            <SheetDescription>
              Pick a new date and time for your appointment.
            </SheetDescription>
          </SheetHeader>
          {rescheduleBooking ? (
            <div className="space-y-5 px-4 pb-8">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Service</p>
                <p className="text-lg font-semibold">
                  {rescheduleBooking.service_name || "Service"}
                </p>
                <p className="text-sm text-muted-foreground">
                  with {rescheduleBooking.staff_name || "Staff"}
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
                  <p className="text-sm text-muted-foreground">
                    Loading slots...
                  </p>
                ) : rescheduleSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No slots on this date. Try another day.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {rescheduleSlots.map((slot) => (
                      <button
                        key={slot.start_time}
                        type="button"
                        onClick={() => setSelectedSlot(slot.start_time)}
                        className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                          selectedSlot === slot.start_time
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:border-primary"
                        }`}
                      >
                        {formatTimeInTimeZone(slot.start_time, timezone)}
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
                  {rescheduleLoading ? "Updating..." : "Confirm Reschedule"}
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
              This action cannot be undone. You can add an optional reason for
              cancellation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4">
            <Textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Optional reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep booking</AlertDialogCancel>
            <AlertDialogAction onClick={submitCancel} disabled={cancelLoading}>
              {cancelLoading ? "Cancelling..." : "Cancel booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {reviewBooking && (
        <ReviewDialog
          open={reviewBooking !== null}
          onOpenChange={(open) => {
            if (!open) setReviewBooking(null);
          }}
          bookingId={reviewBooking.id}
          serviceName={reviewBooking.service_name || "Service"}
          onSuccess={(review) => onReviewSubmitted(reviewBooking.id, review)}
        />
      )}
    </div>
  );
}
