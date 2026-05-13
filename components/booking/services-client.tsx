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
    <div className="border-b border-(--seva-border-subtle) pb-4 last:border-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-1.5"
      >
        <span
          className={cn(
            "flex items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em]",
            active ? "text-(--seva-accent)" : "text-(--seva-text-muted)",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {title}
          {active && (
            <span className="rounded-full bg-[rgba(122,213,221,0.12)] px-1.5 py-0.5 text-[9px] font-bold text-(--seva-accent)">
              ON
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-(--seva-text-muted) transition-transform duration-200",
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
    <span className="flex items-center gap-1 rounded-full border border-(--seva-border-subtle) bg-(--seva-elevated) px-3 py-1.5 text-[11px] font-medium text-(--seva-text-soft)">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 text-(--seva-text-muted) transition-colors hover:text-(--seva-text)"
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
        <div className="sevacam-rail px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between border-b border-(--seva-border-subtle) pb-5">
            <span className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-(--seva-text-soft)">
              <SlidersHorizontal className="h-4 w-4" />
              Refine selection
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-[rgba(122,213,221,0.12)] px-1.5 py-0.5 text-[10px] font-bold text-(--seva-accent)">
                  {activeFilterCount}
                </span>
              )}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[0.62rem] uppercase tracking-[0.16em] text-(--seva-text-muted) transition-colors hover:text-(--seva-text)"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-4 pt-5">

            {/* Sort */}
            <FilterSection title="Sort by" icon={ArrowUpDown} active={sortKey !== "name_asc"}>
              <div className="flex flex-col gap-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSortKey(opt.value)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[0.45rem] px-3 py-2.5 text-sm transition-colors",
                      sortKey === opt.value
                        ? "bg-[rgba(122,213,221,0.12)] font-semibold text-(--seva-accent)"
                        : "text-(--seva-text-soft) hover:bg-(--seva-elevated) hover:text-(--seva-text)",
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
                        "flex w-full items-center justify-between rounded-[0.45rem] px-3 py-2.5 text-sm capitalize transition-colors",
                        selectedCategory === cat
                          ? "bg-[rgba(122,213,221,0.12)] font-semibold text-(--seva-accent)"
                          : "text-(--seva-text-soft) hover:bg-(--seva-elevated) hover:text-(--seva-text)",
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
                  <label className="mb-1 block text-[11px] text-muted-foreground">Min ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="0"
                    className="sevacam-service-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">Max ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Any"
                    className="sevacam-service-input"
                  />
                </div>
              </div>
              {(minPrice || maxPrice) && (
                <p className="mt-2 text-[11px] text-muted-foreground">
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
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      durationPreset === p.value
                        ? "border-[rgba(122,213,221,0.25)] bg-[rgba(122,213,221,0.12)] text-(--seva-accent)"
                        : "border-(--seva-border-subtle) bg-(--seva-elevated) text-(--seva-text-soft) hover:text-(--seva-text)",
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
                      "flex w-full items-center justify-between rounded-[0.45rem] px-3 py-2.5 text-sm transition-colors",
                      depositFilter === opt.value
                        ? "bg-[rgba(122,213,221,0.12)] font-semibold text-(--seva-accent)"
                        : "text-(--seva-text-soft) hover:bg-(--seva-elevated) hover:text-(--seva-text)",
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
                          "flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors",
                          active
                            ? "border-[rgba(122,213,221,0.25)] bg-[rgba(122,213,221,0.12)] text-(--seva-accent)"
                            : "border-(--seva-border-subtle) bg-(--seva-elevated) text-(--seva-text-soft) hover:text-(--seva-text)",
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
                    className="mt-2 text-[11px] uppercase tracking-[0.14em] text-(--seva-text-muted) transition-colors hover:text-(--seva-text)"
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
                  className="sevacam-service-input"
                />
                {availableDate && (
                  <div className="flex items-center justify-between">
                    <p className="text-[11px]">
                      {availabilityChecking ? (
                        <span className="flex items-center gap-1.5 text-(--seva-accent)">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Checking availability&hellip;
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-(--seva-text-soft)">
                          <CalendarCheck className="h-3 w-3" />
                          Availability checked
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => setAvailableDate("")}
                      className="text-[11px] uppercase tracking-[0.14em] text-(--seva-text-muted) transition-colors hover:text-(--seva-text)"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <p className="text-[11px] leading-5 text-(--seva-text-muted)">
                  Only shows services with open slots on this date.
                </p>
              </div>
            </FilterSection>

          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-8">

        <div className="sticky top-4 z-20 flex gap-3 bg-(--seva-base)/95 pb-3 backdrop-blur">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-(--seva-text-muted)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services, categories, tags…"
              className="sevacam-service-input sevacam-service-search-input w-full"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-(--seva-text-muted) transition-colors hover:text-(--seva-text)"
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
              "flex items-center gap-2 rounded-[0.35rem] border px-4 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] transition-colors lg:hidden",
              showFilters || activeFilterCount > 0
                ? "border-[rgba(122,213,221,0.24)] bg-[rgba(122,213,221,0.12)] text-(--seva-accent)"
                : "border-(--seva-border-subtle) bg-(--seva-elevated) text-(--seva-text-soft) hover:text-(--seva-text)",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-(--seva-accent) px-1 text-[9px] font-bold text-[#07292d]">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="relative hidden lg:block">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="sevacam-service-input min-w-[14rem] appearance-none pl-4 pr-10"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--seva-text-muted)" />
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
        <div className="flex items-center justify-between border-b border-(--seva-border-subtle) pb-5">
          <p className="text-sm text-(--seva-text-soft)">
            <span className="font-semibold text-(--seva-text)">{filtered.length}</span>{" "}
            service{filtered.length !== 1 ? "s" : ""}
            {hasActiveFilters ? " found" : " available"}
            {availabilityChecking && (
              <span className="ml-2 inline-flex items-center gap-1 text-(--seva-accent)">
                <Loader2 className="h-3 w-3 animate-spin" />
                checking dates&hellip;
              </span>
            )}
          </p>
          {categories.length > 0 && !hasActiveFilters && (
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-(--seva-text-muted)">
              {categories.length} categories
            </p>
          )}
        </div>

        {serviceGroups.length > 0 ? (
          <div id="services" className="space-y-16">
            {serviceGroups.map((group, groupIndex) => (
              <section key={group.id} className="space-y-8">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="sevacam-display text-[clamp(1.9rem,3vw,2.9rem)] italic text-(--seva-text)">
                    {group.title}
                  </h2>
                  <p className="text-[0.62rem] uppercase tracking-[0.18em] text-(--seva-text-muted)">
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
                        className="sevacam-rail sevacam-service-card flex h-full max-w-none flex-col overflow-hidden p-4 sm:p-5"
                      >
                        <div className="overflow-hidden rounded-[0.45rem] bg-(--seva-elevated)">
                          {images.length > 0 ? (
                            <ImageCarousel
                              images={images}
                              alt={displayName}
                              className="h-56 w-full sm:h-64"
                              imageClassName="h-56 w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-[1.03] sm:h-64"
                            />
                          ) : (
                            <div
                              className={`h-56 w-full sm:h-64 ${toneClass}`}
                            />
                          )}
                        </div>

                        <div className="mt-5 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="mb-3 text-[0.62rem] uppercase tracking-[0.18em] text-(--seva-text-muted)">
                              {service.category || "Curated service"}
                            </p>
                            <h3 className="sevacam-display text-[1.65rem] leading-[1.02] text-(--seva-text) sm:text-[1.9rem]">
                              {displayName}
                            </h3>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[1.15rem] font-medium tabular-nums text-(--seva-warm) sm:text-[1.3rem]">
                              {formatPrice(service.price)}
                            </p>
                            <p className="mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-(--seva-text-muted)">
                              {formatDuration(service.duration_minutes)}
                            </p>
                          </div>
                        </div>

                        {service.description ? (
                          <p className="mt-4 line-clamp-3 text-sm leading-7 text-(--seva-text-soft)">
                            {service.description}
                          </p>
                        ) : null}

                        {service.tags && service.tags.length > 0 ? (
                          <div className="mt-5 flex flex-wrap gap-2">
                            {service.tags.slice(0, 4).map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  if (!selectedTags.includes(tag)) toggleTag(tag);
                                }}
                                title={`Filter by #${tag}`}
                                className={cn(
                                  "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                                  selectedTags.includes(tag)
                                    ? "border-[rgba(122,213,221,0.25)] bg-[rgba(122,213,221,0.12)] text-(--seva-accent)"
                                    : "border-(--seva-border-subtle) bg-(--seva-elevated) text-(--seva-text-soft) hover:text-(--seva-text)",
                                )}
                              >
                                #{tag}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-auto pt-6">
                          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[0.62rem] uppercase tracking-[0.16em] text-(--seva-text-muted)">
                            {service.deposit_amount > 0 ? (
                              <span>{formatPrice(service.deposit_amount)} deposit</span>
                            ) : (
                              <span>No deposit</span>
                            )}
                            {availableDate ? (
                              avail === "available" ? (
                                <span className="text-(--seva-accent)">
                                  Available on selected date
                                </span>
                              ) : avail === "loading" ? (
                                <span className="inline-flex items-center gap-1 text-(--seva-accent)">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Checking slots
                                </span>
                              ) : avail === "unknown" ? (
                                <span>Availability unavailable</span>
                              ) : (
                                <span>No slot on selected date</span>
                              )
                            ) : (
                              <span>Ready to book</span>
                            )}
                          </div>
                          <Link
                            href={`/book/${service.id}`}
                            className="sevacam-primary-button mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[0.18rem] px-6 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
                          >
                            Reserve Service
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="sevacam-rail flex flex-col items-center justify-center px-8 py-24 text-center">
            <Search className="mb-3 h-8 w-8 text-(--seva-text-muted)" />
            <p className="sevacam-display text-[2rem] text-(--seva-text)">
              No services match this view.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-(--seva-text-soft)">
              Try adjusting the current filters or clear them to reopen the full
              selection.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="sevacam-primary-button mt-6 inline-flex min-h-11 items-center rounded-[0.18rem] px-6 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
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
