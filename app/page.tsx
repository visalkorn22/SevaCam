"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Service } from "@/lib/types/landing";

type ApiService = {
  id: string;
  name: string;
  public_name?: string | null;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
  price: number | string;
  duration_minutes: number | string;
  deposit_amount?: number | string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
};

type CategoryOption = {
  id: string;
  label: string;
};

type CurationMode = "soonest" | "peak-hours";

type EditorialService = Service & {
  availabilityLabel: string;
  collectionLabel: string;
  toneClass: string;
  bookingHref: string;
};

type ServiceSection = {
  id: string;
  title: string;
  services: EditorialService[];
};

type HeroBackgroundMedia = {
  id: string;
  label: string;
  src: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const artToneClasses = [
  "sevacam-art-stones",
  "sevacam-art-sanctuary",
  "sevacam-art-dining",
  "sevacam-art-ritual",
  "sevacam-art-chamber",
  "sevacam-art-botanical",
] as const;

const collectionLabels = [
  "After Hours",
  "Private Suite",
  "Editorial Dining",
  "Quiet Session",
  "Signature Care",
  "Concierge Wellness",
] as const;

const availabilityLabels = [
  "Tonight 20:10",
  "Tomorrow 09:00",
  "Private suite 17:40",
  "Earliest 08:45",
  "Late session 21:15",
  "Tomorrow 11:30",
] as const;

function createEditorialService(
  service: Service,
  index: number,
  overrides?: Partial<EditorialService>,
): EditorialService {
  const primaryImage = service.imageUrl?.trim();
  const galleryImage = service.imageUrls?.find(
    (image) => typeof image === "string" && image.trim(),
  );
  const firstImage = primaryImage || galleryImage || null;

  return {
    ...service,
    imageUrl: firstImage,
    imageUrls: firstImage ? [firstImage] : [],
    availabilityLabel: availabilityLabels[index % availabilityLabels.length],
    collectionLabel: collectionLabels[index % collectionLabels.length],
    toneClass: artToneClasses[index % artToneClasses.length],
    bookingHref: service.id
      ? `/book/${service.id}?serviceId=${service.id}`
      : "/services",
    ...overrides,
  };
}

const fallbackServices: EditorialService[] = [
  createEditorialService(
    {
      id: "deep-midnight-bath",
      name: "Deep Midnight Bath",
      publicName: "Deep Midnight Bath",
      description:
        "A sensory reset involving thermal waters, signature oils, and stillness designed to ease the circadian rhythm.",
      price: 340,
      durationMinutes: 80,
      category: "Nocturnal Wellness",
      tags: ["Featured"],
      imageUrl: null,
      imageUrls: [],
      depositAmount: 90,
    },
    0,
    { bookingHref: "/services" },
  ),
  createEditorialService(
    {
      id: "shadow-meditation",
      name: "Shadow Meditation",
      publicName: "Shadow Meditation",
      description:
        "A guided introspective session focused on breath, internal vibration, and complete light-sealed calm.",
      price: 180,
      durationMinutes: 60,
      category: "Nocturnal Wellness",
      tags: ["Popular"],
      imageUrl: null,
      imageUrls: [],
      depositAmount: 50,
    },
    1,
    { bookingHref: "/services" },
  ),
  createEditorialService(
    {
      id: "monolith-dinner",
      name: "The Monolith Dinner",
      publicName: "The Monolith Dinner",
      description:
        "A private blind tasting menu curated around archetypal flavor profiles and delivered in a deeply controlled setting.",
      price: 850,
      durationMinutes: 180,
      category: "Culinary Orchestration",
      tags: ["Featured"],
      imageUrl: null,
      imageUrls: [],
      depositAmount: 250,
    },
    2,
    { bookingHref: "/services" },
  ),
  createEditorialService(
    {
      id: "candle-therapy",
      name: "Candle Therapy Session",
      publicName: "Candle Therapy Session",
      description:
        "A warm, private ritual designed to reduce overstimulation and let the body settle into a slower pace.",
      price: 220,
      durationMinutes: 90,
      category: "Private Curations",
      tags: ["Popular"],
      imageUrl: null,
      imageUrls: [],
      depositAmount: 60,
    },
    3,
    { bookingHref: "/services" },
  ),
  createEditorialService(
    {
      id: "silent-tea-interval",
      name: "Silent Tea Interval",
      publicName: "Silent Tea Interval",
      description:
        "A structured tea service with measured pacing, low light, and a guided deceleration sequence.",
      price: 140,
      durationMinutes: 45,
      category: "Private Curations",
      tags: ["Featured"],
      imageUrl: null,
      imageUrls: [],
      depositAmount: 40,
    },
    4,
    { bookingHref: "/services" },
  ),
  createEditorialService(
    {
      id: "botanical-reset",
      name: "Botanical Reset",
      publicName: "Botanical Reset",
      description:
        "Targeted bodywork supported by restorative oils and a botanical environment tuned for emotional recovery.",
      price: 260,
      durationMinutes: 120,
      category: "Nocturnal Wellness",
      tags: ["Popular"],
      imageUrl: null,
      imageUrls: [],
      depositAmount: 70,
    },
    5,
    { bookingHref: "/services" },
  ),
];

const heroBackgroundMedia: HeroBackgroundMedia[] = [
  {
    id: "atelier-motion",
    label: "Atelier Motion",
    src: "/play_720p.mp4",
  },
  {
    id: "editorial-motion",
    label: "Editorial Motion",
    src: "/5659263-hd_1080_1920_30fps.mp4",
  },
  {
    id: "studio-motion",
    label: "Studio Motion",
    src: "/make-up.mp4",
  },
  {
    id: "lounge-motion",
    label: "Lounge Motion",
    src: "/download.mp4",
  },
  {
    id: "signature-motion",
    label: "Signature Motion",
    src: "/13434259_3840_2160_24fps.mp4",
  },
];

function formatCurrency(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatDuration(minutes: number) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
  }

  return `${minutes} min`;
}

function titleCaseCategory(category: string) {
  return category
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getUserMonogram(
  fullName?: string | null,
  email?: string | null,
): string {
  const source = (fullName || email || "S").trim();
  const words = source.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function ServiceVisual({
  service,
  className,
  imageClassName,
}: {
  service: EditorialService;
  className: string;
  imageClassName: string;
}) {
  const displayName = service.publicName || service.name;

  return (
    <div className={className}>
      {service.imageUrl ? (
        <img src={service.imageUrl} alt={displayName} className={imageClassName} />
      ) : (
        <div className={`${imageClassName} ${service.toneClass}`} />
      )}
    </div>
  );
}

export default function HomePage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState<EditorialService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [curationMode, setCurationMode] = useState<CurationMode>("soonest");
  const [headerVisible, setHeaderVisible] = useState(true);
  const [activeHeroMediaIndex, setActiveHeroMediaIndex] = useState(0);
  const lastScrollY = useRef(0);

  const role = user?.role;
  const isStaff = role === "staff";
  const isAdmin = role === "admin" || role === "superadmin";
  const isCustomer = !!user && !isStaff && !isAdmin;
  const showStaffAdminButton = isStaff || isAdmin || !user;
  const staffAdminLabel = isStaff
    ? "Staff Dashboard"
    : isAdmin
      ? "Admin Dashboard"
      : "Sign In";
  const staffAdminHref = isStaff
    ? "/staff/dashboard"
    : isAdmin
      ? "/admin/dashboard"
      : "/auth?mode=login";
  const userMonogram = getUserMonogram(user?.full_name, user?.email);

  useEffect(() => {
    const controller = new AbortController();

    const loadServices = async () => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/services", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          setServices([]);
          return;
        }

        const data = (await response.json()) as ApiService[];
        const normalized = data.map((service, index) =>
          createEditorialService(
            {
              id: service.id,
              name: service.name,
              publicName: service.public_name ?? null,
              description: service.description ?? null,
              price: Number(service.price ?? 0),
              durationMinutes: Number(service.duration_minutes ?? 0),
              category: service.category ?? null,
              tags: service.tags ?? [],
              imageUrl: service.image_url ?? null,
              imageUrls: service.image_urls ?? [],
              depositAmount:
                service.deposit_amount !== null &&
                service.deposit_amount !== undefined
                  ? Number(service.deposit_amount)
                  : null,
            },
            index,
          ),
        );

        setServices(normalized);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setServices([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadServices();

    return () => controller.abort();
  }, []);

  const handleLogout = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      await refreshProfile();
      router.refresh();
    }
  };

  const sourceServices = services.length > 0 ? services : fallbackServices;

  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const categories = Array.from(
      new Set(
        sourceServices
          .map((service) => service.category?.trim())
          .filter((category): category is string => Boolean(category)),
      ),
    )
      .slice(0, 5)
      .map((category) => ({
        id: category,
        label: titleCaseCategory(category),
      }));

    return [{ id: "all", label: "All Services" }, ...categories];
  }, [sourceServices]);

  useEffect(() => {
    const isValidSelection = categoryOptions.some(
      (category) => category.id === selectedCategory,
    );

    if (!isValidSelection) {
      setSelectedCategory("all");
    }
  }, [categoryOptions, selectedCategory]);

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      if (current <= 0) {
        setHeaderVisible(true);
      } else if (current > lastScrollY.current) {
        setHeaderVisible(false);
      } else {
        setHeaderVisible(true);
      }
      lastScrollY.current = current;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveHeroMediaIndex((currentIndex) =>
        (currentIndex + 1) % heroBackgroundMedia.length,
      );
    }, 6500);

    return () => window.clearInterval(intervalId);
  }, []);

  const visibleServices = useMemo(() => {
    const filtered = sourceServices.filter((service) => {
      if (selectedCategory === "all") {
        return true;
      }

      return service.category === selectedCategory;
    });

    const sorted = [...filtered].sort((left, right) => {
      if (curationMode === "soonest") {
        return (
          left.durationMinutes - right.durationMinutes ||
          left.price - right.price
        );
      }

      return (
        (right.depositAmount ?? right.price) -
          (left.depositAmount ?? left.price) ||
        right.price - left.price
      );
    });

    return sorted.slice(0, 6);
  }, [curationMode, selectedCategory, sourceServices]);

  const featuredService =
    visibleServices[0] ?? sourceServices[0] ?? fallbackServices[0];

  const serviceSections = useMemo<ServiceSection[]>(() => {
    const grouped = new Map<string, EditorialService[]>();

    visibleServices.forEach((service) => {
      const sectionTitle = titleCaseCategory(
        service.category || service.collectionLabel,
      );
      const current = grouped.get(sectionTitle) ?? [];
      current.push(service);
      grouped.set(sectionTitle, current);
    });

    return Array.from(grouped.entries()).map(([title, groupedServices]) => ({
      id: title.toLowerCase().replace(/\s+/g, "-"),
      title,
      services: groupedServices,
    }));
  }, [visibleServices]);

  const sidebarSummary = useMemo(() => {
    if (visibleServices.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 0,
        shortest: 0,
      };
    }

    return {
      minPrice: Math.min(...visibleServices.map((service) => service.price)),
      maxPrice: Math.max(...visibleServices.map((service) => service.price)),
      shortest: Math.min(
        ...visibleServices.map((service) => service.durationMinutes),
      ),
    };
  }, [visibleServices]);

  const collectionServices = visibleServices.length > 0 ? visibleServices : sourceServices;
  const primaryCollection = featuredService;
  const secondaryCollection =
    collectionServices[1] ?? collectionServices[0] ?? featuredService;
  const tertiaryCollection =
    collectionServices[2] ?? collectionServices[1] ?? featuredService;
  const collectionSummary = serviceSections
    .slice(0, 3)
    .map(
      (section) =>
        `${section.title} / ${section.services.length.toString().padStart(2, "0")}`,
    );
  const activeHeroMedia = heroBackgroundMedia[activeHeroMediaIndex]!;

  return (
    <div className="sevacam-home min-h-screen bg-(--seva-base) text-(--seva-text)">
      <header
        className={`sticky top-0 z-50 bg-(--seva-base) transition-transform duration-300 ease-in-out ${
          headerVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="mx-auto flex max-w-[86rem] items-center justify-between gap-6 px-6 py-5 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="sevacam-display text-[1.55rem] tracking-[-0.04em] text-(--seva-text)"
          >
            SevaCam
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="#selection-process"
              className="sevacam-nav-link sevacam-nav-link-active"
            >
              The Curation
            </Link>
            <Link href="#home-services" className="sevacam-nav-link">
              Service
            </Link>
            <Link href="/bookings" className="sevacam-nav-link">
              Archive
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {isCustomer ? (
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-medium text-(--seva-text-soft) transition-colors hover:text-(--seva-accent)"
              >
                Logout
              </button>
            ) : null}
            {showStaffAdminButton ? (
              <Link
                href={staffAdminHref}
                className="hidden text-sm font-medium text-(--seva-text-soft) transition-colors hover:text-(--seva-text) sm:inline-flex"
              >
                {staffAdminLabel}
              </Link>
            ) : null}
            <Link
              href="/services"
              className="sevacam-primary-button inline-flex min-h-11 items-center rounded-[0.18rem] px-5 py-3 text-sm font-semibold"
            >
              Go to Book
            </Link>
            <ThemeToggle compact />
            {user ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-(--seva-surface) text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-(--seva-text)">
                {userMonogram}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main
        id="selection-process"
        className="mx-auto max-w-[86rem] px-6 pb-16 pt-6 sm:px-8 lg:px-10 lg:pb-24 lg:pt-8"
      >
        <section className="relative overflow-hidden rounded-[1.25rem] border border-white/8 pb-14 pt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12 lg:px-8 lg:pt-10">
          <div className="absolute inset-0" aria-hidden="true">
            {heroBackgroundMedia.map((media, index) => {
              const isActive = index === activeHeroMediaIndex;
              const mediaClassName = `absolute inset-0 h-full w-full object-cover saturate-[1.08] contrast-[1.04] transition-[opacity,transform] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isActive ? "scale-100 opacity-100" : "scale-[1.02] opacity-0"
              }`;

              return (
                <video
                  key={media.id}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className={mediaClassName}
                >
                  <source src={media.src} type="video/mp4" />
                </video>
              );
            })}
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,12,12,0.5),rgba(10,12,12,0.2)_44%,rgba(10,12,12,0.34))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(122,213,221,0.24),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,183,133,0.16),transparent_30%)]" />

          <div className="relative z-10 px-6 lg:px-0">
            <p className="sevacam-eyebrow text-(--seva-warm)">
              Nocturnal Collection
            </p>
            <h1 className="sevacam-display mt-6 max-w-[8ch] text-[clamp(3.6rem,10vw,6.6rem)] leading-[0.84] tracking-[-0.06em] text-white">
              The Collection
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-white/84">
              A curated selection of service experiences shaped for quieter,
              more intentional booking. Browse {collectionServices.length} live
              options across {serviceSections.length} collections and move
              directly into the reservation path.
            </p>

            <div className="mt-9">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-white/68">
                Filter by category
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {categoryOptions.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={category.id === selectedCategory}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`sevacam-side-chip !border-white/10 !bg-black/22 !text-white/80 hover:!text-white ${
                      category.id === selectedCategory
                        ? "sevacam-side-chip-active !border-white/22 !bg-white/14 !text-white"
                        : ""
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-white/68">
                Selection mode
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={curationMode === "soonest"}
                  onClick={() => setCurationMode("soonest")}
                  className={`sevacam-side-chip !border-white/10 !bg-black/22 !text-white/80 hover:!text-white ${
                    curationMode === "soonest"
                      ? "sevacam-side-chip-active !border-white/22 !bg-white/14 !text-white"
                      : ""
                  }`}
                >
                  Soonest
                </button>
                <button
                  type="button"
                  aria-pressed={curationMode === "peak-hours"}
                  onClick={() => setCurationMode("peak-hours")}
                  className={`sevacam-side-chip !border-white/10 !bg-black/22 !text-white/80 hover:!text-white ${
                    curationMode === "peak-hours"
                      ? "sevacam-side-chip-active !border-white/22 !bg-white/14 !text-white"
                      : ""
                  }`}
                >
                  Peak Hours
                </button>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-col justify-between gap-8 px-6 pt-10 lg:px-0 lg:pt-20">
            <div className="space-y-3">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-(--seva-warm)">
                Aesthetic protocol / 2026
              </p>
              <div className="sevacam-side-stat !border-white/10 !bg-black/22 !text-white/72">
                <span className="text-white/72">In view</span>
                <span className="text-white">
                  {collectionServices.length.toString().padStart(2, "0")} services
                </span>
              </div>
              <div className="sevacam-side-stat !border-white/10 !bg-black/22 !text-white/72">
                <span className="text-white/72">Investment</span>
                <span className="text-white">
                  {formatCurrency(sidebarSummary.minPrice)} -{" "}
                  {formatCurrency(sidebarSummary.maxPrice)}
                </span>
              </div>
              <div className="sevacam-side-stat !border-white/10 !bg-black/22 !text-white/72">
                <span className="text-white/72">Shortest</span>
                <span className="text-white">{formatDuration(sidebarSummary.shortest)}</span>
              </div>
            </div>

            {collectionSummary.length > 0 ? (
              <div className="border-t border-white/5 pt-6">
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-white/68">
                  Collections in focus
                </p>
                <div className="mt-3 space-y-2">
                  {collectionSummary.map((item) => (
                    <p
                      key={item}
                      className="text-[0.72rem] uppercase tracking-[0.18em] text-white/84"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="border-t border-white/5 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[0.62rem] uppercase tracking-[0.18em] text-white/68">
                    Atmosphere Reel
                  </p>
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-white/80">
                    {String(activeHeroMediaIndex + 1).padStart(2, "0")} /{" "}
                    {String(heroBackgroundMedia.length).padStart(2, "0")}
                  </p>
                </div>
                <p className="mt-3 text-[0.72rem] uppercase tracking-[0.18em] text-white">
                  {activeHeroMedia.label}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {heroBackgroundMedia.map((media, index) => (
                    <button
                      key={media.id}
                      type="button"
                      aria-pressed={index === activeHeroMediaIndex}
                      aria-label={`Show ${media.label}`}
                      onClick={() => setActiveHeroMediaIndex(index)}
                      className={`h-2.5 rounded-[0.18rem] transition-all duration-300 ${
                        index === activeHeroMediaIndex
                          ? "w-10 bg-(--seva-accent)"
                          : "w-5 bg-white/20 hover:bg-white/35"
                      }`}
                    />
                  ))}
                </div>
            </div>
          </div>
        </section>

        <section
          id="home-services"
          className="scroll-mt-24 py-14 lg:py-18"
        >
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.82fr)] lg:items-center">
            <ServiceVisual
              service={primaryCollection}
              className="overflow-hidden rounded-[0.35rem] bg-(--seva-elevated)"
              imageClassName="h-[18rem] w-full object-cover sm:h-[24rem] lg:h-[27rem]"
            />

            <div className="lg:max-w-[22rem]">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-(--seva-text-muted)">
                {primaryCollection.collectionLabel} /{" "}
                {primaryCollection.category || "Service"}
              </p>
              <h2 className="sevacam-display mt-4 text-[clamp(2.4rem,5vw,4rem)] leading-[0.92] text-(--seva-text)">
                {primaryCollection.publicName || primaryCollection.name}
              </h2>
              <p className="mt-4 text-base leading-8 text-(--seva-text-soft)">
                {primaryCollection.description ||
                  "A calm, editorial booking experience centered on craft, timing, and atmosphere."}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-6 border-t border-(--seva-border-subtle) pt-6">
                <div>
                  <p className="text-[0.62rem] uppercase tracking-[0.18em] text-(--seva-text-muted)">
                    Duration
                  </p>
                  <p className="mt-2 text-sm uppercase tracking-[0.14em] text-(--seva-text)">
                    {formatDuration(primaryCollection.durationMinutes)}
                  </p>
                </div>
                <div>
                  <p className="text-[0.62rem] uppercase tracking-[0.18em] text-(--seva-text-muted)">
                    Investment
                  </p>
                  <p className="mt-2 text-sm uppercase tracking-[0.14em] text-(--seva-text)">
                    {formatCurrency(primaryCollection.price)}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={primaryCollection.bookingHref}
                  className="sevacam-primary-button inline-flex min-h-11 items-center gap-2 rounded-[0.18rem] px-6 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
                >
                  Reserve Experience
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/services"
                  className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-(--seva-accent) transition-colors hover:text-(--seva-text)"
                >
                  View Full Collection
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-6 lg:py-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.12fr)] lg:items-center">
            <div className="order-2 lg:order-1 lg:max-w-[22rem]">
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-(--seva-text-muted)">
                {secondaryCollection.collectionLabel} /{" "}
                {secondaryCollection.category || "Service"}
              </p>
              <h2 className="sevacam-display mt-4 text-[clamp(2.2rem,4vw,3.3rem)] leading-[0.94] text-(--seva-text)">
                {secondaryCollection.publicName || secondaryCollection.name}
              </h2>
              <p className="mt-4 text-sm leading-7 text-(--seva-text-soft) sm:text-base sm:leading-8">
                {secondaryCollection.description ||
                  "A quieter premium service shaped around precision, atmosphere, and a direct booking path."}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-6 border-t border-(--seva-border-subtle) pt-6">
                <div>
                  <p className="text-[0.62rem] uppercase tracking-[0.18em] text-(--seva-text-muted)">
                    Duration
                  </p>
                  <p className="mt-2 text-sm uppercase tracking-[0.14em] text-(--seva-text)">
                    {formatDuration(secondaryCollection.durationMinutes)}
                  </p>
                </div>
                <div>
                  <p className="text-[0.62rem] uppercase tracking-[0.18em] text-(--seva-text-muted)">
                    Investment
                  </p>
                  <p className="mt-2 text-sm uppercase tracking-[0.14em] text-(--seva-text)">
                    {formatCurrency(secondaryCollection.price)}
                  </p>
                </div>
              </div>

              <Link
                href={secondaryCollection.bookingHref}
                className="sevacam-secondary-button mt-8 inline-flex min-h-11 items-center justify-center rounded-[0.18rem] px-6 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
              >
                Reserve Experience
              </Link>
            </div>

            <ServiceVisual
              service={secondaryCollection}
              className="order-1 overflow-hidden rounded-[0.35rem] bg-(--seva-elevated) lg:order-2"
              imageClassName="h-[18rem] w-full object-cover sm:h-[24rem] lg:h-[26rem]"
            />
          </div>
        </section>

        <section className="mt-10 -mx-6 bg-(--seva-surface)/78 px-6 py-10 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10 lg:py-12">
          <div className="mx-auto grid max-w-[86rem] gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-center">
            <ServiceVisual
              service={tertiaryCollection}
              className="overflow-hidden rounded-[0.35rem] bg-(--seva-elevated)"
              imageClassName="h-[14rem] w-full object-cover sm:h-[16rem] lg:h-[18rem]"
            />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-(--seva-text-muted)">
                  {tertiaryCollection.collectionLabel}
                </p>
                <h2 className="sevacam-display mt-4 text-[clamp(2.3rem,4vw,3.6rem)] leading-[0.94] italic text-(--seva-text)">
                  {tertiaryCollection.publicName || tertiaryCollection.name}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-(--seva-text-soft) sm:text-base sm:leading-8">
                  {tertiaryCollection.description ||
                    "A premium service experience guided by material detail, atmosphere, and a minimal booking path."}
                </p>
                <p className="mt-4 text-[0.62rem] uppercase tracking-[0.18em] text-(--seva-warm)">
                  {tertiaryCollection.availabilityLabel}
                </p>
              </div>

              <div className="lg:text-right">
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-(--seva-text-muted)">
                  Fee
                </p>
                <p className="mt-3 text-[2rem] font-medium tabular-nums text-(--seva-text)">
                  {formatCurrency(tertiaryCollection.price)}
                </p>
                <Link
                  href={tertiaryCollection.bookingHref}
                  className="sevacam-primary-button mt-6 inline-flex min-h-11 items-center rounded-[0.18rem] px-6 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
                >
                  Reserve Private Suite
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="sevacam-rail px-6 py-12 text-center sm:px-8 lg:px-10 lg:py-16">
            <h2 className="sevacam-display text-[clamp(2rem,4vw,3.2rem)] leading-[1] text-(--seva-text)">
              Seeking a bespoke arrangement?
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-(--seva-text-soft) sm:text-base sm:leading-8">
              Our curators are available for private consultations, tailored
              recommendations, and direct service guidance for first-time
              guests.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/services"
                className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-(--seva-accent) transition-colors hover:text-(--seva-text)"
              >
                Initiate Correspondence
              </Link>
              <Link
                href={primaryCollection.bookingHref}
                className="sevacam-secondary-button inline-flex min-h-11 items-center justify-center rounded-[0.18rem] px-6 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
              >
                Review Highlighted Service
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-(--seva-border-subtle) bg-(--seva-base)">
        <div className="mx-auto flex max-w-[86rem] flex-col gap-6 px-6 py-8 text-[0.58rem] uppercase tracking-[0.18em] text-(--seva-text-muted) sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <p>Copyright 2026 SevaCam. All rights reserved.</p>
          <nav className="flex flex-wrap gap-x-6 gap-y-3">
            <Link href="/" className="transition-colors hover:text-(--seva-text)">
              Privacy
            </Link>
            <Link href="/" className="transition-colors hover:text-(--seva-text)">
              Terms
            </Link>
            <Link
              href="/services"
              className="transition-colors hover:text-(--seva-text)"
            >
              Services
            </Link>
            <Link
              href="/support"
              className="transition-colors hover:text-(--seva-text)"
            >
              Concierge
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
