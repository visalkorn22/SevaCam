"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMinutes,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  Moon,
  Sparkles,
  Sun,
  Sunrise,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// --- Types --------------------------------------------------------------------

interface BookingCustomer {
  id: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  timezone?: string | null;
  role?: "customer" | "staff" | "admin" | "superadmin";
}

interface BookingStaff {
  id: string;
  name: string;
  avatar_url?: string | null;
  price_override?: number | string | null;
  deposit_override?: number | string | null;
  duration_override?: number | string | null;
  buffer_override?: number | string | null;
  capacity_override?: number | string | null;
}

interface BookingService {
  id: string;
  name: string;
  duration_minutes: number;
  price: number | string;
  deposit_amount: number | string;
  max_capacity?: number | string | null;
}

interface AvailableSlot {
  start_time: string;
  end_time: string;
  staff_id: string;
  staff_name?: string | null;
}

interface BookingFormProps {
  service: BookingService;
  staff: BookingStaff[];
  customer: BookingCustomer;
  bookingSource?: "web" | "social";
}

// --- Constants ----------------------------------------------------------------

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TIME_PERIODS = [
  {
    key: "morning",
    label: "Morning",
    subLabel: "Before noon",
    Icon: Sunrise,
    iconColor: "text-amber-400",
    bgColor: "bg-amber-400/10",
    borderColor: "border-amber-400/20",
    startHour: 0,
    endHour: 12,
  },
  {
    key: "afternoon",
    label: "Afternoon",
    subLabel: "12 PM - 5 PM",
    Icon: Sun,
    iconColor: "text-orange-400",
    bgColor: "bg-orange-400/10",
    borderColor: "border-orange-400/20",
    startHour: 12,
    endHour: 17,
  },
  {
    key: "evening",
    label: "Evening",
    subLabel: "After 5 PM",
    Icon: Moon,
    iconColor: "text-violet-400",
    bgColor: "bg-violet-400/10",
    borderColor: "border-violet-400/20",
    startHour: 17,
    endHour: 24,
  },
] as const;

// --- Helpers ------------------------------------------------------------------

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

const formatSlotTime = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "h:mm a");
};

const getSlotHour = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 0;
  return d.getHours();
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (!parts.length) return "";
  return parts
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
};

// --- StepIndicator ------------------------------------------------------------

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: "Provider", Icon: User },
    { label: "Date & Time", Icon: CalendarDays },
    { label: "Confirm", Icon: Check },
  ];
  return (
    <div className="mb-6 flex items-center gap-0">
      {steps.map(({ label, Icon }, i) => {
        const step = i + 1;
        const isDone = step < currentStep;
        const isActive = step === currentStep;
        return (
          <div key={step} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="relative flex w-full items-center">
              {i > 0 && (
                <div
                  className={cn(
                    "h-px flex-1 transition-colors duration-500",
                    isDone || isActive
                      ? "bg-(--booking-accent)/60"
                      : "bg-white/10",
                  )}
                />
              )}
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300",
                  isDone
                    ? "border-(--booking-accent) bg-(--booking-accent) text-white"
                    : isActive
                      ? "border-(--booking-accent) bg-(--booking-accent)/15 text-(--booking-accent)"
                      : "border-white/15 bg-white/5 text-slate-500",
                )}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "h-px flex-1 transition-colors duration-500",
                    isDone ? "bg-(--booking-accent)/60" : "bg-white/10",
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "text-[9px] font-semibold uppercase tracking-widest transition-colors",
                isActive
                  ? "text-slate-200"
                  : isDone
                    ? "text-(--booking-accent)/70"
                    : "text-slate-600",
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// --- SlotPeriodSection --------------------------------------------------------

function SlotPeriodSection({
  period,
  slots,
  selectedSlot,
  durationMinutes,
  onSelect,
}: {
  period: (typeof TIME_PERIODS)[number];
  slots: AvailableSlot[];
  selectedSlot: string;
  durationMinutes: number;
  onSelect: (startTime: string) => void;
}) {
  if (slots.length === 0) return null;
  const { Icon, iconColor, bgColor, borderColor, label, subLabel } = period;

  return (
    <div className="space-y-2">
      <div
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${bgColor} ${borderColor}`}
      >
        <Icon className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} />
        <span className="text-xs font-semibold text-slate-200">{label}</span>
        <span className="text-[10px] text-slate-500">{subLabel}</span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${bgColor} ${iconColor}`}
        >
          {slots.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map((slot) => {
          const isSelected = selectedSlot === slot.start_time;
          const startLabel = formatSlotTime(slot.start_time);
          const endDate = addMinutes(
            new Date(slot.start_time),
            durationMinutes,
          );
          const endLabel = format(endDate, "h:mm a");

          return (
            <button
              key={slot.start_time}
              type="button"
              onClick={() => onSelect(slot.start_time)}
              className={cn(
                "flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
                isSelected
                  ? "border-(--booking-accent) bg-(--booking-accent)/15 shadow-[0_0_0_1px_var(--booking-accent)]"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8",
              )}
              aria-pressed={isSelected}
            >
              <span
                className={cn(
                  "text-sm font-bold leading-tight",
                  isSelected ? "text-white" : "text-slate-100",
                )}
              >
                {startLabel}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[10px] leading-none",
                  isSelected ? "text-(--booking-accent)" : "text-slate-500",
                )}
              >
                ends {endLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- BookingCalendar ----------------------------------------------------------

function BookingCalendar({
  calendarMonth,
  calendarDays,
  selectedDate,
  monthAvailability,
  isLoadingCalendar,
  selectedStaffId,
  today,
  onPrevMonth,
  onNextMonth,
  onDateSelect,
}: {
  calendarMonth: Date;
  calendarDays: Date[];
  selectedDate: Date | null;
  monthAvailability: Record<string, boolean>;
  isLoadingCalendar: boolean;
  selectedStaffId: string;
  today: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDateSelect: (d: Date) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          disabled={isLoadingCalendar}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:border-white/30 hover:text-white disabled:opacity-40"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          {isLoadingCalendar && (
            <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
          )}
          <p className="text-sm font-semibold text-slate-100">
            {format(calendarMonth, "MMMM yyyy")}
          </p>
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          disabled={isLoadingCalendar}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:border-white/30 hover:text-white disabled:opacity-40"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="text-[10px] font-semibold uppercase tracking-wider text-slate-500"
          >
            {label.charAt(0)}
          </span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-y-1">
        {calendarDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const isInMonth = isSameMonth(day, calendarMonth);
          const isPast = isBefore(day, today);
          const hasSlots = monthAvailability[key];
          const isUnavailable = !hasSlots;
          const isDisabled = !selectedStaffId || !isInMonth || isPast;
          const isSelected = selectedDate
            ? isSameDay(day, selectedDate)
            : false;
          const isToday = isSameDay(day, today);

          return (
            <div key={key} className="flex justify-center">
              <button
                type="button"
                onClick={() => onDateSelect(day)}
                disabled={isDisabled}
                className={cn(
                  "relative flex h-9 w-9 flex-col items-center justify-center rounded-full text-[13px] font-medium transition-all duration-150",
                  isSelected
                    ? "bg-(--booking-accent) font-bold text-white shadow-lg"
                    : isToday && !isDisabled
                      ? "text-(--booking-accent) ring-1 ring-(--booking-accent)/50"
                      : "text-slate-200",
                  isDisabled && "cursor-not-allowed opacity-20",
                  !isDisabled &&
                    isUnavailable &&
                    !isSelected &&
                    "text-slate-500 hover:bg-white/5 hover:text-slate-300",
                  !isDisabled &&
                    !isUnavailable &&
                    !isSelected &&
                    "hover:bg-white/10 hover:text-white",
                  !isInMonth && "pointer-events-none opacity-0",
                )}
                aria-pressed={isSelected}
                aria-label={`${format(day, "MMMM d, yyyy")}${hasSlots ? ", available" : ", no open times"}`}
              >
                {format(day, "d")}
                {isInMonth && !isPast && hasSlots && !isSelected && (
                  <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-emerald-400/70" />
                )}
                {isInMonth && !isPast && !hasSlots && !isSelected && (
                  <span className="absolute bottom-1 h-px w-3 rounded-full bg-white/10" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-white/5 pt-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
          Available
        </span>
        <span className="flex items-center gap-1">
          <span className="h-px w-3 rounded-full bg-white/20" />
          No open times
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-(--booking-accent)" />
          Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full ring-1 ring-(--booking-accent)/50" />
          Today
        </span>
      </div>
    </div>
  );
}

// --- Main Component -----------------------------------------------------------

export function BookingForm({
  service,
  staff,
  customer,
  bookingSource = "web",
}: BookingFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [monthAvailability, setMonthAvailability] = useState<
    Record<string, boolean>
  >({});
  const [calendarMonth, setCalendarMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );
  const [nextAvailableDate, setNextAvailableDate] = useState<Date | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);

  const router = useRouter();
  const timezone =
    customer.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const isStaffAccount = customer.role === "staff";
  const today = useMemo(() => startOfDay(new Date()), []);

  const selectedStaff = useMemo(
    () => staff.find((m) => m.id === selectedStaffId) ?? null,
    [staff, selectedStaffId],
  );

  const effectiveDuration = useMemo(() => {
    if (
      selectedStaff?.duration_override !== null &&
      selectedStaff?.duration_override !== undefined
    ) {
      return toNumber(
        selectedStaff.duration_override,
        service.duration_minutes,
      );
    }
    return service.duration_minutes;
  }, [service.duration_minutes, selectedStaff]);

  const effectivePrice = useMemo(() => {
    const base = toNumber(service.price, 0);
    if (
      selectedStaff?.price_override !== null &&
      selectedStaff?.price_override !== undefined
    ) {
      return toNumber(selectedStaff.price_override, base);
    }
    return base;
  }, [service.price, selectedStaff]);

  const effectiveDeposit = useMemo(() => {
    const base = toNumber(service.deposit_amount, 0);
    if (
      selectedStaff?.deposit_override !== null &&
      selectedStaff?.deposit_override !== undefined
    ) {
      return toNumber(selectedStaff.deposit_override, base);
    }
    return base;
  }, [service.deposit_amount, selectedStaff]);

  const effectiveCapacity = useMemo(() => {
    const base = toNumber(service.max_capacity, 1);
    if (
      selectedStaff?.capacity_override !== null &&
      selectedStaff?.capacity_override !== undefined
    ) {
      return toNumber(selectedStaff.capacity_override, base);
    }
    return base;
  }, [service.max_capacity, selectedStaff]);

  const amountDueNow = useMemo(() => {
    return effectiveDeposit > 0 ? effectiveDeposit : effectivePrice;
  }, [effectiveDeposit, effectivePrice]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 0 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
    });
  }, [calendarMonth]);

  const slotsByPeriod = useMemo(() => {
    const groups: Record<string, AvailableSlot[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };
    for (const slot of availableSlots) {
      const h = getSlotHour(slot.start_time);
      if (h < 12) groups.morning.push(slot);
      else if (h < 17) groups.afternoon.push(slot);
      else groups.evening.push(slot);
    }
    return groups;
  }, [availableSlots]);

  const availableDayCount = useMemo(
    () => Object.values(monthAvailability).filter(Boolean).length,
    [monthAvailability],
  );

  // API calls
  const fetchMonthAvailability = async (targetMonth: Date, staffId: string) => {
    if (!staffId) {
      setMonthAvailability({});
      setCalendarError(null);
      return;
    }
    setIsLoadingCalendar(true);
    setCalendarError(null);
    try {
      const res = await fetch(
        `/api/availability/slots-v2/month?service_id=${service.id}&year=${targetMonth.getFullYear()}&month=${targetMonth.getMonth() + 1}&timezone=${encodeURIComponent(timezone)}&staff_id=${staffId}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        setMonthAvailability({});
        setCalendarError("Unable to load calendar availability right now.");
        return;
      }
      const data = (await res.json()) as Array<{
        date: string;
        has_slots: boolean;
      }>;
      const map: Record<string, boolean> = {};
      data.forEach((e) => {
        if (e?.date) map[e.date] = e.has_slots;
      });
      setMonthAvailability(map);
    } catch {
      setMonthAvailability({});
      setCalendarError("Unable to load calendar availability right now.");
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const fetchAvailableSlots = async (date: Date, staffId: string) => {
    setIsLoadingSlots(true);
    try {
      const res = await fetch(
        `/api/availability/slots-v2?service_id=${service.id}&date=${format(date, "yyyy-MM-dd")}&timezone=${encodeURIComponent(timezone)}&staff_id=${staffId}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        setAvailableSlots([]);
        return;
      }
      setAvailableSlots((await res.json()) as AvailableSlot[]);
    } catch {
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const fetchNextAvailableDate = async (date: Date, staffId: string) => {
    try {
      const res = await fetch(
        `/api/availability/slots-v2/next-available?service_id=${service.id}&timezone=${encodeURIComponent(timezone)}&staff_id=${staffId}&from_date=${format(date, "yyyy-MM-dd")}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        setNextAvailableDate(null);
        return;
      }
      const data = (await res.json()) as { date: string | null };
      setNextAvailableDate(
        data?.date ? new Date(`${data.date}T00:00:00`) : null,
      );
    } catch {
      setNextAvailableDate(null);
    }
  };

  useEffect(() => {
    if (!selectedStaffId) return;
    fetchMonthAvailability(calendarMonth, selectedStaffId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarMonth, selectedStaffId]);

  useEffect(() => {
    if (!selectedStaffId || !selectedDate) return;
    fetchAvailableSlots(selectedDate, selectedStaffId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedStaffId]);

  useEffect(() => {
    if (!selectedStaffId) {
      setNextAvailableDate(null);
      return;
    }

    if (selectedDate) {
      if (!isLoadingSlots && availableSlots.length === 0) {
        void fetchNextAvailableDate(selectedDate, selectedStaffId);
      } else if (availableSlots.length > 0) {
        setNextAvailableDate(null);
      }
      return;
    }

    if (isLoadingCalendar) return;

    if (availableDayCount === 0) {
      const monthStart = startOfMonth(calendarMonth);
      const fromDate = isBefore(monthStart, today) ? today : monthStart;
      void fetchNextAvailableDate(fromDate, selectedStaffId);
    } else {
      setNextAvailableDate(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    availableDayCount,
    availableSlots,
    calendarMonth,
    isLoadingCalendar,
    isLoadingSlots,
    selectedDate,
    selectedStaffId,
    today,
  ]);

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaffId(staffId);
    setSelectedDate(null);
    setSelectedSlot("");
    setAvailableSlots([]);
    setNextAvailableDate(null);
    setCalendarError(null);
    setCalendarMonth(startOfMonth(new Date()));
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot("");
  };

  const ensureCustomerProfile = async () => {
    if (isStaffAccount)
      throw new Error(
        "Staff accounts cannot book services. Please use a customer account.",
      );
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        full_name: customer.full_name || "Customer",
        email: customer.email,
        phone: customer.phone ?? null,
        timezone,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || "Failed to create customer");
    return data as { id: string };
  };

  const handleBooking = async () => {
    if (!selectedStaffId || !selectedSlot || !selectedDate) return;
    setIsBooking(true);
    setBookingError(null);
    setWaitlistMessage(null);
    try {
      if (!customer.email) {
        setBookingError(
          "Please add your email in your profile before booking.",
        );
        return;
      }
      const customerData = await ensureCustomerProfile();
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          service_id: service.id,
          staff_id: selectedStaffId,
          customer_id: customerData.id,
          start_time_utc: selectedSlot,
          booking_source: bookingSource,
          customer_timezone: timezone,
        }),
      });
      const booking = await res.json();
      if (!res.ok)
        throw new Error(booking?.detail || "Failed to create booking");

      if (amountDueNow > 0) {
        router.push(`/payment/${booking.id}`);
        return;
      }

      router.push(`/booking-confirmed/${booking.id}`);
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : "Failed to create booking.",
      );
    } finally {
      setIsBooking(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!selectedStaffId || !selectedDate) return;
    setIsJoiningWaitlist(true);
    setWaitlistMessage(null);
    setBookingError(null);
    try {
      if (!customer.email) {
        setBookingError(
          "Please add your email in your profile before booking.",
        );
        return;
      }
      const customerData = await ensureCustomerProfile();
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          service_id: service.id,
          customer_id: customerData.id,
          preferred_date: format(selectedDate, "yyyy-MM-dd"),
        }),
      });
      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload?.detail || "Failed to join waitlist");
      setWaitlistMessage(
        "You are on the waitlist. We will notify you when a slot opens.",
      );
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : "Failed to join waitlist.",
      );
    } finally {
      setIsJoiningWaitlist(false);
    }
  };

  const canGoStep2 = Boolean(selectedStaffId);
  const canGoStep3 = Boolean(selectedDate && selectedSlot);

  // -- Step 1: Staff ----------------------------------------------------------

  const renderStep1 = () => (
    <div className="space-y-5">
      {staff.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center">
          <User className="mx-auto mb-3 h-8 w-8 text-slate-500" />
          <p className="text-sm font-medium text-slate-300">
            No staff available
          </p>
          <p className="mt-1 text-xs text-slate-500">
            No team members are available for this service right now.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {staff.map((member) => {
            const isSelected = member.id === selectedStaffId;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => handleStaffSelect(member.id)}
                className={cn(
                  "group relative flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all duration-200",
                  isSelected
                    ? "border-(--booking-accent) bg-(--booking-accent)/10 shadow-[0_0_0_1px_var(--booking-accent)]"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8",
                )}
                aria-pressed={isSelected}
              >
                {isSelected && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-(--booking-accent)">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
                <div
                  className={cn(
                    "flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 transition-all",
                    isSelected
                      ? "border-(--booking-accent)"
                      : "border-white/10 group-hover:border-white/20",
                  )}
                >
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-slate-200">
                      {getInitials(member.name || "?")}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    {member.name}
                  </p>
                  {member.price_override ? (
                    <p
                      className={cn(
                        "mt-0.5 text-xs",
                        isSelected
                          ? "text-(--booking-accent)"
                          : "text-slate-400",
                      )}
                    >
                      {formatCurrency(toNumber(member.price_override))}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Standard rate
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {staff.length > 0 && (
        <button
          type="button"
          onClick={() => setStep(2)}
          disabled={!canGoStep2}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-all duration-200",
            canGoStep2
              ? "bg-(--booking-accent) text-white hover:opacity-90"
              : "cursor-not-allowed bg-white/10 text-slate-500",
          )}
        >
          Choose Date & Time <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  // -- Step 2: Date + Time ----------------------------------------------------

  const renderStep2 = () => (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
        <CalendarDays className="h-4 w-4 shrink-0 text-(--booking-accent)" />
        <span className="text-xs text-slate-400">
          {selectedDate ? (
            <>
              <span className="font-semibold text-slate-100">
                {format(selectedDate, "EEEE, MMMM d")}
              </span>{" "}
              - pick a time below
            </>
          ) : selectedStaff ? (
            "Pick any date to inspect times. Green dots already have openings."
          ) : (
            "Select a provider to load the calendar"
          )}
        </span>
        {selectedDate && (
          <button
            type="button"
            onClick={() => {
              setSelectedDate(null);
              setSelectedSlot("");
              setAvailableSlots([]);
            }}
            className="ml-auto text-[10px] text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
          >
            change
          </button>
        )}
      </div>

      <div
        className={cn(
          "rounded-2xl border px-4 py-3",
          calendarError
            ? "border-rose-500/30 bg-rose-500/10"
            : availableDayCount > 0
              ? "border-emerald-500/20 bg-emerald-500/10"
              : "border-amber-400/20 bg-amber-400/10",
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Calendar Status
            </p>
            {calendarError ? (
              <p className="text-sm font-medium text-rose-100">
                {calendarError}
              </p>
            ) : selectedStaff ? (
              <>
                <p className="text-sm font-medium text-slate-100">
                  {availableDayCount > 0
                    ? `${availableDayCount} open day${availableDayCount === 1 ? "" : "s"} in ${format(calendarMonth, "MMMM yyyy")} for ${selectedStaff.name}.`
                    : `No open days in ${format(calendarMonth, "MMMM yyyy")} for ${selectedStaff.name}.`}
                </p>
                <p className="text-xs text-slate-400">
                  {availableDayCount > 0
                    ? "Green dots already have bookable times. Dim dates can still be opened to check details."
                    : "You can still tap a date to inspect it, switch month, or jump to the next available opening."}
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-slate-100">
                Choose a provider first to load their available dates.
              </p>
            )}
          </div>

          {nextAvailableDate && !selectedDate && !calendarError ? (
            <button
              type="button"
              onClick={() => {
                setSelectedDate(nextAvailableDate);
                setCalendarMonth(startOfMonth(nextAvailableDate));
              }}
              className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Next available: {format(nextAvailableDate, "MMM d")}
            </button>
          ) : null}
        </div>
      </div>

      <BookingCalendar
        calendarMonth={calendarMonth}
        calendarDays={calendarDays}
        selectedDate={selectedDate}
        monthAvailability={monthAvailability}
        isLoadingCalendar={isLoadingCalendar}
        selectedStaffId={selectedStaffId}
        today={today}
        onPrevMonth={() => setCalendarMonth((prev) => subMonths(prev, 1))}
        onNextMonth={() => setCalendarMonth((prev) => addMonths(prev, 1))}
        onDateSelect={handleDateSelect}
      />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Available Times
          </p>
          {selectedSlot && (
            <span className="ml-auto rounded-full bg-(--booking-accent)/15 px-2.5 py-0.5 text-[11px] font-semibold text-(--booking-accent)">
              {formatSlotTime(selectedSlot)} selected
            </span>
          )}
        </div>

        {!selectedDate ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center">
            <p className="text-sm text-slate-400">
              Pick a date above to see available times
            </p>
          </div>
        ) : isLoadingSlots ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-8 rounded-xl bg-white/5" />
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-14 rounded-xl bg-white/5" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : availableSlots.length > 0 ? (
          <div
            key={`${selectedStaffId}-${selectedDate.toDateString()}`}
            className="space-y-4"
          >
            {TIME_PERIODS.map((period) => (
              <SlotPeriodSection
                key={period.key}
                period={period}
                slots={slotsByPeriod[period.key] ?? []}
                selectedSlot={selectedSlot}
                durationMinutes={effectiveDuration}
                onSelect={setSelectedSlot}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-slate-500" />
            <p className="text-sm font-medium text-slate-300">
              No slots on this date
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Try another day or join the waitlist.
            </p>
            <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              {nextAvailableDate && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(nextAvailableDate);
                    setCalendarMonth(startOfMonth(nextAvailableDate));
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Next available: {format(nextAvailableDate, "MMM d")}
                </button>
              )}
              <button
                type="button"
                onClick={handleJoinWaitlist}
                disabled={isJoiningWaitlist}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-60"
              >
                {isJoiningWaitlist ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {isJoiningWaitlist ? "Joining..." : "Join waitlist"}
              </button>
            </div>
            {waitlistMessage && (
              <p className="mt-3 text-xs text-emerald-300">{waitlistMessage}</p>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setStep(3)}
        disabled={!canGoStep3}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-all duration-200",
          canGoStep3
            ? "bg-(--booking-accent) text-white hover:opacity-90"
            : "cursor-not-allowed bg-white/10 text-slate-500",
        )}
      >
        Review Booking <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );

  // -- Step 3: Review & Confirm -----------------------------------------------

  const renderStep3 = () => {
    const slotStart = selectedSlot ? new Date(selectedSlot) : null;
    const slotEnd = slotStart ? addMinutes(slotStart, effectiveDuration) : null;

    return (
      <div className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="bg-white/5 px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Booking Summary
            </p>
          </div>
          <div className="divide-y divide-white/5">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5">
                {selectedStaff?.avatar_url ? (
                  <img
                    src={selectedStaff.avatar_url}
                    alt={selectedStaff.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-slate-200">
                    {getInitials(selectedStaff?.name ?? "?")}
                  </span>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  Provider
                </p>
                <p className="text-sm font-semibold text-slate-100">
                  {selectedStaff?.name}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <CalendarDays className="h-4 w-4 text-(--booking-accent)" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  Date & Time
                </p>
                <p className="text-sm font-semibold text-slate-100">
                  {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                </p>
                {slotStart && slotEnd && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {format(slotStart, "h:mm a")} &rarr;{" "}
                    {format(slotEnd, "h:mm a")}
                    <span className="ml-2 text-slate-500">
                      ({effectiveDuration} min)
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-4 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <CreditCard className="h-4 w-4 text-(--booking-accent)" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  Pricing
                </p>
                <div className="mt-1.5 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Service</span>
                    <span className="font-semibold text-slate-100">
                      {formatCurrency(effectivePrice)}
                    </span>
                  </div>
                  {effectiveDeposit > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Deposit due now</span>
                      <span className="font-semibold text-(--booking-accent)">
                        {formatCurrency(effectiveDeposit)}
                      </span>
                    </div>
                  )}
                  {effectiveCapacity > 1 && (
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Group capacity</span>
                      <span>Up to {effectiveCapacity} people</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          Times shown in your timezone:{" "}
          <span className="font-medium text-slate-400">{timezone}</span>
        </p>

        {bookingError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {bookingError}
          </div>
        )}
        {waitlistMessage && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {waitlistMessage}
          </div>
        )}

        <button
          type="button"
          onClick={handleBooking}
          disabled={isBooking}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold tracking-wide transition-all duration-200",
            isBooking
              ? "cursor-not-allowed bg-white/10 text-slate-400"
              : "bg-(--booking-accent) text-white hover:opacity-90",
          )}
        >
          {isBooking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Processing...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />{" "}
              {amountDueNow > 0
                ? "Confirm and Continue to Payment"
                : "Confirm Booking"}
            </>
          )}
        </button>
      </div>
    );
  };

  // -- Render -----------------------------------------------------------------

  return (
    <div className="text-slate-100">
      {isStaffAccount && (
        <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          Staff accounts cannot book services. Please switch to a customer
          account.
        </div>
      )}

      <StepIndicator currentStep={step} />

      {step > 1 && (
        <button
          type="button"
          onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
          className="mb-4 flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-slate-200"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
      )}

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
}

