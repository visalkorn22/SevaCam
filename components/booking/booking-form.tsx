"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Loader2,
  MapPin,
  Moon,
  Sun,
  Sunrise,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { resolveAvatarUrl } from "@/lib/utils/avatar";
import { StarRating } from "@/components/ui/star-rating";
import { formatTimeInTimeZone, getHourInTimeZone } from "@/lib/timezone";
import BranchSelectionStep, {
  type BranchLocation,
} from "./BranchSelectionStep";
import dynamic from "next/dynamic";
const LocationMapView = dynamic(
  () => import("@/components/booking/LocationMapView"),
  { ssr: false },
);

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
  skills?: string[];
  bio?: string | null;
  average_rating?: number | null;
  review_count?: number;
  completed_bookings?: number;
  experience_level?: string | null;
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
  locations?: BranchLocation[];
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

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const FORM_ART_CLASSES = [
  "sevacam-art-stones",
  "sevacam-art-sanctuary",
  "sevacam-art-dining",
  "sevacam-art-ritual",
  "sevacam-art-chamber",
  "sevacam-art-botanical",
] as const;

const getFormArtClass = (seed: string) => {
  const total = seed.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return FORM_ART_CLASSES[total % FORM_ART_CLASSES.length];
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (!parts.length) return "";
  return parts
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
};

const SECTION_HEADING_CLASS = "text-2xl font-medium text-(--text-primary)";
const SECTION_LABEL_CLASS = "sevacam-booking-label text-(--text-secondary)";
const PANEL_CLASS = "sevacam-booking-card";
const ACTION_BAR_CLASS =
  "sevacam-booking-action-bar mt-6 flex flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between";
const PRIMARY_ACTION_CLASS =
  "sevacam-booking-primary-action inline-flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] disabled:cursor-not-allowed";
const SECONDARY_ACTION_CLASS =
  "sevacam-booking-secondary-action inline-flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] disabled:cursor-not-allowed";

// --- BookingStepIndicator -----------------------------------------------------

function BookingStepIndicator({
  currentStep,
  canGoStep2,
  canGoStep3,
  onStepChange,
}: {
  currentStep: number;
  canGoStep2: boolean;
  canGoStep3: boolean;
  onStepChange: (step: 1 | 2 | 3) => void;
}) {
  const steps = [
    { label: "Curator", step: 1 as const },
    { label: "Date & time", step: 2 as const },
    { label: "Confirm", step: 3 as const },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-start">
        {steps.map(({ label, step }, i) => {
          const isDone = step < currentStep;
          const isActive = step === currentStep;
          const isReachable =
            step === 1 ||
            (step === 2 && canGoStep2) ||
            (step === 3 && canGoStep3);

          return (
            <div key={step} className="flex items-start">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => isReachable && onStepChange(step)}
                  disabled={!isReachable}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/25",
                    isDone || isActive
                      ? "bg-(--accent-primary) text-(--text-on-accent)"
                      : "border border-(--booking-frame) bg-(--bg-elevated) text-(--text-secondary)",
                    !isReachable &&
                      "cursor-not-allowed border-(--booking-frame) bg-(--booking-muted-surface) text-(--booking-muted-text)",
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" /> : step}
                </button>
                <span
                  className={cn(
                    "sevacam-booking-label mt-1 whitespace-nowrap",
                    isActive
                      ? "text-(--text-primary)"
                      : isDone
                        ? "text-(--accent-primary)"
                        : "text-(--booking-muted-text)",
                  )}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 mt-3 h-px w-16 flex-1 transition-colors duration-300 sm:w-24",
                    isDone ? "bg-(--accent-primary)" : "bg-(--booking-frame)",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- ServiceHeaderBar ---------------------------------------------------------

function ServiceHeaderBar({
  service,
  effectivePrice,
  effectiveDuration,
}: {
  service: BookingService;
  effectivePrice: number;
  effectiveDuration: number;
}) {
  const artClass = getFormArtClass(service.id);
  return (
    <div className="mb-6 flex items-center justify-between gap-4 border-b border-(--booking-frame) pb-4">
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 shrink-0 rounded-xl ${artClass}`} />
        <p className="text-sm font-medium text-(--text-primary)">
          {service.name}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-(--text-primary)">
          {formatCurrency(effectivePrice)}
        </p>
        <p className="text-[0.65rem] text-(--text-secondary)">
          {formatDuration(effectiveDuration)}
        </p>
      </div>
    </div>
  );
}

// --- SlotPeriodSection --------------------------------------------------------

function SlotPeriodSection({
  period,
  slots,
  selectedSlot,
  timeZone,
  onSelect,
}: {
  period: (typeof TIME_PERIODS)[number];
  slots: AvailableSlot[];
  selectedSlot: string;
  timeZone: string;
  onSelect: (startTime: string) => void;
}) {
  if (slots.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className={SECTION_LABEL_CLASS}>{period.label}</p>
      <div className="grid grid-cols-4 gap-2">
        {slots.map((slot) => {
          const isSelected = selectedSlot === slot.start_time;
          const startLabel = formatTimeInTimeZone(slot.start_time, timeZone);
          return (
            <button
              key={slot.start_time}
              type="button"
              onClick={() => onSelect(slot.start_time)}
              className={cn(
                "rounded-xl border border-(--booking-frame) px-3 py-3 text-center text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/25",
                isSelected
                  ? "bg-(--accent-subtle) text-(--text-primary)"
                  : "bg-(--bg-elevated) text-(--text-primary) hover:bg-(--bg-overlay)",
              )}
              aria-pressed={isSelected}
            >
              {startLabel}
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
    <div className={`${PANEL_CLASS} p-4`}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          disabled={isLoadingCalendar}
          className="sevacam-interactive-card flex h-8 w-8 items-center justify-center rounded-full border border-(--booking-frame) text-(--text-primary) transition-colors hover:bg-(--bg-overlay) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/20 disabled:cursor-not-allowed disabled:border-(--booking-frame) disabled:bg-(--booking-muted-surface) disabled:text-(--booking-muted-text)"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          {isLoadingCalendar && (
            <Loader2 className="h-3 w-3 animate-spin text-(--text-secondary)" />
          )}
          <p className="text-sm font-medium text-(--text-primary)">
            {format(calendarMonth, "MMMM yyyy")}
          </p>
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          disabled={isLoadingCalendar}
          className="sevacam-interactive-card flex h-8 w-8 items-center justify-center rounded-full border border-(--booking-frame) text-(--text-primary) transition-colors hover:bg-(--bg-overlay) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/20 disabled:cursor-not-allowed disabled:border-(--booking-frame) disabled:bg-(--booking-muted-surface) disabled:text-(--booking-muted-text)"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="sevacam-booking-label text-(--text-secondary)"
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
                  "sevacam-interactive-card relative flex h-9 w-9 flex-col items-center justify-center rounded-full text-[13px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/20",
                  isSelected
                    ? "bg-(--booking-pill-selected-surface) font-medium text-(--text-primary)"
                    : isToday && !isDisabled
                      ? "bg-(--booking-pill-today-surface) text-(--accent-primary)"
                      : "text-(--text-primary)",
                  isDisabled &&
                    "cursor-not-allowed bg-(--booking-muted-surface) text-(--booking-muted-text)",
                  !isDisabled &&
                    isUnavailable &&
                    !isSelected &&
                    "text-(--text-secondary) hover:bg-(--bg-overlay) hover:text-(--text-primary)",
                  !isDisabled &&
                    !isUnavailable &&
                    !isSelected &&
                    "hover:bg-(--accent-subtle) hover:text-(--text-primary)",
                  !isInMonth && "pointer-events-none opacity-0",
                )}
                aria-pressed={isSelected}
                aria-label={`${format(day, "MMMM d, yyyy")}${hasSlots ? ", available" : ", no open times"}`}
              >
                {format(day, "d")}
                {isInMonth && !isPast && hasSlots && !isSelected && (
                  <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-(--accent-primary)" />
                )}
                {isInMonth && !isPast && !hasSlots && !isSelected && (
                  <span className="absolute bottom-1 h-px w-3 rounded-full bg-(--booking-frame)" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="sevacam-booking-pill" data-tone="available">
          Available
        </span>
        <span className="sevacam-booking-pill" data-tone="unavailable">
          No open times
        </span>
        <span className="sevacam-booking-pill" data-tone="selected">
          Selected
        </span>
        <span className="sevacam-booking-pill" data-tone="today">
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
  locations,
}: BookingFormProps) {
  const DEFAULT_BOOKING_TIMEZONE = "Asia/Phnom_Penh";
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    () => (locations?.length === 1 ? locations[0].id : null),
  );
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
  const [isAnyAvailable, setIsAnyAvailable] = useState(false);

  const router = useRouter();
  const timezone =
    customer.timezone && customer.timezone !== "UTC"
      ? customer.timezone
      : DEFAULT_BOOKING_TIMEZONE;
  const isStaffAccount = customer.role === "staff";
  const today = useMemo(() => startOfDay(new Date()), []);
  const providerSectionRef = useRef<HTMLDivElement>(null);
  const calendarSectionRef = useRef<HTMLDivElement>(null);
  const timesSectionRef = useRef<HTMLDivElement>(null);
  const confirmSectionRef = useRef<HTMLDivElement>(null);

  const selectedStaff = useMemo(
    () => staff.find((m) => m.id === selectedStaffId) ?? null,
    [staff, selectedStaffId],
  );
  const selectedLocation = useMemo(
    () =>
      locations?.find((location) => location.id === selectedLocationId) ?? null,
    [locations, selectedLocationId],
  );

  const scrollToSection = (target: HTMLDivElement | null) => {
    if (typeof window === "undefined" || !target) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  };

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

  const selectedDateLabel = selectedDate
    ? format(selectedDate, "EEE, MMM d")
    : null;
  const selectedSlotLabel = selectedSlot
    ? formatTimeInTimeZone(selectedSlot, timezone)
    : null;

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
      const h = getHourInTimeZone(slot.start_time, timezone);
      if (h < 12) groups.morning.push(slot);
      else if (h < 17) groups.afternoon.push(slot);
      else groups.evening.push(slot);
    }
    return groups;
  }, [availableSlots, timezone]);

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
    if (step === 1) scrollToSection(providerSectionRef.current);
    if (step === 2) scrollToSection(calendarSectionRef.current);
    if (step === 3) scrollToSection(confirmSectionRef.current);
  }, [step]);

  useEffect(() => {
    if (step === 2 && selectedDate) {
      scrollToSection(timesSectionRef.current);
    }
  }, [selectedDate, step]);

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
          location_id: selectedLocationId ?? undefined,
        }),
      });
      const booking = await res.json();
      if (!res.ok)
        throw new Error(booking?.detail || "Failed to create booking");

      router.push(`/payment/${booking.id}`);
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
  const hasMultipleLocations = Boolean(locations && locations.length > 1);

  // -- Step 1: Staff ----------------------------------------------------------

  const renderStep1 = () => (
    <div ref={providerSectionRef} className="sevacam-section-anchor">
      <h2 className={SECTION_HEADING_CLASS}>
        Please select your preferred staff member.
      </h2>
      <p className="mt-1 mb-6 text-sm text-(--text-secondary)">
        Availability updates based on your choice.
      </p>

      {staff.length === 0 ? (
        <div className={`${PANEL_CLASS} px-4 py-8 text-center`}>
          <User className="mx-auto mb-3 h-8 w-8 text-(--text-secondary)" />
          <p className="text-sm font-medium text-(--text-primary)">
            No staff available
          </p>
          <p className="mt-1 text-xs text-(--text-secondary)">
            No team members are available for this service right now.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {staff.map((member) => {
            const isSelected = !isAnyAvailable && member.id === selectedStaffId;
            const avatarSrc = resolveAvatarUrl(member.avatar_url);
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  setIsAnyAvailable(false);
                  handleStaffSelect(member.id);
                }}
                className={cn(
                  "sevacam-booking-card sevacam-interactive-card flex flex-col items-center gap-3 p-4 text-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/25",
                  isSelected
                    ? "sevacam-booking-card-selected"
                    : "hover:bg-(--bg-overlay)",
                )}
                aria-pressed={isSelected}
              >
                <div
                  className={cn(
                    "flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-(--bg-inset)",
                    isSelected && "bg-(--accent-subtle)",
                  )}
                >
                  {member.avatar_url ? (
                    <img
                      src={avatarSrc ?? member.avatar_url ?? undefined}
                      alt={member.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span
                      className={cn(
                        "text-lg font-medium",
                        isSelected
                          ? "text-(--accent-primary)"
                          : "text-(--text-primary)",
                      )}
                    >
                      {getInitials(member.name || "?")}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-(--text-primary)">
                    {member.name}
                  </p>
                  <p className="mt-0.5 text-[0.65rem] text-(--text-secondary)">
                    {member.experience_level || "Beginner"}
                  </p>
                  <div className="mt-1 flex items-center justify-center gap-1 text-[0.65rem] text-(--text-secondary)">
                    {member.average_rating != null ? (
                      <StarRating
                        rating={member.average_rating}
                        showValue
                        className="text-[0.65rem]"
                        valueClassName="text-[0.65rem] text-(--text-secondary)"
                      />
                    ) : (
                      <span>New profile</span>
                    )}
                  </div>
                  <p className="mt-1 text-[0.65rem] text-(--text-disabled)">
                    {member.completed_bookings ?? 0} completed booking
                    {(member.completed_bookings ?? 0) === 1 ? "" : "s"}
                  </p>
                  {member.skills && member.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                      {member.skills.slice(0, 2).map((skill) => (
                        <span
                          key={`${member.id}-${skill}`}
                          className="rounded-full border border-(--booking-frame) px-2 py-0.5 text-[0.58rem] text-(--text-secondary)"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {/* Any available card */}
          <button
            type="button"
            onClick={() => {
              setIsAnyAvailable(true);
              if (staff[0]) handleStaffSelect(staff[0].id);
            }}
            className={cn(
              "sevacam-booking-card sevacam-interactive-card flex flex-col items-center gap-3 p-4 text-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/25",
              isAnyAvailable
                ? "sevacam-booking-card-selected"
                : "hover:bg-(--bg-overlay)",
            )}
          >
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full bg-(--bg-inset)",
                isAnyAvailable && "bg-(--accent-subtle)",
              )}
            >
              <Loader2 className="h-7 w-7 text-(--text-secondary)" />
            </div>
            <div>
              <p className="text-sm font-medium text-(--text-primary)">
                Any available
              </p>
              <p className="mt-0.5 text-[0.65rem] text-(--text-secondary)">
                Pick first open slot
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Bottom action bar */}
      {staff.length > 0 && (
        <div className={ACTION_BAR_CLASS}>
          <p className="text-sm text-(--text-secondary)">
            {canGoStep2 ? (
              <>
                Chosen:{" "}
                <span className="font-medium text-(--text-primary)">
                  {isAnyAvailable
                    ? "Any available"
                    : (selectedStaff?.name ?? "")}
                </span>
              </>
            ) : (
              <span className="text-(--booking-muted-text)">
                No curator selected
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!canGoStep2}
            className={PRIMARY_ACTION_CLASS}
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  // -- Step 2: Date + Time ----------------------------------------------------

  const renderStep2 = () => (
    <div ref={calendarSectionRef} className="sevacam-section-anchor">
      <h2 className={SECTION_HEADING_CLASS}>When works for you?</h2>
      <p className="mt-1 mb-6 text-sm text-(--text-secondary)">
        Availability markers update as you choose a date.
      </p>

      {calendarError && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {calendarError}
        </div>
      )}

      {/* Side-by-side: calendar left, time slots right */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Calendar */}
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

        {/* Time slots */}
        <div ref={timesSectionRef} className="sevacam-section-anchor space-y-4">
          {!selectedDate ? (
            <div
              className={`${PANEL_CLASS} flex h-full min-h-[12rem] items-center justify-center px-4 text-center`}
            >
              <p className="text-sm text-(--text-secondary)">
                Select a date to see available times
              </p>
            </div>
          ) : isLoadingSlots ? (
            <div className="space-y-3">
              <div className="h-5 w-32 animate-pulse rounded bg-(--bg-elevated)" />
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-xl bg-(--bg-elevated)"
                  />
                ))}
              </div>
            </div>
          ) : availableSlots.length > 0 ? (
            <>
              <p className="text-sm font-medium text-(--text-primary)">
                {availableSlots.length} times on{" "}
                {format(selectedDate, "MMMM d")}
              </p>
              <div className="space-y-4">
                {TIME_PERIODS.map((period) => (
                  <SlotPeriodSection
                    key={period.key}
                    period={period}
                    slots={slotsByPeriod[period.key] ?? []}
                    selectedSlot={selectedSlot}
                    timeZone={timezone}
                    onSelect={setSelectedSlot}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className={`${PANEL_CLASS} p-4 text-center`}>
              <p className="text-sm font-medium text-(--text-primary)">
                No slots on this date
              </p>
              <p className="mt-1 text-xs text-(--text-secondary)">
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
                    className={PRIMARY_ACTION_CLASS}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    Next available: {format(nextAvailableDate, "MMM d")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleJoinWaitlist}
                  disabled={isJoiningWaitlist}
                  className={SECONDARY_ACTION_CLASS}
                >
                  {isJoiningWaitlist ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {isJoiningWaitlist ? "Joining..." : "Join waitlist"}
                </button>
              </div>
              {waitlistMessage && (
                <p className="mt-3 text-xs text-(--accent-primary)">
                  {waitlistMessage}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className={ACTION_BAR_CLASS}>
        <p className="text-sm text-(--text-secondary)">
          {selectedDate && selectedSlot ? (
            <span className="font-medium text-(--text-primary)">
              {format(selectedDate, "MMM d")} at{" "}
              {formatTimeInTimeZone(selectedSlot, timezone)}
            </span>
          ) : (
            <span className="text-(--booking-muted-text)">
              Pick a day and time
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setStep(3)}
          disabled={!canGoStep3}
          className={PRIMARY_ACTION_CLASS}
        >
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  // -- Step 3: Review & Confirm -----------------------------------------------

  const renderStep3 = () => {
    const slotStart = selectedSlot ? new Date(selectedSlot) : null;
    const remainingAfterSession =
      effectiveDeposit > 0 ? effectivePrice - effectiveDeposit : 0;

    return (
      <div ref={confirmSectionRef} className="sevacam-section-anchor">
        <h2 className={SECTION_HEADING_CLASS}>Confirm &amp; pay</h2>
        <p className="mt-1 mb-6 text-sm text-(--text-secondary)">
          Review the details below before confirming your booking.
        </p>

        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          {/* Left column */}
          <div className="space-y-6">
            {/* YOUR BOOKING */}
            <div className={`${PANEL_CLASS} p-4`}>
              <p className={`${SECTION_LABEL_CLASS} mb-4`}>Your Booking</p>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--bg-inset)">
                  {selectedStaff?.avatar_url ? (
                    <img
                      src={
                        resolveAvatarUrl(selectedStaff.avatar_url) ??
                        selectedStaff.avatar_url
                      }
                      alt={selectedStaff.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-(--text-primary)">
                      {getInitials(selectedStaff?.name ?? "?")}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-(--text-primary)">
                    {selectedStaff?.name}
                  </p>
                  <p className="mt-0.5 text-xs text-(--text-secondary)">
                    {selectedDate && format(selectedDate, "MMM d, yyyy")}
                    {slotStart &&
                      ` · ${formatTimeInTimeZone(slotStart, timezone)}`}
                    {` · ${effectiveDuration} min`}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 pl-[3.25rem] text-[0.65rem] text-(--text-secondary)">
                <span className="rounded-full bg-(--bg-inset) px-2.5 py-1">
                  {selectedStaff?.experience_level || "Beginner"}
                </span>
                <span className="rounded-full bg-(--bg-inset) px-2.5 py-1">
                  {selectedStaff?.average_rating != null ? (
                    <StarRating
                      rating={selectedStaff.average_rating}
                      showValue
                      className="text-[0.65rem]"
                      valueClassName="text-[0.65rem] text-(--text-secondary)"
                    />
                  ) : (
                    "New"
                  )}
                </span>
                <span className="rounded-full bg-(--bg-inset) px-2.5 py-1">
                  {selectedStaff?.completed_bookings ?? 0} completed
                </span>
              </div>
              {selectedStaff?.bio && (
                <p className="mt-2 pl-[3.25rem] text-xs leading-6 text-(--text-secondary)">
                  {selectedStaff.bio}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-(--booking-frame) pt-4">
                <p className="text-sm text-(--text-secondary)">
                  {service.name}
                </p>
                <p className="text-sm font-medium text-(--text-primary)">
                  {formatCurrency(effectivePrice)}
                </p>
              </div>
            </div>
          </div>

          {/* Right column: price breakdown */}
          <div className={`${PANEL_CLASS} p-4 lg:self-start`}>
            <p className={`${SECTION_LABEL_CLASS} mb-4`}>Price</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-(--text-secondary)">{service.name}</span>
                <span className="font-medium text-(--text-primary)">
                  {formatCurrency(effectivePrice)}
                </span>
              </div>
              {effectiveDeposit > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-(--text-secondary)">Deposit now</span>
                  <span className="font-medium text-(--text-primary)">
                    {formatCurrency(effectiveDeposit)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-(--text-secondary)">Service fee</span>
                <span className="text-(--text-secondary)">$0</span>
              </div>
            </div>
            <div className="mt-4 border-t border-(--booking-frame) pt-4">
              <div className="flex items-end justify-between">
                <span className="text-sm font-medium text-(--text-primary)">
                  Due now
                </span>
                <span className="text-2xl font-medium text-(--text-primary)">
                  {formatCurrency(amountDueNow)}
                </span>
              </div>
              {effectiveDeposit > 0 && remainingAfterSession > 0 && (
                <p className="mt-1 text-right text-xs text-(--text-secondary)">
                  {formatCurrency(remainingAfterSession)} after session
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Errors / messages */}
        {bookingError && (
          <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {bookingError}
          </div>
        )}
        {waitlistMessage && (
          <div className="mt-5 rounded-xl border border-(--booking-frame) bg-(--booking-pill-available-surface) px-4 py-3 text-sm text-(--accent-primary)">
            {waitlistMessage}
          </div>
        )}

        {/* Bottom action bar */}
        <div className={ACTION_BAR_CLASS}>
          <p className="text-sm text-(--text-secondary)">
            Total due now:{" "}
            <span className="font-medium text-(--text-primary)">
              {formatCurrency(amountDueNow)}
            </span>
          </p>
          <button
            type="button"
            onClick={handleBooking}
            disabled={isBooking}
            className={PRIMARY_ACTION_CLASS}
          >
            {isBooking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              <>
                Authorize payment · {formatCurrency(amountDueNow)}{" "}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // -- Render -----------------------------------------------------------------

  return (
    <div className="text-(--text-primary) -mx-2 sm:mx-0">
      {isStaffAccount && (
        <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          Staff accounts cannot book services. Please switch to a customer
          account.
        </div>
      )}

      {locations && locations.length > 1 && !selectedLocationId && (
        <BranchSelectionStep
          locations={locations}
          selectedLocationId={selectedLocationId}
          onSelect={setSelectedLocationId}
        />
      )}

      {(!locations || locations.length <= 1 || selectedLocationId) && (
        <>
          <ServiceHeaderBar
            service={service}
            effectivePrice={effectivePrice}
            effectiveDuration={effectiveDuration}
          />
          <BookingStepIndicator
            currentStep={step}
            canGoStep2={canGoStep2}
            canGoStep3={canGoStep3}
            onStepChange={setStep}
          />

          {selectedLocation && (
            <div className="mb-6 rounded-xl bg-(--bg-elevated) p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={SECTION_LABEL_CLASS}>Appointment Location</p>
                  <p className="mt-1 text-sm text-(--text-secondary)">
                    Review the branch on the map while you are still booking.
                  </p>
                </div>
                {hasMultipleLocations && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLocationId(null);
                      setStep(1);
                    }}
                    className="inline-flex items-center rounded-full border border-(--booking-frame) bg-(--bg-inset) px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-(--text-primary) transition-colors hover:bg-(--bg-overlay)"
                  >
                    Change Location
                  </button>
                )}
              </div>

              <div className="mt-4">
                {selectedLocation.latitude !== null &&
                selectedLocation.longitude !== null ? (
                  <LocationMapView
                    location={{
                      name: selectedLocation.name,
                      address: selectedLocation.address,
                      latitude: selectedLocation.latitude,
                      longitude: selectedLocation.longitude,
                    }}
                    height={200}
                    compact
                  />
                ) : (
                  <div className={`${PANEL_CLASS} p-4`}>
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-primary)" />
                      <div>
                        <p className="text-sm font-medium text-(--text-primary)">
                          {selectedLocation.name}
                        </p>
                        <p className="mt-1 text-xs text-(--text-secondary)">
                          {selectedLocation.address || "Address unavailable"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
              className="mb-4 flex items-center gap-1.5 text-xs text-(--text-secondary) transition hover:text-(--text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/20"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </button>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </>
      )}
    </div>
  );
}
