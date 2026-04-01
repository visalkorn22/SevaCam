"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Calendar, Clock } from "lucide-react";
import Link from "next/link";
import {
  formatDateInputInTimeZone,
  formatDateTimeInTimeZone,
} from "@/lib/timezone";

type StaffOption = {
  id: string;
  full_name: string | null;
};

type LocationOption = {
  id: string;
  name: string;
  timezone: string;
};

type CalendarItem = {
  id: string;
  type: "booking" | "exception" | "hold";
  start_utc: string;
  end_utc: string;
  title?: string;
  status?: string;
  service_name?: string | null;
  staff_id?: string | null;
  staff_name?: string | null;
  customer_name?: string | null;
  reason?: string | null;
  exception_type?: string | null;
};

type CalendarResponse = {
  items: CalendarItem[];
  summary: {
    bookings: number;
    exceptions: number;
    holds: number;
    conflicts: number;
  };
  warnings: {
    booking_id: string;
    exception_id: string;
    start_utc: string;
    end_utc: string;
    exception_type: string;
    staff_id: string;
    staff_name: string | null;
    message: string;
  }[];
  utilization_by_day: {
    date: string;
    staff_id: string;
    work_minutes: number;
    booked_minutes: number;
    utilization: number;
  }[];
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function AvailabilityCalendar({
  mode,
  staffId,
  timezone,
}: {
  mode: "admin" | "staff";
  staffId?: string;
  timezone?: string | null;
}) {
  const displayTimeZone = useMemo(() => {
    if (timezone) return timezone;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, [timezone]);
  const today = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState(() =>
    formatDateInputInTimeZone(today, displayTimeZone),
  );
  const [endDate, setEndDate] = useState(
    formatDateInputInTimeZone(
      new Date(today.getTime() + 6 * 86400000),
      displayTimeZone,
    ),
  );
  const [selectedStaff, setSelectedStaff] = useState(staffId || "all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canSelectStaff = mode === "admin";

  useEffect(() => {
    if (!canSelectStaff) return;

    const loadOptions = async () => {
      const [staffRes, locationRes] = await Promise.all([
        fetch(`${apiUrl}/api/admin/staff`, { credentials: "include" }),
        fetch(`${apiUrl}/api/admin/locations`, { credentials: "include" }),
      ]);

      if (staffRes.ok) {
        const staff = (await staffRes.json()) as StaffOption[];
        setStaffOptions(staff);
      }

      if (locationRes.ok) {
        const locations = (await locationRes.json()) as LocationOption[];
        setLocationOptions(locations);
      }
    };

    void loadOptions();
  }, [canSelectStaff]);

  const fetchCalendar = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        timezone: displayTimeZone,
      });

      if (selectedStaff !== "all") params.set("staff_id", selectedStaff);
      if (selectedLocation !== "all")
        params.set("location_id", selectedLocation);

      const res = await fetch(
        `${apiUrl}/api/availability/calendar?${params.toString()}`,
        {
          credentials: "include",
        },
      );

      if (res.ok) {
        const data = (await res.json()) as CalendarResponse;
        setCalendar(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedStaff, selectedLocation]);

  const items = calendar?.items ?? [];
  const warnings = calendar?.warnings ?? [];
  const utilizationSummary = useMemo(() => {
    const utilization = calendar?.utilization_by_day ?? [];
    const byDate = new Map<string, { total: number; count: number }>();
    utilization.forEach((entry) => {
      const dateKey = entry.date;
      const existing = byDate.get(dateKey) || { total: 0, count: 0 };
      existing.total += entry.utilization;
      existing.count += 1;
      byDate.set(dateKey, existing);
    });
    return Array.from(byDate.entries()).map(([date, stats]) => ({
      date,
      utilization: stats.count ? stats.total / stats.count : 0,
    }));
  }, [calendar?.utilization_by_day]);

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Availability Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {canSelectStaff && (
              <div className="space-y-2">
                <Label>Staff</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="All staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All staff</SelectItem>
                    {staffOptions.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.full_name || "Staff member"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {canSelectStaff && (
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={selectedLocation}
                  onValueChange={setSelectedLocation}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {locationOptions.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary">
              Bookings: {calendar?.summary.bookings ?? 0}
            </Badge>
            <Badge variant="secondary">
              Exceptions: {calendar?.summary.exceptions ?? 0}
            </Badge>
            <Badge variant="secondary">
              Holds: {calendar?.summary.holds ?? 0}
            </Badge>
            <Badge variant="destructive">
              Conflicts: {calendar?.summary.conflicts ?? 0}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            Times shown in {displayTimeZone}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/staff/availability">Manage weekly schedule</Link>
            </Button>
            {mode === "staff" && (
              <Button asChild size="sm" variant="outline">
                <Link href="/staff/availability">
                  Add time off / exceptions
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading calendar...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events in this range.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const start = new Date(item.start_utc);
                  const end = new Date(item.end_utc);
                  return (
                    <TableRow key={`${item.type}-${item.id}`}>
                      <TableCell>
                        <Badge
                          variant={
                            item.type === "booking"
                              ? "default"
                              : item.type === "exception"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDateTimeInTimeZone(start, displayTimeZone)}
                      </TableCell>
                      <TableCell>
                        {formatDateTimeInTimeZone(end, displayTimeZone)}
                      </TableCell>
                      <TableCell>
                        {item.title || item.service_name || "-"}
                      </TableCell>
                      <TableCell>{item.staff_name || "-"}</TableCell>
                      <TableCell className="space-y-1">
                        {item.customer_name && (
                          <div>Customer: {item.customer_name}</div>
                        )}
                        {item.status && <div>Status: {item.status}</div>}
                        {item.reason && <div>Reason: {item.reason}</div>}
                        {item.exception_type && (
                          <div>Type: {item.exception_type}</div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Conflict Warnings</CardTitle>
        </CardHeader>
        <CardContent>
          {warnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No conflicts detected.
            </p>
          ) : (
            <div className="space-y-3">
              {warnings.map((warning) => (
                <div
                  key={`${warning.booking_id}-${warning.exception_id}`}
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{warning.message}</div>
                    <Badge variant="destructive">
                      {warning.exception_type}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <div>Staff: {warning.staff_name || warning.staff_id}</div>
                    <div>
                      Window:{" "}
                      {formatDateTimeInTimeZone(
                        warning.start_utc,
                        displayTimeZone,
                      )}{" "}
                      -{" "}
                      {formatDateTimeInTimeZone(
                        warning.end_utc,
                        displayTimeZone,
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          {utilizationSummary.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No utilization data yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {utilizationSummary.map((entry) => (
                  <TableRow key={entry.date}>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>
                      {Math.round(entry.utilization * 100)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
