"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownAZ,
  ArrowRight,
  ArrowUpDown,
  BadgeDollarSign,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Search,
  SlidersHorizontal,
  Tag,
  ToggleLeft,
  X,
} from "lucide-react";
import { ImageCarousel } from "@/components/ui/image-carousel";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type ServiceRow = {
  id: string;
  name: string;
  public_name?: string | null;
  category?: string | null;
  tags?: string[] | null;
  description?: string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  duration_minutes: number;
  price: number;
  deposit_amount: number;
  is_active: boolean;
};

type SortKey =
  | "name_asc"
  | "price_asc"
  | "price_desc"
  | "duration_asc"
  | "duration_desc";

type DurationPreset = "any" | "under30" | "30to60" | "60to120" | "over120";
type DepositFilter = "any" | "required" | "none";

interface AvailabilityMap {
  [serviceId: string]: "available" | "unavailable" | "loading" | "unknown";
}

type ServiceGroup = {
  id: string;
  title: string;
  services: ServiceRow[];
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatPrice = (amount: number) =>
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

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name_asc", label: "Name: A → Z" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "duration_asc", label: "Duration: Shortest" },
  { value: "duration_desc", label: "Duration: Longest" },
];

const DURATION_PRESETS: { value: DurationPreset; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "under30", label: "< 30 min" },
  { value: "30to60", label: "30 – 60 min" },
  { value: "60to120", label: "1 – 2 hrs" },
  { value: "over120", label: "2 + hrs" },
];

const DEPOSIT_OPTIONS: { value: DepositFilter; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "required", label: "With deposit" },
  { value: "none", label: "No deposit" },
];

const ART_TONE_CLASSES = [
  "sevacam-art-stones",
  "sevacam-art-sanctuary",
  "sevacam-art-dining",
  "sevacam-art-ritual",
  "sevacam-art-chamber",
  "sevacam-art-botanical",
] as const;

const SECTION_LABEL_CLASS = "sevacam-booking-label text-(--text-secondary)";
const RAIL_CLASS = "sevacam-booking-rail";
const INPUT_CLASS = "sevacam-booking-input";
const PRIMARY_ACTION_CLASS =
  "sevacam-booking-primary-action inline-flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em]";
const SECONDARY_ACTION_CLASS =
  "sevacam-booking-secondary-action inline-flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em]";
const FILTER_OPTION_BASE_CLASS =
  "flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm transition-colors";
const FILTER_OPTION_ACTIVE_CLASS = "bg-(--accent-subtle) text-(--text-primary)";
const FILTER_OPTION_IDLE_CLASS =
  "text-(--text-secondary) hover:bg-(--bg-overlay) hover:text-(--text-primary)";

function durationPresetMatches(minutes: number, preset: DurationPreset) {
  if (preset === "any") return true;
  if (preset === "under30") return minutes < 30;
  if (preset === "30to60") return minutes >= 30 && minutes <= 60;
  if (preset === "60to120") return minutes > 60 && minutes <= 120;
  if (preset === "over120") return minutes > 120;
  return true;
}

/** Get user local IANA timezone, fallback to UTC */
function getLocalTZ() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/** Fetch the next-available date for a service on/after a given date */
async function fetchNextAvailable(
  serviceId: string,
  fromDate: string,
): Promise<string | null> {
  try {
    const tz = encodeURIComponent(getLocalTZ());
    const res = await fetch(
      `/api/availability/slots-v2/next-available?service_id=${serviceId}&timezone=${tz}&from_date=${fromDate}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { date: string | null };
    return data?.date ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  FilterSection                                                       */
/* ------------------------------------------------------------------ */

function FilterSection({
  title,
  icon: Icon,
  active,
  children,
}: {
  title: string;
  icon: React.ElementType;
  active?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-(--booking-frame) pb-4 last:border-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-1.5"
      >
        <span
          className={cn(
            "sevacam-booking-label flex items-center gap-2",
            active ? "text-(--accent-primary)" : "text-(--text-secondary)",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {title}
          {active && (
            <span className="rounded-full border border-(--booking-frame) bg-(--accent-subtle) px-2 py-0.5 text-[10px] font-medium text-(--text-primary)">
              ON
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-(--text-secondary) transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chip                                                                */
/* ------------------------------------------------------------------ */

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-(--booking-frame) bg-(--bg-elevated) px-3 py-2 text-[11px] font-medium text-(--text-secondary)">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 text-(--text-secondary) transition-colors hover:text-(--text-primary)"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  ServicesClient                                                      */
/* ------------------------------------------------------------------ */

export function ServicesClient({
  initialServices,
}: {
  initialServices: ServiceRow[];
}) {
  /* ---- filter state ---- */
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name_asc");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [durationPreset, setDurationPreset] = useState<DurationPreset>("any");
  const [depositFilter, setDepositFilter] = useState<DepositFilter>("any");
  const [availableDate, setAvailableDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  /* ---- availability check state ---- */
  const [availabilityMap, setAvailabilityMap] = useState<AvailabilityMap>({});
  const [availabilityChecking, setAvailabilityChecking] = useState(false);
  const checkAbortRef = useRef<AbortController | null>(null);

  /* ---- derived lists ---- */
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(initialServices.map((s) => s.category).filter(Boolean)),
    ) as string[];
    return cats.sort();
  }, [initialServices]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    initialServices.forEach((s) => s.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [initialServices]);

  /* ---- availability date check ---- */
  const checkAvailability = useCallback(
    async (date: string, services: ServiceRow[]) => {
      if (!date || services.length === 0) return;

      // Cancel any in-flight check
      checkAbortRef.current?.abort();
      checkAbortRef.current = new AbortController();

      setAvailabilityChecking(true);
      const loadingMap: AvailabilityMap = {};
      services.forEach((s) => { loadingMap[s.id] = "loading"; });
      setAvailabilityMap((prev) => ({ ...prev, ...loadingMap }));

      const results = await Promise.allSettled(
        services.map((s) => fetchNextAvailable(s.id, date)),
      );

      const newMap: AvailabilityMap = {};
      results.forEach((result, idx) => {
        const serviceId = services[idx].id;
        if (result.status === "fulfilled") {
          newMap[serviceId] = result.value === date ? "available" : "unavailable";
        } else {
          newMap[serviceId] = "unknown";
        }
      });

      setAvailabilityMap((prev) => ({ ...prev, ...newMap }));
      setAvailabilityChecking(false);
    },
    [],
  );

  useEffect(() => {
    if (availableDate) {
      checkAvailability(availableDate, initialServices);
    } else {
      setAvailabilityMap({});
      setAvailabilityChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDate]);

  /* ---- filtering + sorting ---- */
  const filtered = useMemo(() => {
    let list = initialServices.filter((s) => {
      if (search) {
        const q = search.toLowerCase();
        const hit =
          (s.public_name || s.name).toLowerCase().includes(q) ||
          (s.description?.toLowerCase().includes(q) ?? false) ||
          (s.category?.toLowerCase().includes(q) ?? false) ||
          (s.tags?.some((t) => t.toLowerCase().includes(q)) ?? false);
        if (!hit) return false;
      }
      if (selectedCategory !== "all" && s.category !== selectedCategory) return false;
      if (selectedTags.length > 0 && !selectedTags.every((tag) => s.tags?.includes(tag))) return false;
      if (minPrice && s.price < Number(minPrice)) return false;
      if (maxPrice && s.price > Number(maxPrice)) return false;
      if (!durationPresetMatches(s.duration_minutes, durationPreset)) return false;
      if (depositFilter === "required" && s.deposit_amount <= 0) return false;
      if (depositFilter === "none" && s.deposit_amount > 0) return false;
      if (availableDate && availabilityMap[s.id] === "unavailable") return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortKey === "price_asc") return a.price - b.price;
      if (sortKey === "price_desc") return b.price - a.price;
      if (sortKey === "duration_asc") return a.duration_minutes - b.duration_minutes;
      if (sortKey === "duration_desc") return b.duration_minutes - a.duration_minutes;
      return (a.public_name || a.name).localeCompare(b.public_name || b.name);
    });

    return list;
  }, [
    initialServices, search, selectedCategory, selectedTags,
    minPrice, maxPrice, durationPreset, depositFilter,
    availableDate, availabilityMap, sortKey,
  ]);

  /* ---- active filter count ---- */
  const activeFilterCount = [
    search,
    selectedCategory !== "all" ? selectedCategory : "",
    selectedTags.length > 0 ? "tags" : "",
    minPrice,
    maxPrice,
    durationPreset !== "any" ? durationPreset : "",
    depositFilter !== "any" ? depositFilter : "",
    availableDate,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setSelectedTags([]);
    setMinPrice("");
    setMaxPrice("");
    setDurationPreset("any");
    setDepositFilter("any");
    setAvailableDate("");
    setSortKey("name_asc");
  };

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const serviceGroups = useMemo<ServiceGroup[]>(() => {
    const grouped = new Map<string, ServiceRow[]>();

    filtered.forEach((service) => {
      const title = service.category?.trim() || "Curated Services";
      const current = grouped.get(title) ?? [];
      current.push(service);
      grouped.set(title, current);
    });

    return Array.from(grouped.entries()).map(([title, services]) => ({
      id: title.toLowerCase().replace(/\s+/g, "-"),
      title,
      services,
    }));
  }, [filtered]);

  /* ================================================================= */
  /*  Render                                                            */
  /* ================================================================= */
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <aside
        className={cn(
          "shrink-0 lg:sticky lg:top-6 lg:w-[19rem]",
          showFilters ? "block" : "hidden lg:block",
        )}
      >
        <div className={`${RAIL_CLASS} px-6 py-6`}>
          <div className="flex items-center justify-between border-b border-(--booking-frame) pb-6">
            <span className="sevacam-booking-label flex items-center gap-2 text-(--text-primary)">
              <SlidersHorizontal className="h-4 w-4" />
              Refine selection
              {activeFilterCount > 0 && (
                <span className="rounded-full border border-(--booking-frame) bg-(--accent-subtle) px-2 py-0.5 text-[10px] font-medium text-(--text-primary)">
                  {activeFilterCount}
                </span>
              )}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] uppercase tracking-[0.18em] text-(--text-secondary) transition-colors hover:text-(--text-primary)"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-4 pt-6">

            {/* Sort */}
            <FilterSection title="Sort by" icon={ArrowUpDown} active={sortKey !== "name_asc"}>
              <div className="flex flex-col gap-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSortKey(opt.value)}
                    className={cn(
                      FILTER_OPTION_BASE_CLASS,
                      sortKey === opt.value
                        ? FILTER_OPTION_ACTIVE_CLASS
                        : FILTER_OPTION_IDLE_CLASS,
                    )}
                  >
                    {opt.label}
                    {sortKey === opt.value && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Category / Type */}
            {categories.length > 0 && (
              <FilterSection title="Service type" icon={ArrowDownAZ} active={selectedCategory !== "all"}>
                <div className="flex flex-col gap-1">
                  {["all", ...categories].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        `${FILTER_OPTION_BASE_CLASS} capitalize`,
                        selectedCategory === cat
                          ? FILTER_OPTION_ACTIVE_CLASS
                          : FILTER_OPTION_IDLE_CLASS,
                      )}
                    >
                      {cat === "all" ? "All categories" : cat}
                      {selectedCategory === cat && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </FilterSection>
            )}

            {/* Price range */}
            <FilterSection title="Price range" icon={BadgeDollarSign} active={!!minPrice || !!maxPrice}>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`mb-2 block ${SECTION_LABEL_CLASS}`}>Min ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="0"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={`mb-2 block ${SECTION_LABEL_CLASS}`}>Max ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Any"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
              {(minPrice || maxPrice) && (
                <p className="mt-2 text-[11px] text-(--text-secondary)">
                  {minPrice && maxPrice
                    ? `$${minPrice} \u2013 $${maxPrice}`
                    : minPrice
                      ? `From $${minPrice}`
                      : `Up to $${maxPrice}`}
                </p>
              )}
            </FilterSection>

            {/* Duration presets */}
            <FilterSection title="Duration" icon={Clock} active={durationPreset !== "any"}>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setDurationPreset(p.value)}
                    className={cn(
                      "rounded-full border border-(--booking-frame) px-3 py-2 text-xs font-medium transition-colors",
                      durationPreset === p.value
                        ? "bg-(--accent-subtle) text-(--text-primary)"
                        : "bg-(--bg-elevated) text-(--text-secondary) hover:bg-(--bg-overlay) hover:text-(--text-primary)",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Deposit */}
            <FilterSection title="Deposit" icon={ToggleLeft} active={depositFilter !== "any"}>
              <div className="flex flex-col gap-1">
                {DEPOSIT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDepositFilter(opt.value)}
                    className={cn(
                      FILTER_OPTION_BASE_CLASS,
                      depositFilter === opt.value
                        ? FILTER_OPTION_ACTIVE_CLASS
                        : FILTER_OPTION_IDLE_CLASS,
                    )}
                  >
                    {opt.label}
                    {depositFilter === opt.value && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Tags */}
            {allTags.length > 0 && (
              <FilterSection title="Tags" icon={Tag} active={selectedTags.length > 0}>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "flex items-center gap-1 rounded-full border border-(--booking-frame) px-3 py-2 text-xs font-medium transition-colors",
                          active
                            ? "bg-(--accent-subtle) text-(--text-primary)"
                            : "bg-(--bg-elevated) text-(--text-secondary) hover:bg-(--bg-overlay) hover:text-(--text-primary)",
                        )}
                      >
                        {active && <Check className="h-2.5 w-2.5" />}
                        {tag}
                      </button>
                    );
                  })}
                </div>
                {selectedTags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    className="mt-2 text-[11px] uppercase tracking-[0.18em] text-(--text-secondary) transition-colors hover:text-(--text-primary)"
                  >
                    Clear tags
                  </button>
                )}
              </FilterSection>
            )}

            {/* Available on date */}
            <FilterSection title="Available on date" icon={CalendarDays} active={!!availableDate}>
              <div className="space-y-2">
                <input
                  type="date"
                  value={availableDate}
                  min={todayStr}
                  onChange={(e) => setAvailableDate(e.target.value)}
                  className={INPUT_CLASS}
                />
                {availableDate && (
                  <div className="flex items-center justify-between">
                    <p className="text-[11px]">
                      {availabilityChecking ? (
                        <span className="flex items-center gap-1.5 text-(--accent-primary)">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Checking availability&hellip;
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-(--text-secondary)">
                          <CalendarCheck className="h-3 w-3" />
                          Availability checked
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => setAvailableDate("")}
                      className="text-[11px] uppercase tracking-[0.18em] text-(--text-secondary) transition-colors hover:text-(--text-primary)"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <p className="text-[11px] leading-5 text-(--text-secondary)">
                  Only shows services with open slots on this date.
                </p>
              </div>
            </FilterSection>

          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-8">

        <div className="sticky top-4 z-20 flex gap-3 bg-(--bg-base)/95 pb-3 backdrop-blur">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-secondary)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services, categories, tags…"
              className={`${INPUT_CLASS} sevacam-service-search-input w-full`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-(--text-secondary) transition-colors hover:text-(--text-primary)"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              `${SECONDARY_ACTION_CLASS} lg:hidden`,
              showFilters || activeFilterCount > 0
                ? "bg-(--accent-subtle)"
                : "",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full border border-(--booking-frame) bg-(--accent-primary-hover) px-1 text-[9px] font-medium text-(--text-on-accent)">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="relative hidden lg:block">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className={`${INPUT_CLASS} min-w-[14rem] appearance-none pl-4 pr-10`}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-secondary)" />
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {search && <Chip label={`"${search}"`} onRemove={() => setSearch("")} />}
            {selectedCategory !== "all" && (
              <Chip label={selectedCategory} onRemove={() => setSelectedCategory("all")} />
            )}
            {selectedTags.map((tag) => (
              <Chip key={tag} label={`#${tag}`} onRemove={() => toggleTag(tag)} />
            ))}
            {minPrice && <Chip label={`From $${minPrice}`} onRemove={() => setMinPrice("")} />}
            {maxPrice && <Chip label={`Up to $${maxPrice}`} onRemove={() => setMaxPrice("")} />}
            {durationPreset !== "any" && (
              <Chip
                label={DURATION_PRESETS.find((p) => p.value === durationPreset)?.label ?? durationPreset}
                onRemove={() => setDurationPreset("any")}
              />
            )}
            {depositFilter !== "any" && (
              <Chip
                label={depositFilter === "required" ? "With deposit" : "No deposit"}
                onRemove={() => setDepositFilter("any")}
              />
            )}
            {availableDate && (
              <Chip
                label={`Available ${new Date(availableDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                onRemove={() => setAvailableDate("")}
              />
            )}
          </div>
        )}

        {/* Results count */}
          <div className="flex items-center justify-between border-b border-(--booking-frame) pb-6">
          <p className="text-sm text-(--text-secondary)">
            <span className="font-medium text-(--text-primary)">{filtered.length}</span>{" "}
            service{filtered.length !== 1 ? "s" : ""}
            {hasActiveFilters ? " found" : " available"}
            {availabilityChecking && (
              <span className="ml-2 inline-flex items-center gap-1 text-(--accent-primary)">
                <Loader2 className="h-3 w-3 animate-spin" />
                checking dates&hellip;
              </span>
            )}
          </p>
          {categories.length > 0 && !hasActiveFilters && (
            <p className={SECTION_LABEL_CLASS}>
              {categories.length} categories
            </p>
          )}
        </div>

        {serviceGroups.length > 0 ? (
          <div id="services" className="space-y-16">
            {serviceGroups.map((group, groupIndex) => (
              <section key={group.id} className="space-y-8">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="sevacam-display text-[clamp(1.9rem,3vw,2.9rem)] italic text-(--text-primary)">
                    {group.title}
                  </h2>
                  <p className={SECTION_LABEL_CLASS}>
                    {group.services.length.toString().padStart(2, "0")} options
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {group.services.map((service, serviceIndex) => {
                    const images = service.image_urls?.length
                      ? service.image_urls
                      : service.image_url
                        ? [service.image_url]
                        : [];
                    const displayName = service.public_name || service.name;
                    const avail = availabilityMap[service.id];
                    const toneClass =
                      ART_TONE_CLASSES[
                        (groupIndex + serviceIndex) % ART_TONE_CLASSES.length
                      ];

                    return (
                      <article
                        key={service.id}
                        className="sevacam-booking-card sevacam-interactive-card flex flex-col overflow-hidden"
                      >
                        {/* Image / gradient placeholder */}
                        <div className="relative overflow-hidden">
                          {images.length > 0 ? (
                            <ImageCarousel
                              images={images}
                              alt={displayName}
                              className="h-48 w-full"
                              imageClassName="h-48 w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-[1.03]"
                            />
                          ) : (
                            <div className={`h-48 w-full ${toneClass}`} />
                          )}
                          {service.category && (
                            <span
                              aria-hidden="true"
                              data-tone="selected"
                              className="sevacam-booking-pill absolute bottom-3 left-3 backdrop-blur-sm"
                            >
                              {service.category}
                            </span>
                          )}
                        </div>

                        {/* Card body */}
                        <div className="flex flex-1 flex-col gap-3 p-4">
                          <p className={SECTION_LABEL_CLASS}>
                            {service.category || "Curated"}
                          </p>

                          <h3 className="text-[1.05rem] font-medium leading-snug text-(--text-primary) sm:text-[1.12rem]">
                            {displayName}
                          </h3>

                          <div className="flex items-center gap-3 text-[0.72rem] text-(--text-secondary)">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDuration(service.duration_minutes)}
                            </span>
                            {availableDate && avail === "available" && (
                              <span className="text-(--accent-primary)">Available</span>
                            )}
                            {availableDate && avail === "loading" && (
                              <span className="inline-flex items-center gap-1 text-(--accent-primary)">
                                <Loader2 className="h-3 w-3 animate-spin" />
                              </span>
                            )}
                          </div>

                          {/* Price + CTA */}
                          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                            <div>
                              <p className="text-[1.2rem] font-medium text-(--text-primary)">
                                {formatPrice(service.price)}
                              </p>
                              {service.deposit_amount > 0 && (
                                <p className="mt-1 text-[0.62rem] text-(--text-secondary)">
                                  {formatPrice(service.deposit_amount)} deposit
                                </p>
                              )}
                            </div>
                            <Link
                              href={`/book/${service.id}`}
                              className={`${PRIMARY_ACTION_CLASS} px-4`}
                            >
                              Reserve service
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className={`${RAIL_CLASS} flex min-h-64 flex-col items-center justify-center p-8 text-center`}>
            <Search className="mb-3 h-8 w-8 text-(--text-secondary)" />
            <p className="sevacam-display text-[2rem] text-(--text-primary)">
              No services match this view.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-(--text-secondary)">
              Try adjusting the current filters or clear them to reopen the full
              selection.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className={`mt-6 ${PRIMARY_ACTION_CLASS}`}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
