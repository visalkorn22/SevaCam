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
    <div className="border-b border-border pb-4 last:border-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-1"
      >
        <span
          className={cn(
            "flex items-center gap-2 text-xs font-semibold uppercase tracking-wider",
            active ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {title}
          {active && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
              ON
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
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
    <span className="flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 text-muted-foreground hover:text-destructive"
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

  /* ================================================================= */
  /*  Render                                                            */
  /* ================================================================= */
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

      {/* ===== SIDEBAR FILTER PANEL ===== */}
      <aside
        className={cn(
          "shrink-0 lg:sticky lg:top-6 lg:w-72",
          showFilters ? "block" : "hidden lg:block",
        )}
      >
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-4 p-5">

            {/* Sort */}
            <FilterSection title="Sort by" icon={ArrowUpDown} active={sortKey !== "name_asc"}>
              <div className="flex flex-col gap-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSortKey(opt.value)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                      sortKey === opt.value
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-foreground hover:bg-muted",
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
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm capitalize transition-colors",
                        selectedCategory === cat
                          ? "bg-primary/10 font-semibold text-primary"
                          : "text-foreground hover:bg-muted",
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
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
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
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
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
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      durationPreset === p.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-ring hover:text-foreground",
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
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                      depositFilter === opt.value
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-foreground hover:bg-muted",
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
                          "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-ring hover:text-foreground",
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
                    className="mt-2 text-[11px] text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
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
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                {availableDate && (
                  <div className="flex items-center justify-between">
                    <p className="text-[11px]">
                      {availabilityChecking ? (
                        <span className="flex items-center gap-1.5 text-primary">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Checking availability&hellip;
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-emerald-600">
                          <CalendarCheck className="h-3 w-3" />
                          Availability checked
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => setAvailableDate("")}
                      className="text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground/70">
                  Only shows services with open slots on this date.
                </p>
              </div>
            </FilterSection>

          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="min-w-0 flex-1 space-y-6">

        {/* Search bar + mobile filter toggle + desktop sort */}
        <div className="sticky top-4 z-20 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services, categories, tags&hellip;"
              className="w-full rounded-xl border border-border bg-background/95 py-2.5 pl-10 pr-4 text-sm shadow-sm backdrop-blur placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Mobile: toggle sidebar */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors lg:hidden",
              showFilters || activeFilterCount > 0
                ? "border-ring bg-primary/10 text-primary"
                : "border-border bg-background/95 text-foreground hover:bg-muted",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Desktop: sort dropdown (mirrors sidebar sort) */}
          <div className="relative hidden lg:block">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="appearance-none rounded-xl border border-border bg-background/95 py-2.5 pl-4 pr-9 text-sm font-medium shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
            service{filtered.length !== 1 ? "s" : ""}
            {hasActiveFilters ? " found" : " available"}
            {availabilityChecking && (
              <span className="ml-2 inline-flex items-center gap-1 text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                checking dates&hellip;
              </span>
            )}
          </p>
          {categories.length > 0 && !hasActiveFilters && (
            <p className="text-xs text-muted-foreground">{categories.length} categories</p>
          )}
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div id="services" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((service) => {
              const images = service.image_urls?.length
                ? service.image_urls
                : service.image_url
                  ? [service.image_url]
                  : [];
              const displayName = service.public_name || service.name;
              const avail = availabilityMap[service.id];

              return (
                <div
                  key={service.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                >
                  {/* Image */}
                  <div className="relative overflow-hidden">
                    {images.length > 0 ? (
                      <ImageCarousel
                        images={images}
                        alt={displayName}
                        className="h-52 w-full"
                        imageClassName="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-52 items-center justify-center bg-linear-to-br from-muted to-muted/50">
                        <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Category badge */}
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      {service.category && (
                        <span className="rounded-full border border-white/20 bg-black/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                          {service.category}
                        </span>
                      )}
                    </div>
                    {/* Right badges */}
                    <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
                      {service.deposit_amount > 0 && (
                        <span className="rounded-full border border-amber-400/30 bg-amber-500/80 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                          Deposit req.
                        </span>
                      )}
                      {availableDate && avail === "available" && (
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-600/80 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                          Available \u2713
                        </span>
                      )}
                      {availableDate && avail === "loading" && (
                        <span className="rounded-full border border-border/30 bg-black/50 px-2.5 py-0.5 text-[10px] text-white backdrop-blur-sm">
                          <Loader2 className="inline h-2.5 w-2.5 animate-spin" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex-1 space-y-2">
                      <h3 className="text-lg font-bold leading-snug tracking-tight text-foreground">
                        {displayName}
                      </h3>
                      {service.description && (
                        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {service.description}
                        </p>
                      )}
                      {service.tags && service.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {service.tags.slice(0, 4).map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => { if (!selectedTags.includes(tag)) toggleTag(tag); }}
                              title={`Filter by #${tag}`}
                              className={cn(
                                "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                                selectedTags.includes(tag)
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
                              )}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{formatDuration(service.duration_minutes)}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-foreground">
                          {formatPrice(service.price)}
                        </p>
                        {service.deposit_amount > 0 && (
                          <p className="text-[11px] text-muted-foreground">
                            {formatPrice(service.deposit_amount)} deposit
                          </p>
                        )}
                      </div>
                    </div>

                    {/* CTA */}
                    <Link
                      href={`/book/${service.id}`}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:gap-3"
                    >
                      Book Now
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-24 text-center">
            <Search className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-base font-semibold text-foreground">No services match your filters</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your criteria or clear the filters.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-full border border-border bg-background px-5 py-2 text-sm font-medium hover:bg-muted"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}