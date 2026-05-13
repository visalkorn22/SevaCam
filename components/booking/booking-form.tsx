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
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  Moon,
  Sparkles,
  Sun,
  Sunrise,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatTimeInTimeZone, getHourInTimeZone } from "@/lib/timezone";
import BranchSelectionStep, { type BranchLocation } from "./BranchSelectionStep";
import dynamic from "next/dynamic";
const LocationMapView = dynamic(
  () => import("@/components/booking/LocationMapView"),
  { ssr: false }
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

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (!parts.length) return "";
  return parts
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
};

// --- StepIndicator ------------------------------------------------------------

function StepIndicator({
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
    {
      label: "Provider",
      helper: "Choose the curator first. Price and availability update instantly.",
      Icon: User,
    },
    {
      label: "Date & Time",
      helper: "Select a day, then choose the time window that fits your schedule.",
      Icon: CalendarDays,
    },
    {
      label: "Confirm",
      helper: "Review the reservation summary, then continue to payment.",
      Icon: Check,
    },
  ];

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-0">
        {steps.map(({ label, Icon }, i) => {
          const step = (i + 1) as 1 | 2 | 3;
          const isDone = step < currentStep;
          const isActive = step === currentStep;
          const isReachable =
            step === 1 || (step === 2 && canGoStep2) || (step === 3 && canGoStep3);

          return (
            <div key={step} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="relative flex w-full items-center">
                {i > 0 && (
                  <div
                    className={cn(
                      "h-px flex-1 transition-colors duration-500",
                      isDone || isActive
                        ? "bg-(--accent-primary)/60"
                        : "bg-(--bg-inset)",
                    )}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (isReachable) onStepChange(step);
                  }}
                  disabled={!isReachable}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/25",
                    isDone
                      ? "border-transparent bg-(--accent-primary) text-[#07292d] shadow-[0_10px_22px_rgba(122,213,221,0.18)]"
                      : isActive
                        ? "border-transparent bg-(--accent-primary) text-[#07292d] shadow-[0_10px_22px_rgba(122,213,221,0.18)]"
                        : "border-(--border-subtle) bg-(--bg-inset) text-(--text-primary)/70",
                    isReachable &&
                      !isActive &&
                      "hover:-translate-y-0.5 hover:border-transparent hover:bg-(--accent-primary) hover:text-[#07292d]",
                    !isReachable && "cursor-not-allowed opacity-45",
                  )}
                >
                  {isDone ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </button>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-px flex-1 transition-colors duration-500",
                      isDone ? "bg-(--accent-primary)/60" : "bg-(--bg-inset)",
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-widest transition-colors",
                  isActive
                    ? "text-(--text-primary)/90"
                    : isDone
                      ? "text-(--accent-primary)/70"
                      : "text-(--text-secondary)/60",
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div
        aria-live="polite"
        className="rounded-[0.45rem] border border-(--border-subtle) bg-(--bg-inset) px-3.5 py-3"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-(--text-secondary)">
          Current guidance
        </p>
        <p className="mt-1 text-xs leading-5 text-(--text-secondary)">
          <span className="font-semibold text-(--text-primary)">
            Step {currentStep}:
          </span>{" "}
          {steps[currentStep - 1].helper}
        </p>
      </div>
    </div>
  );
}

function SelectionSnapshot({
  step,
  locationLabel,
  staffName,
  dateLabel,
  slotLabel,
}: {
  step: 1 | 2 | 3;
  locationLabel: string | null;
  staffName: string | null;
  dateLabel: string | null;
  slotLabel: string | null;
}) {
  const items = [
    { label: "Location", value: locationLabel, isActive: step === 1 },
    { label: "Curator", value: staffName, isActive: step === 1 },
    { label: "Date", value: dateLabel, isActive: step === 2 },
    { label: "Time", value: slotLabel, isActive: step >= 2 },
  ];

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 grid gap-2 rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) p-3"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-(--text-secondary)">
          Reservation Path
        </p>
        <span className="rounded-full bg-(--accent-primary)/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-(--accent-primary)">
          Step {step} of 3
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              "rounded-[0.45rem] px-3 py-3 transition-colors",
              item.value
                ? "bg-(--accent-primary)/8 text-(--text-primary)"
                : "bg-black/10 text-(--text-secondary)",
              item.isActive && "bg-(--accent-primary)/12",
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
              {item.label}
            </p>
            <p
              className={cn(
                "mt-1 text-sm font-medium leading-5",
                item.value ? "text-(--text-primary)" : "text-(--text-secondary)",
              )}
            >
              {item.value ?? "Waiting for selection"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- SlotPeriodSection --------------------------------------------------------

function SlotPeriodSection({
  period,
  slots,
  selectedSlot,
  durationMinutes,
  timeZone,
  onSelect,
}: {
  period: (typeof TIME_PERIODS)[number];
  slots: AvailableSlot[];
  selectedSlot: string;
  durationMinutes: number;
  timeZone: string;
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
        <span className="text-xs font-semibold text-(--text-primary)/90">{label}</span>
        <span className="text-[10px] text-(--text-secondary)/80">{subLabel}</span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${bgColor} ${iconColor}`}
        >
          {slots.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map((slot) => {
          const isSelected = selectedSlot === slot.start_time;
          const startLabel = formatTimeInTimeZone(slot.start_time, timeZone);
          const endDate = addMinutes(
            new Date(slot.start_time),
            durationMinutes,
          );
          const endLabel = formatTimeInTimeZone(endDate, timeZone);

          return (
            <button
              key={slot.start_time}
              type="button"
              onClick={() => onSelect(slot.start_time)}
              className={cn(
                "group sevacam-interactive-card flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/25",
                isSelected
                  ? "border-transparent bg-(--accent-primary) text-[#07292d] shadow-[0_16px_28px_rgba(122,213,221,0.16)]"
                  : "border-(--border-subtle) bg-(--bg-elevated) hover:border-transparent hover:bg-(--accent-primary) hover:text-[#07292d]",
              )}
              aria-pressed={isSelected}
            >
              <span
                className={cn(
                  "text-sm font-bold leading-tight",
                  isSelected
                    ? "text-[#07292d]"
                    : "text-(--text-primary) group-hover:text-[#07292d]",
                )}
              >
                {startLabel}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[10px] leading-none",
                  isSelected
                    ? "text-[#07292d]/70"
                    : "text-(--text-secondary)/80 group-hover:text-[#07292d]/70",
                )}
              >
                ends {endLabel}
              </span>
              <span
                className={cn(
                  "mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
                  isSelected
                    ? "text-[#07292d]/82"
                    : "text-(--text-secondary)/55 group-hover:text-[#07292d]/82",
                )}
              >
                {isSelected ? "Selected time" : "Tap to select"}
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
    <div className="rounded-2xl border border-(--border-muted) bg-(--bg-elevated) p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          disabled={isLoadingCalendar}
          className="sevacam-interactive-card flex h-8 w-8 items-center justify-center rounded-full border border-(--border-muted) text-(--text-primary)/80 transition hover:border-(--border-interactive) hover:bg-(--bg-overlay) hover:text-(--text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/20 disabled:opacity-40"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          {isLoadingCalendar && (
            <Loader2 className="h-3 w-3 animate-spin text-(--text-secondary)/80" />
          )}
          <p className="text-sm font-semibold text-(--text-primary)">
            {format(calendarMonth, "MMMM yyyy")}
          </p>
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          disabled={isLoadingCalendar}
          className="sevacam-interactive-card flex h-8 w-8 items-center justify-center rounded-full border border-(--border-muted) text-(--text-primary)/80 transition hover:border-(--border-interactive) hover:bg-(--bg-overlay) hover:text-(--text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/20 disabled:opacity-40"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="text-[10px] font-semibold uppercase tracking-wider text-(--text-secondary)/80"
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
                  "sevacam-interactive-card relative flex h-9 w-9 flex-col items-center justify-center rounded-full text-[13px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/20",
                  isSelected
                    ? "bg-(--accent-primary) font-bold text-[#07292d] shadow-[0_12px_24px_rgba(122,213,221,0.18)]"
                    : isToday && !isDisabled
                      ? "text-(--accent-primary) ring-1 ring-(--accent-primary)/50"
                      : "text-(--text-primary)/90",
                  isDisabled && "cursor-not-allowed opacity-20",
                  !isDisabled &&
                    isUnavailable &&
                    !isSelected &&
                    "text-(--text-secondary)/80 hover:-translate-y-0.5 hover:bg-(--bg-elevated) hover:text-(--text-primary)/80",
                  !isDisabled &&
                    !isUnavailable &&
                    !isSelected &&
                    "hover:-translate-y-0.5 hover:bg-(--accent-primary) hover:text-[#07292d]",
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
                  <span className="absolute bottom-1 h-px w-3 rounded-full bg-(--bg-inset)" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-(--border-muted) pt-3 text-[10px] text-(--text-secondary)/80">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
          Available
        </span>
        <span className="flex items-center gap-1">
          <span className="h-px w-3 rounded-full bg-(--bg-elevated)" />
          No open times
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-(--accent-primary)" />
          Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full ring-1 ring-(--accent-primary)/50" />
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
    () => (locations?.length === 1 ? locations[0].id : null)
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
    <div ref={providerSectionRef} className="sevacam-section-anchor space-y-5">
      <div className="rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-(--text-secondary)">
          Step 01
        </p>
        <h3 className="mt-2 text-base font-semibold text-(--text-primary)">
          Select your curator
        </h3>
        <p className="mt-1 text-xs leading-5 text-(--text-secondary)">
          Hover or tap a profile to preview the option you want. The next step
          opens as soon as one curator is selected.
        </p>
      </div>

      {staff.length === 0 ? (
        <div className="rounded-2xl border border-(--border-muted) bg-(--bg-elevated) px-4 py-8 text-center">
          <User className="mx-auto mb-3 h-8 w-8 text-(--text-secondary)/80" />
          <p className="text-sm font-medium text-(--text-primary)/80">
            No staff available
          </p>
          <p className="mt-1 text-xs text-(--text-secondary)/80">
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
                  "group sevacam-interactive-card relative flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/25",
                  isSelected
                    ? "border-transparent bg-(--accent-primary) text-[#07292d] shadow-[0_18px_30px_rgba(122,213,221,0.16)]"
                    : "border-(--border-subtle) bg-(--bg-elevated) hover:border-transparent hover:bg-(--accent-primary) hover:text-[#07292d]",
                )}
                aria-pressed={isSelected}
              >
                {isSelected && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#07292d]/12">
                    <Check className="h-3 w-3 text-[#07292d]" />
                  </span>
                )}
                <div
                  className={cn(
                    "flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 transition-all",
                    isSelected
                      ? "border-[#07292d]/18"
                      : "border-(--border-subtle) group-hover:border-[#07292d]/18",
                  )}
                >
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-(--text-primary)/90 group-hover:text-[#07292d]">
                      {getInitials(member.name || "?")}
                    </span>
                  )}
                </div>
                <div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      isSelected
                        ? "text-[#07292d]"
                        : "text-(--text-primary) group-hover:text-[#07292d]",
                    )}
                  >
                    {member.name}
                  </p>
                  {member.price_override ? (
                    <p
                      className={cn(
                        "mt-0.5 text-xs",
                        isSelected
                          ? "text-[#07292d]/75"
                          : "text-(--text-secondary) group-hover:text-[#07292d]/75",
                      )}
                    >
                      {formatCurrency(toNumber(member.price_override))}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-(--text-secondary)/80 group-hover:text-[#07292d]/75">
                      Standard rate
                    </p>
                  )}
                  <p
                    className={cn(
                      "mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors",
                      isSelected
                        ? "text-[#07292d]/82"
                        : "text-(--text-secondary)/55 group-hover:text-[#07292d]/82",
                    )}
                  >
                    {isSelected ? "Selected curator" : "Tap to select"}
                  </p>
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
            "sevacam-primary-button flex min-h-11 w-full items-center justify-center gap-2 rounded-[0.22rem] px-5 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] transition-all duration-200",
            canGoStep2
              ? "text-[#07292d]"
              : "cursor-not-allowed bg-(--bg-inset) text-(--text-secondary)/80",
          )}
        >
          Continue to Date & Time <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  // -- Step 2: Date + Time ----------------------------------------------------

  const renderStep2 = () => (
    <div ref={calendarSectionRef} className="sevacam-section-anchor space-y-5">
      <div className="rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-(--text-secondary)">
          Step 02
        </p>
        <h3 className="mt-2 text-base font-semibold text-(--text-primary)">
          Choose date and time
        </h3>
        <p className="mt-1 text-xs leading-5 text-(--text-secondary)">
          Start with the calendar, then move into the times below. When a date is
          chosen, the view scrolls to the open slots automatically.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-(--border-muted) bg-(--bg-elevated) px-4 py-2.5">
        <CalendarDays className="h-4 w-4 shrink-0 text-(--accent-primary)" />
        <span className="text-xs text-(--text-secondary)">
          {selectedDate ? (
            <>
              <span className="font-semibold text-(--text-primary)">
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
            className="ml-auto text-[10px] text-(--text-secondary)/80 underline-offset-2 hover:text-(--text-primary)/80 hover:underline"
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-(--text-secondary)">
              Calendar Status
            </p>
            {calendarError ? (
              <p className="text-sm font-medium text-rose-100">
                {calendarError}
              </p>
            ) : selectedStaff ? (
              <>
                <p className="text-sm font-medium text-(--text-primary)">
                  {availableDayCount > 0
                    ? `${availableDayCount} open day${availableDayCount === 1 ? "" : "s"} in ${format(calendarMonth, "MMMM yyyy")} for ${selectedStaff.name}.`
                    : `No open days in ${format(calendarMonth, "MMMM yyyy")} for ${selectedStaff.name}.`}
                </p>
                <p className="text-xs text-(--text-secondary)">
                  {availableDayCount > 0
                    ? "Green dots already have bookable times. Dim dates can still be opened to check details."
                    : "You can still tap a date to inspect it, switch month, or jump to the next available opening."}
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-(--text-primary)">
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
              className="sevacam-primary-button inline-flex min-h-10 items-center gap-1.5 self-start rounded-[0.22rem] px-4 py-2 text-[0.58rem] font-semibold uppercase tracking-[0.18em]"
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

      <div ref={timesSectionRef} className="sevacam-section-anchor space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-(--text-secondary)" />
          <p className="text-xs font-semibold uppercase tracking-wider text-(--text-secondary)">
            Available Times
          </p>
          {selectedSlot && (
            <span className="ml-auto rounded-full bg-(--accent-primary)/15 px-2.5 py-0.5 text-[11px] font-semibold text-(--accent-primary)">
              {formatTimeInTimeZone(selectedSlot, timezone)} selected
            </span>
          )}
        </div>

        {selectedDate && availableSlots.length > 6 ? (
          <p className="text-[11px] text-(--text-secondary)/70">
            More times are available below. Scroll the list to review the full
            day.
          </p>
        ) : null}

        {!selectedDate ? (
          <div className="rounded-2xl border border-(--border-muted) bg-(--bg-elevated) px-4 py-6 text-center">
            <p className="text-sm text-(--text-secondary)">
              Pick a date above to see available times
            </p>
          </div>
        ) : isLoadingSlots ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-8 rounded-xl bg-(--bg-elevated)" />
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-14 rounded-xl bg-(--bg-elevated)" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : availableSlots.length > 0 ? (
          <div
            key={`${selectedStaffId}-${selectedDate.toDateString()}`}
            className={cn(
              "space-y-4",
              availableSlots.length > 6 &&
                "sevacam-scroll-panel max-h-[24rem] overflow-y-auto pr-1",
            )}
          >
            {TIME_PERIODS.map((period) => (
              <SlotPeriodSection
                key={period.key}
                period={period}
                slots={slotsByPeriod[period.key] ?? []}
                selectedSlot={selectedSlot}
                durationMinutes={effectiveDuration}
                timeZone={timezone}
                onSelect={setSelectedSlot}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-(--border-muted) bg-(--bg-elevated) p-5 text-center">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-(--text-secondary)/80" />
            <p className="text-sm font-medium text-(--text-primary)/80">
              No slots on this date
            </p>
            <p className="mt-1 text-xs text-(--text-secondary)/80">
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
                  className="sevacam-primary-button inline-flex min-h-10 items-center gap-1.5 rounded-[0.22rem] px-4 py-2 text-[0.58rem] font-semibold uppercase tracking-[0.18em]"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Next available: {format(nextAvailableDate, "MMM d")}
                </button>
              )}
              <button
                type="button"
                onClick={handleJoinWaitlist}
                disabled={isJoiningWaitlist}
                className="sevacam-secondary-button inline-flex min-h-10 items-center gap-1.5 rounded-[0.22rem] px-4 py-2 text-[0.58rem] font-semibold uppercase tracking-[0.18em] disabled:opacity-60"
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
          "sevacam-primary-button flex min-h-11 w-full items-center justify-center gap-2 rounded-[0.22rem] px-5 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] transition-all duration-200",
          canGoStep3
            ? "text-[#07292d]"
            : "cursor-not-allowed bg-(--bg-inset) text-(--text-secondary)/80",
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
      <div ref={confirmSectionRef} className="sevacam-section-anchor space-y-5">
      <div className="rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-(--text-secondary)">
            Step 03
          </p>
          <h3 className="mt-2 text-base font-semibold text-(--text-primary)">
            Review and continue
          </h3>
          <p className="mt-1 text-xs leading-5 text-(--text-secondary)">
            Check the summary below. If everything looks right, continue to
            payment with confidence.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-(--border-muted)">
          <div className="bg-(--bg-elevated) px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-(--text-secondary)">
              Booking Summary
            </p>
          </div>
          <div className="divide-y divide-border/40">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--border-muted) bg-(--bg-elevated)">
                {selectedStaff?.avatar_url ? (
                  <img
                    src={selectedStaff.avatar_url}
                    alt={selectedStaff.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-(--text-primary)/90">
                    {getInitials(selectedStaff?.name ?? "?")}
                  </span>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-(--text-secondary)/80">
                  Provider
                </p>
                <p className="text-sm font-semibold text-(--text-primary)">
                  {selectedStaff?.name}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--border-muted) bg-(--bg-elevated)">
                <CalendarDays className="h-4 w-4 text-(--accent-primary)" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-(--text-secondary)/80">
                  Date & Time
                </p>
                <p className="text-sm font-semibold text-(--text-primary)">
                  {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                </p>
                {slotStart && slotEnd && (
                  <p className="mt-0.5 text-xs text-(--text-secondary)">
                    {formatTimeInTimeZone(slotStart, timezone)} &rarr;{" "}
                    {formatTimeInTimeZone(slotEnd, timezone)}
                    <span className="ml-2 text-(--text-secondary)/80">
                      ({effectiveDuration} min)
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-4 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--border-muted) bg-(--bg-elevated)">
                <CreditCard className="h-4 w-4 text-(--accent-primary)" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-(--text-secondary)/80">
                  Pricing
                </p>
                <div className="mt-1.5 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-(--text-primary)/80">Service</span>
                    <span className="font-semibold text-(--text-primary)">
                      {formatCurrency(effectivePrice)}
                    </span>
                  </div>
                  {effectiveDeposit > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-(--text-secondary)">Deposit due now</span>
                      <span className="font-semibold text-(--accent-primary)">
                        {formatCurrency(effectiveDeposit)}
                      </span>
                    </div>
                  )}
                  {effectiveCapacity > 1 && (
                    <div className="flex justify-between text-xs text-(--text-secondary)/80">
                      <span>Group capacity</span>
                      <span>Up to {effectiveCapacity} people</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {selectedLocation && (
              <div className="flex items-start gap-4 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--border-muted) bg-(--bg-elevated)">
                  <MapPin className="h-4 w-4 text-(--accent-primary)" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-(--text-secondary)/80">
                    Location
                  </p>
                  <p className="text-sm font-semibold text-(--text-primary)">
                    {selectedLocation.name}
                  </p>
                  {selectedLocation.address && (
                    <p className="mt-0.5 text-xs text-(--text-secondary)">
                      {selectedLocation.address}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-(--text-secondary)/80">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          Times shown in your timezone:{" "}
          <span className="font-medium text-(--text-secondary)">{timezone}</span>
        </p>

        {selectedLocation &&
          selectedLocation.latitude !== null &&
          selectedLocation.longitude !== null && (
            <LocationMapView
              location={{
                name: selectedLocation.name,
                address: selectedLocation.address,
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
              }}
            />
          )}

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
            "sevacam-primary-button flex min-h-11 w-full items-center justify-center gap-2 rounded-[0.22rem] px-5 py-3.5 text-[0.62rem] font-bold uppercase tracking-[0.2em] transition-all duration-200",
            isBooking
              ? "cursor-not-allowed bg-(--bg-inset) text-(--text-secondary)"
              : "text-[#07292d]",
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
          <StepIndicator
            currentStep={step}
            canGoStep2={canGoStep2}
            canGoStep3={canGoStep3}
            onStepChange={setStep}
          />

          <SelectionSnapshot
            step={step}
            locationLabel={selectedLocation?.name ?? null}
            staffName={selectedStaff?.name ?? null}
            dateLabel={selectedDateLabel}
            slotLabel={selectedSlotLabel}
          />

          {selectedLocation && (
            <div className="mb-6 overflow-hidden rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset)">
              <div className="flex items-start justify-between gap-3 px-4 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-(--text-secondary)">
                    Appointment Location
                  </p>
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
                    className="rounded-full border border-(--border-subtle) bg-(--bg-elevated) px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-(--text-primary) transition-colors hover:bg-(--accent-primary) hover:text-[#07292d]"
                  >
                    Change Location
                  </button>
                )}
              </div>

              <div className="px-4 pb-4">
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
                  <div className="rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-elevated) p-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-primary)" />
                      <div>
                        <p className="text-sm font-semibold text-(--text-primary)">
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
              className="mb-4 flex items-center gap-1.5 text-xs text-(--text-secondary) transition hover:text-(--text-primary)/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/20"
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

