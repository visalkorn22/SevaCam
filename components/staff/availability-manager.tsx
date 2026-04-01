"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import {
  dateTimeLocalToUtcIsoString,
  formatDateTimeInTimeZone,
} from "@/lib/timezone";

interface AvailabilityManagerProps {
  staffId: string;
  role?: "customer" | "staff" | "admin" | "superadmin";
  timezone?: string | null;
}

type StaffOption = {
  id: string;
  full_name: string | null;
  role?: string;
  is_active?: boolean;
};

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export function AvailabilityManager({
  staffId,
  role,
  timezone,
}: AvailabilityManagerProps) {
  const isAdmin = role === "admin" || role === "superadmin";
  const [schedules, setSchedules] = useState<any[]>([]);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [workBlocks, setWorkBlocks] = useState<any[]>([]);
  const [breakBlocks, setBreakBlocks] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const canSelectStaff = isAdmin;
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState(staffId);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [staffLoadError, setStaffLoadError] = useState<string | null>(null);
  const effectiveStaffId = canSelectStaff ? selectedStaffId : staffId;
  const displayTimeZone = useMemo(() => {
    if (timezone) return timezone;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, [timezone]);

  const [newScheduleTimezone, setNewScheduleTimezone] = useState(() => {
    if (timezone) return timezone;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  });
  const [newWorkBlock, setNewWorkBlock] = useState({
    weekday: "1",
    start_time_local: "09:00",
    end_time_local: "17:00",
  });
  const [newBreakBlock, setNewBreakBlock] = useState({
    weekday: "1",
    start_time_local: "12:00",
    end_time_local: "13:00",
  });
  const [newException, setNewException] = useState({
    type: "time_off",
    start_utc: "",
    end_utc: "",
    is_all_day: false,
    reason: "",
  });

  const [requestType, setRequestType] = useState<"weekly" | "exception">(
    "weekly",
  );
  const [requestAction, setRequestAction] = useState<
    "add" | "update" | "delete"
  >("add");
  const [requestWeekday, setRequestWeekday] = useState("1");
  const [requestStartTime, setRequestStartTime] = useState("09:00");
  const [requestEndTime, setRequestEndTime] = useState("17:00");
  const [requestBlockId, setRequestBlockId] = useState("");
  const [exceptionType, setExceptionType] = useState<
    "time_off" | "blocked_time" | "extra_availability" | "override_day"
  >("time_off");
  const [exceptionStart, setExceptionStart] = useState("");
  const [exceptionEnd, setExceptionEnd] = useState("");
  const [exceptionAllDay, setExceptionAllDay] = useState(false);
  const [requestExceptionId, setRequestExceptionId] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [scheduleLimits, setScheduleLimits] = useState({
    maxSlotsPerDay: "",
    maxBookingsPerDay: "",
    maxBookingsPerCustomer: "",
  });
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleSaveError, setScheduleSaveError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isAdmin) {
      setRequestType("exception");
      setRequestAction("add");
      setExceptionType("time_off");
    }
  }, [isAdmin]);

  const parseLimitValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) return null;
    return Math.max(0, parsed);
  };

  useEffect(() => {
    if (!canSelectStaff) {
      setSelectedStaffId(staffId);
      return;
    }

    const loadStaff = async () => {
      setIsLoadingStaff(true);
      try {
        const res = await fetch(`/api/admin/staff`);
        if (!res.ok) {
          setStaffLoadError("Unable to load staff list.");
          setStaffOptions([]);
          return;
        }
        const data = (await res.json()) as StaffOption[];
        setStaffOptions(data);
        setStaffLoadError(null);
        setSelectedStaffId((prev) => {
          if (data.length === 0) return "";
          if (prev && data.some((option) => option.id === prev)) {
            return prev;
          }
          if (staffId && data.some((option) => option.id === staffId)) {
            return staffId;
          }
          return data[0].id;
        });
      } catch (error) {
        console.error("Error loading staff:", error);
        setStaffLoadError("Unable to load staff list.");
        setStaffOptions([]);
      } finally {
        setIsLoadingStaff(false);
      }
    };

    void loadStaff();
  }, [canSelectStaff, staffId]);

  useEffect(() => {
    if (!effectiveStaffId) return;
    setSchedules([]);
    setActiveScheduleId(null);
    setWorkBlocks([]);
    setBreakBlocks([]);
    setExceptions([]);
    void fetchSchedules(effectiveStaffId);
    void fetchExceptions(effectiveStaffId);
  }, [effectiveStaffId]);

  useEffect(() => {
    if (activeScheduleId) {
      void fetchBlocks(activeScheduleId);
    }
  }, [activeScheduleId]);

  const fetchSchedules = async (targetStaffId: string) => {
    if (!targetStaffId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/availability/weekly-schedules/${targetStaffId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
        const defaultSchedule =
          data.find((schedule: any) => schedule.is_default) || data[0];
        setActiveScheduleId(defaultSchedule?.id ?? null);
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBlocks = async (scheduleId: string) => {
    try {
      const res = await fetch(
        `/api/availability/weekly-schedules/${scheduleId}/blocks`,
      );
      if (res.ok) {
        const data = await res.json();
        setWorkBlocks(data.work_blocks || []);
        setBreakBlocks(data.break_blocks || []);
      }
    } catch (error) {
      console.error("Error fetching blocks:", error);
    }
  };

  const fetchExceptions = async (targetStaffId: string) => {
    if (!targetStaffId) return;
    try {
      const res = await fetch(
        `/api/availability/staff-exceptions/${targetStaffId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setExceptions(data);
      }
    } catch (error) {
      console.error("Error fetching exceptions:", error);
    }
  };

  const fetchRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const params = new URLSearchParams();
      if (canSelectStaff && effectiveStaffId) {
        params.set("staff_id", effectiveStaffId);
      }
      const res = await fetch(
        `/api/availability/schedule-requests${
          params.toString() ? `?${params.toString()}` : ""
        }`,
      );
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
        setRequestError(null);
      } else if (res.status === 403) {
        setRequestError(
          "Access denied. Please sign in with a staff/admin account.",
        );
      } else {
        setRequestError("Unable to load requests. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      setRequestError("Unable to load requests. Please try again.");
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!effectiveStaffId) return;
    try {
      const maxSlotsPerDay = parseLimitValue(scheduleLimits.maxSlotsPerDay);
      const maxBookingsPerDay = parseLimitValue(
        scheduleLimits.maxBookingsPerDay,
      );
      const maxBookingsPerCustomer = parseLimitValue(
        scheduleLimits.maxBookingsPerCustomer,
      );
      const res = await fetch(`/api/availability/weekly-schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: effectiveStaffId,
          timezone: newScheduleTimezone,
          is_default: true,
          max_slots_per_day: maxSlotsPerDay,
          max_bookings_per_day: maxBookingsPerDay,
          max_bookings_per_customer: maxBookingsPerCustomer,
        }),
      });
      if (res.ok) {
        await fetchSchedules(effectiveStaffId);
      }
    } catch (error) {
      console.error("Error creating schedule:", error);
    }
  };

  const handleUpdateSchedule = async () => {
    if (!activeScheduleId) return;
    setIsSavingSchedule(true);
    setScheduleSaveError(null);
    try {
      const maxSlotsPerDay = parseLimitValue(scheduleLimits.maxSlotsPerDay);
      const maxBookingsPerDay = parseLimitValue(
        scheduleLimits.maxBookingsPerDay,
      );
      const maxBookingsPerCustomer = parseLimitValue(
        scheduleLimits.maxBookingsPerCustomer,
      );
      const res = await fetch(
        `/api/availability/weekly-schedules/${activeScheduleId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timezone: newScheduleTimezone,
            max_slots_per_day: maxSlotsPerDay,
            max_bookings_per_day: maxBookingsPerDay,
            max_bookings_per_customer: maxBookingsPerCustomer,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setScheduleSaveError(
          data?.detail || data?.message || "Unable to save schedule limits.",
        );
        return;
      }
      if (effectiveStaffId) {
        await fetchSchedules(effectiveStaffId);
      }
    } catch (error) {
      console.error("Error updating schedule:", error);
      setScheduleSaveError("Unable to save schedule limits.");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleAddWorkBlock = async () => {
    if (!activeScheduleId) return;
    try {
      const res = await fetch(
        `/api/availability/weekly-schedules/work-blocks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schedule_id: activeScheduleId,
            weekday: Number.parseInt(newWorkBlock.weekday),
            start_time_local: newWorkBlock.start_time_local,
            end_time_local: newWorkBlock.end_time_local,
          }),
        },
      );
      if (res.ok) {
        await fetchBlocks(activeScheduleId);
      }
    } catch (error) {
      console.error("Error adding work block:", error);
    }
  };

  const handleAddBreakBlock = async () => {
    if (!activeScheduleId) return;
    try {
      const res = await fetch(
        `/api/availability/weekly-schedules/break-blocks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schedule_id: activeScheduleId,
            weekday: Number.parseInt(newBreakBlock.weekday),
            start_time_local: newBreakBlock.start_time_local,
            end_time_local: newBreakBlock.end_time_local,
          }),
        },
      );
      if (res.ok) {
        await fetchBlocks(activeScheduleId);
      }
    } catch (error) {
      console.error("Error adding break block:", error);
    }
  };

  const handleDeleteWorkBlock = async (blockId: string) => {
    try {
      await fetch(`/api/availability/weekly-schedules/work-blocks/${blockId}`, {
        method: "DELETE",
      });
      if (activeScheduleId) {
        await fetchBlocks(activeScheduleId);
      }
    } catch (error) {
      console.error("Error deleting work block:", error);
    }
  };

  const handleDeleteBreakBlock = async (blockId: string) => {
    try {
      await fetch(
        `/api/availability/weekly-schedules/break-blocks/${blockId}`,
        {
          method: "DELETE",
        },
      );
      if (activeScheduleId) {
        await fetchBlocks(activeScheduleId);
      }
    } catch (error) {
      console.error("Error deleting break block:", error);
    }
  };

  const handleAddException = async () => {
    if (!effectiveStaffId) return;
    if (!newException.start_utc || !newException.end_utc) return;
    try {
      const res = await fetch(`/api/availability/staff-exceptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: effectiveStaffId,
          type: newException.type,
          start_utc: dateTimeLocalToUtcIsoString(
            newException.start_utc,
            displayTimeZone,
          ),
          end_utc: dateTimeLocalToUtcIsoString(
            newException.end_utc,
            displayTimeZone,
          ),
          is_all_day: newException.is_all_day,
          reason: newException.reason,
        }),
      });
      if (res.ok) {
        setNewException({
          type: "time_off",
          start_utc: "",
          end_utc: "",
          is_all_day: false,
          reason: "",
        });
        await fetchExceptions(effectiveStaffId);
      }
    } catch (error) {
      console.error("Error adding exception:", error);
    }
  };

  const handleDeleteException = async (exceptionId: string) => {
    try {
      await fetch(`/api/availability/staff-exceptions/${exceptionId}`, {
        method: "DELETE",
      });
      if (effectiveStaffId) {
        await fetchExceptions(effectiveStaffId);
      }
    } catch (error) {
      console.error("Error deleting exception:", error);
    }
  };

  const handleSubmitRequest = async () => {
    if (!effectiveStaffId) return;
    setIsSubmittingRequest(true);
    try {
      const needsBlockId = requestType === "weekly" && requestAction !== "add";
      const needsExceptionId =
        requestType === "exception" && requestAction !== "add";
      if (needsBlockId && !requestBlockId) {
        setIsSubmittingRequest(false);
        return;
      }
      if (needsExceptionId && !requestExceptionId) {
        setIsSubmittingRequest(false);
        return;
      }

      const payload =
        requestType === "weekly"
          ? {
              target: "weekly_schedule",
              action: requestAction,
              weekday: Number.parseInt(requestWeekday),
              start_time: requestStartTime,
              end_time: requestEndTime,
              block_id: requestAction === "add" ? null : requestBlockId,
            }
          : {
              target: "exception",
              action: requestAction,
              type: exceptionType,
              start_utc: exceptionStart
                ? dateTimeLocalToUtcIsoString(exceptionStart, displayTimeZone)
                : null,
              end_utc: exceptionEnd
                ? dateTimeLocalToUtcIsoString(exceptionEnd, displayTimeZone)
                : null,
              is_all_day: exceptionAllDay,
              exception_id: requestAction === "add" ? null : requestExceptionId,
            };

      if (requestType === "exception" && (!exceptionStart || !exceptionEnd)) {
        setIsSubmittingRequest(false);
        return;
      }
      const response = await fetch(`/api/availability/schedule-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: effectiveStaffId,
          payload,
          reason: requestReason || null,
        }),
      });

      if (response.ok) {
        setRequestType("weekly");
        setRequestAction("add");
        setRequestWeekday("1");
        setRequestStartTime("09:00");
        setRequestEndTime("17:00");
        setRequestBlockId("");
        setExceptionType("time_off");
        setExceptionStart("");
        setExceptionEnd("");
        setExceptionAllDay(false);
        setRequestExceptionId("");
        setRequestReason("");
        await fetchRequests();
      }
    } catch (error) {
      console.error("Error submitting request:", error);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const activeSchedule = useMemo(
    () => schedules.find((schedule) => schedule.id === activeScheduleId),
    [schedules, activeScheduleId],
  );

  useEffect(() => {
    if (!activeSchedule) {
      setScheduleLimits({
        maxSlotsPerDay: "",
        maxBookingsPerDay: "",
        maxBookingsPerCustomer: "",
      });
      return;
    }
    setScheduleLimits({
      maxSlotsPerDay:
        activeSchedule.max_slots_per_day !== null &&
        activeSchedule.max_slots_per_day !== undefined
          ? String(activeSchedule.max_slots_per_day)
          : "",
      maxBookingsPerDay:
        activeSchedule.max_bookings_per_day !== null &&
        activeSchedule.max_bookings_per_day !== undefined
          ? String(activeSchedule.max_bookings_per_day)
          : "",
      maxBookingsPerCustomer:
        activeSchedule.max_bookings_per_customer !== null &&
        activeSchedule.max_bookings_per_customer !== undefined
          ? String(activeSchedule.max_bookings_per_customer)
          : "",
    });
    setNewScheduleTimezone(activeSchedule.timezone || displayTimeZone);
  }, [
    activeSchedule?.id,
    activeSchedule?.timezone,
    activeSchedule?.max_slots_per_day,
    activeSchedule?.max_bookings_per_day,
    activeSchedule?.max_bookings_per_customer,
    displayTimeZone,
  ]);

  const requestBlockOptions = useMemo(
    () =>
      workBlocks.map((block) => ({
        id: block.id,
        label: `${
          DAYS_OF_WEEK.find((day) => day.value === block.weekday.toString())
            ?.label || "Day"
        } ${block.start_time_local} - ${block.end_time_local}`,
      })),
    [workBlocks],
  );

  const requestExceptionOptions = useMemo(
    () =>
      exceptions.map((exception) => ({
        id: exception.id,
        label: `${
          exception.type?.replace("_", " ") || "Exception"
        } ${formatDateTimeInTimeZone(
          exception.start_utc,
          displayTimeZone,
        )} - ${formatDateTimeInTimeZone(exception.end_utc, displayTimeZone)}`,
      })),
    [displayTimeZone, exceptions],
  );

  return (
    <div className="space-y-4">
      {canSelectStaff && (
        <Card>
          <CardHeader>
            <CardTitle>Staff Selection</CardTitle>
            <CardDescription>Select a staff member to manage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Staff member</Label>
              <Select
                value={selectedStaffId || ""}
                onValueChange={setSelectedStaffId}
                disabled={isLoadingStaff || staffOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoadingStaff ? "Loading staff..." : "Select staff"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {staffOptions.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.full_name || "Staff member"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {staffLoadError && (
              <p className="text-sm text-destructive">{staffLoadError}</p>
            )}
            {!staffLoadError &&
              !isLoadingStaff &&
              staffOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No staff accounts found.
                </p>
              )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="weekly">Weekly Schedule</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
          <TabsTrigger value="requests" onClick={fetchRequests}>
            Requests
          </TabsTrigger>
        </TabsList>

      <TabsContent value="weekly" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Schedule Template</CardTitle>
            <CardDescription>Weekly working hours and breaks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Times shown in {displayTimeZone}
            </p>
            {schedules.length === 0 ? (
              isAdmin ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Schedule timezone</Label>
                    <Input
                      value={newScheduleTimezone}
                      onChange={(e) => setNewScheduleTimezone(e.target.value)}
                      placeholder="Asia/Phnom_Penh"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Max slots per day</Label>
                      <Input
                        type="number"
                        min="0"
                        value={scheduleLimits.maxSlotsPerDay}
                        onChange={(e) =>
                          setScheduleLimits((prev) => ({
                            ...prev,
                            maxSlotsPerDay: e.target.value,
                          }))
                        }
                        placeholder="Leave blank for unlimited"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max bookings per day</Label>
                      <Input
                        type="number"
                        min="0"
                        value={scheduleLimits.maxBookingsPerDay}
                        onChange={(e) =>
                          setScheduleLimits((prev) => ({
                            ...prev,
                            maxBookingsPerDay: e.target.value,
                          }))
                        }
                        placeholder="Leave blank for unlimited"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max bookings per customer</Label>
                      <Input
                        type="number"
                        min="0"
                        value={scheduleLimits.maxBookingsPerCustomer}
                        onChange={(e) =>
                          setScheduleLimits((prev) => ({
                            ...prev,
                            maxBookingsPerCustomer: e.target.value,
                          }))
                        }
                        placeholder="Leave blank for unlimited"
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateSchedule}>Create Schedule</Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  The admin will set your schedule. No schedule has been
                  assigned yet.
                </p>
              )
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Active schedule</Label>
                  <Select
                    value={activeScheduleId || ""}
                    onValueChange={(v) => setActiveScheduleId(v)}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      {schedules.map((schedule) => (
                        <SelectItem key={schedule.id} value={schedule.id}>
                          {schedule.is_default ? "Default" : "Seasonal"} (
                          {schedule.timezone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                    <div>Timezone: {activeSchedule?.timezone || "UTC"}</div>
                    <div>
                      Effective: {activeSchedule?.effective_from || "Always"} -{" "}
                      {activeSchedule?.effective_to || ""}
                    </div>
                    {!isAdmin && (
                      <div className="mt-2 text-xs">
                        Schedules are managed by the admin.
                    </div>
                  )}
                  <div className="mt-2 text-xs">
                    Max slots/day:{" "}
                    {activeSchedule?.max_slots_per_day ?? "Unlimited"}
                  </div>
                  <div className="text-xs">
                    Max bookings/day:{" "}
                    {activeSchedule?.max_bookings_per_day ?? "Unlimited"}
                  </div>
                  <div className="text-xs">
                    Max bookings/customer:{" "}
                    {activeSchedule?.max_bookings_per_customer ?? "Unlimited"}
                  </div>
                </div>
              </div>
            )}
            {schedules.length > 0 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Schedule timezone</Label>
                  <Input
                    value={newScheduleTimezone}
                    onChange={(e) => setNewScheduleTimezone(e.target.value)}
                    placeholder="Asia/Phnom_Penh"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Max slots per day</Label>
                    <Input
                      type="number"
                      min="0"
                      value={scheduleLimits.maxSlotsPerDay}
                      onChange={(e) =>
                        setScheduleLimits((prev) => ({
                          ...prev,
                          maxSlotsPerDay: e.target.value,
                        }))
                      }
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max bookings per day</Label>
                    <Input
                      type="number"
                      min="0"
                      value={scheduleLimits.maxBookingsPerDay}
                      onChange={(e) =>
                        setScheduleLimits((prev) => ({
                          ...prev,
                          maxBookingsPerDay: e.target.value,
                        }))
                      }
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max bookings per customer</Label>
                    <Input
                      type="number"
                      min="0"
                      value={scheduleLimits.maxBookingsPerCustomer}
                      onChange={(e) =>
                        setScheduleLimits((prev) => ({
                          ...prev,
                          maxBookingsPerCustomer: e.target.value,
                        }))
                      }
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={handleUpdateSchedule}
                      disabled={isSavingSchedule || !activeScheduleId}
                    >
                      {isSavingSchedule ? "Saving..." : "Save Schedule"}
                    </Button>
                    {scheduleSaveError && (
                      <p className="text-sm text-destructive">
                        {scheduleSaveError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Working Blocks</CardTitle>
            <CardDescription>Define working hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Day of week</Label>
                    <Select
                      value={newWorkBlock.weekday}
                      onValueChange={(v) =>
                        setNewWorkBlock({ ...newWorkBlock, weekday: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Start time</Label>
                    <Input
                      type="time"
                      value={newWorkBlock.start_time_local}
                      onChange={(e) =>
                        setNewWorkBlock({
                          ...newWorkBlock,
                          start_time_local: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End time</Label>
                    <Input
                      type="time"
                      value={newWorkBlock.end_time_local}
                      onChange={(e) =>
                        setNewWorkBlock({
                          ...newWorkBlock,
                          end_time_local: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <Button onClick={handleAddWorkBlock} disabled={!activeScheduleId}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Work Block
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Working blocks are managed by the admin.
              </p>
            )}
            {workBlocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No work blocks yet.
              </p>
            ) : (
              <div className="space-y-2">
                {workBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge>
                        {
                          DAYS_OF_WEEK.find(
                            (day) => day.value === block.weekday.toString(),
                          )?.label
                        }
                      </Badge>
                      <span className="text-sm">
                        {block.start_time_local} - {block.end_time_local}
                      </span>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteWorkBlock(block.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Break Blocks</CardTitle>
            <CardDescription>Add breaks inside working hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Day of week</Label>
                    <Select
                      value={newBreakBlock.weekday}
                      onValueChange={(v) =>
                        setNewBreakBlock({ ...newBreakBlock, weekday: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Start time</Label>
                    <Input
                      type="time"
                      value={newBreakBlock.start_time_local}
                      onChange={(e) =>
                        setNewBreakBlock({
                          ...newBreakBlock,
                          start_time_local: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End time</Label>
                    <Input
                      type="time"
                      value={newBreakBlock.end_time_local}
                      onChange={(e) =>
                        setNewBreakBlock({
                          ...newBreakBlock,
                          end_time_local: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <Button onClick={handleAddBreakBlock} disabled={!activeScheduleId}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Break Block
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Breaks are managed by the admin.
              </p>
            )}
            {breakBlocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No break blocks yet.
              </p>
            ) : (
              <div className="space-y-2">
                {breakBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge>
                        {
                          DAYS_OF_WEEK.find(
                            (day) => day.value === block.weekday.toString(),
                          )?.label
                        }
                      </Badge>
                      <span className="text-sm">
                        {block.start_time_local} - {block.end_time_local}
                      </span>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBreakBlock(block.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="exceptions" className="space-y-6">
        {isAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>Add Exception</CardTitle>
              <CardDescription>
                Time off, blocked time, or extra availability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newException.type}
                    onValueChange={(v) =>
                      setNewException({ ...newException, type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time_off">Time off</SelectItem>
                      <SelectItem value="blocked_time">Blocked time</SelectItem>
                      <SelectItem value="extra_availability">
                        Extra availability
                      </SelectItem>
                      <SelectItem value="override_day">Override day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>All day</Label>
                  <Select
                    value={newException.is_all_day ? "true" : "false"}
                    onValueChange={(v) =>
                      setNewException({
                        ...newException,
                        is_all_day: v === "true",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">No</SelectItem>
                      <SelectItem value="true">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start ({displayTimeZone})</Label>
                  <Input
                    type="datetime-local"
                    value={newException.start_utc}
                    onChange={(e) =>
                      setNewException({
                        ...newException,
                        start_utc: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End ({displayTimeZone})</Label>
                  <Input
                    type="datetime-local"
                    value={newException.end_utc}
                    onChange={(e) =>
                      setNewException({
                        ...newException,
                        end_utc: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  value={newException.reason}
                  onChange={(e) =>
                    setNewException({ ...newException, reason: e.target.value })
                  }
                  placeholder="Optional reason"
                />
              </div>
              <Button onClick={handleAddException}>
                <Plus className="mr-2 h-4 w-4" />
                Add Exception
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Exceptions Are Admin-Only</CardTitle>
              <CardDescription>
                Submit a time-off request from the Requests tab.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Current Exceptions</CardTitle>
            <CardDescription>Time off and special openings</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : exceptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No exceptions set.
              </p>
            ) : (
              <div className="space-y-2">
                {exceptions.map((exception) => (
                  <div
                    key={exception.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge>{exception.type?.replace("_", " ")}</Badge>
                        <span className="text-sm">
                          {formatDateTimeInTimeZone(
                            exception.start_utc,
                            displayTimeZone,
                          )}{" "}
                          -{" "}
                          {formatDateTimeInTimeZone(
                            exception.end_utc,
                            displayTimeZone,
                          )}
                        </span>
                      </div>
                      {exception.reason && (
                        <p className="text-sm text-muted-foreground">
                          {exception.reason}
                        </p>
                      )}
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteException(exception.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="requests" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {isAdmin ? "Request Schedule Change" : "Request Time Off"}
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? "Submit a schedule change for admin approval"
                : "Submit day-off or time-off requests for approval"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Request type</Label>
                    <Select
                      value={requestType}
                      onValueChange={(v) =>
                        setRequestType(v as "weekly" | "exception")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly schedule</SelectItem>
                        <SelectItem value="exception">Exception</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Action</Label>
                    <Select
                      value={requestAction}
                      onValueChange={(v) =>
                        setRequestAction(v as "add" | "update" | "delete")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Add</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {requestType === "weekly" ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Day of week</Label>
                      <Select
                        value={requestWeekday}
                        onValueChange={setRequestWeekday}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map((day) => (
                            <SelectItem key={day.value} value={day.value}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Start time</Label>
                      <Input
                        type="time"
                        value={requestStartTime}
                        onChange={(e) => setRequestStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End time</Label>
                      <Input
                        type="time"
                        value={requestEndTime}
                        onChange={(e) => setRequestEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Exception type</Label>
                      <Select
                        value={exceptionType}
                        onValueChange={(v) =>
                          setExceptionType(
                            v as
                              | "time_off"
                              | "blocked_time"
                              | "extra_availability"
                              | "override_day",
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="time_off">Time off</SelectItem>
                          <SelectItem value="blocked_time">Blocked time</SelectItem>
                          <SelectItem value="extra_availability">
                            Extra availability
                          </SelectItem>
                          <SelectItem value="override_day">Override day</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>All day</Label>
                      <Select
                        value={exceptionAllDay ? "true" : "false"}
                        onValueChange={(v) => setExceptionAllDay(v === "true")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Start ({displayTimeZone})</Label>
                      <Input
                        type="datetime-local"
                        value={exceptionStart}
                        onChange={(e) => setExceptionStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End ({displayTimeZone})</Label>
                      <Input
                        type="datetime-local"
                        value={exceptionEnd}
                        onChange={(e) => setExceptionEnd(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                {requestType === "weekly" && requestAction !== "add" && (
                  <div className="space-y-2">
                    <Label>Work block</Label>
                    <Select
                      value={requestBlockId}
                      onValueChange={setRequestBlockId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a work block" />
                      </SelectTrigger>
                      <SelectContent>
                        {requestBlockOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {requestType === "exception" && requestAction !== "add" && (
                  <div className="space-y-2">
                    <Label>Exception</Label>
                    <Select
                      value={requestExceptionId}
                      onValueChange={setRequestExceptionId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an exception" />
                      </SelectTrigger>
                      <SelectContent>
                        {requestExceptionOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="Optional reason for the request"
                  />
                </div>
                <Button
                  onClick={handleSubmitRequest}
                  disabled={isSubmittingRequest}
                >
                  Submit Request
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  Staff can only request day off or time off. Requests are sent
                  to admin for approval.
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>All day</Label>
                    <Select
                      value={exceptionAllDay ? "true" : "false"}
                      onValueChange={(v) => setExceptionAllDay(v === "true")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Start ({displayTimeZone})</Label>
                    <Input
                      type="datetime-local"
                      value={exceptionStart}
                      onChange={(e) => setExceptionStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End ({displayTimeZone})</Label>
                    <Input
                      type="datetime-local"
                      value={exceptionEnd}
                      onChange={(e) => setExceptionEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="Optional reason for the request"
                  />
                </div>
                <Button
                  onClick={handleSubmitRequest}
                  disabled={isSubmittingRequest}
                >
                  Submit Request
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>My Requests</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRequests}
                disabled={isLoadingRequests}
              >
                {isLoadingRequests ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
            <CardDescription>Track approval status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRequests ? (
              <p className="text-sm text-muted-foreground">
                Loading requests...
              </p>
            ) : requestError ? (
              <p className="text-sm text-destructive">{requestError}</p>
            ) : requests.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm font-medium">No requests yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Submit a schedule change above to start the approval flow.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => {
                  const payload = request.payload || {};
                  const target = payload.target as string | undefined;
                  const action = payload.action as string | undefined;
                  const createdAt = request.created_at
                    ? formatDateTimeInTimeZone(
                        request.created_at,
                        displayTimeZone,
                      )
                    : null;

                  return (
                    <div
                      key={request.id}
                      className="rounded-lg border bg-background/50 p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            Schedule request
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {request.id}
                          </div>
                          {createdAt && (
                            <div className="text-xs text-muted-foreground">
                              Submitted: {createdAt}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant={
                            request.status === "approved"
                              ? "default"
                              : request.status === "rejected"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>

                      {(target || action) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {target && (
                            <Badge variant="outline">
                              Target: {target.replace("_", " ")}
                            </Badge>
                          )}
                          {action && (
                            <Badge variant="outline">Action: {action}</Badge>
                          )}
                        </div>
                      )}

                      {request.reason && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Reason: {request.reason}
                        </p>
                      )}

                      {request.review_note && (
                        <div className="mt-3 rounded-md bg-muted/40 p-3">
                          <p className="text-xs font-medium">Review note</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {request.review_note}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
    </div>
  );
}
