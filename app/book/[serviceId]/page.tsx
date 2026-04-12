import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { BookingForm } from "@/components/booking/booking-form";
import { ImageCarousel } from "@/components/ui/image-carousel";
import {
  ServiceReviews,
  type ServiceReviewsData,
} from "@/components/booking/ServiceReviews";
import { ChevronLeft, Clock, DollarSign, Tag, Users } from "lucide-react";
import dynamic from "next/dynamic";
const LocationMapView = dynamic(
  () => import("@/components/booking/LocationMapView"),
  { ssr: false }
);

type MeUser = {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  timezone?: string | null;
  role: "customer" | "staff" | "admin" | "superadmin";
};

type ServiceRow = {
  id: string;
  name: string;
  public_name?: string | null;
  internal_name?: string | null;
  category?: string | null;
  tags?: string[] | null;
  description?: string | null;
  inclusions?: string | null;
  prep_notes?: string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  duration_minutes: number;
  price: number;
  deposit_amount: number;
  max_capacity: number;
  is_active: boolean;
  locations?: Array<{
    id: string;
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
  }>;
};

type StaffOption = {
  id: string;
  name: string;
  avatar_url?: string | null;
  price_override?: number | string | null;
  deposit_override?: number | string | null;
  duration_override?: number | string | null;
  buffer_override?: number | string | null;
  capacity_override?: number | string | null;
};

const bookingArtClasses = [
  "sevacam-art-stones",
  "sevacam-art-sanctuary",
  "sevacam-art-dining",
  "sevacam-art-ritual",
  "sevacam-art-chamber",
  "sevacam-art-botanical",
] as const;

async function getMe(): Promise<MeUser | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  const res = await fetch(`${apiUrl}/api/auth/me`, {
    method: "GET",
    headers: { Cookie: cookie },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as MeUser;
}

async function getService(serviceId: string): Promise<ServiceRow | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  try {
    const res = await fetch(`${apiUrl}/api/services/${serviceId}`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return (await res.json()) as ServiceRow;
  } catch {
    return null;
  }
}

async function getServiceStaff(serviceId: string): Promise<StaffOption[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  try {
    const res = await fetch(`${apiUrl}/api/services/${serviceId}/staff`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (!res.ok) return [];
    return (await res.json()) as StaffOption[];
  } catch {
    return [];
  }
}

async function getServiceReviews(
  serviceId: string,
): Promise<ServiceReviewsData | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/api/services/${serviceId}/reviews`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ServiceReviewsData;
  } catch {
    return null;
  }
}

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

function getBookingArtClass(seed: string) {
  const total = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return bookingArtClasses[total % bookingArtClasses.length];
}

export default async function BookServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ serviceId: string }> | { serviceId: string };
  searchParams?: Promise<{ source?: string }> | { source?: string };
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { serviceId } = resolvedParams;
  const source = resolvedSearchParams?.source === "social" ? "social" : "web";

  const me = await getMe();
  if (!me) redirect(`/auth/login?redirect=/book/${serviceId}`);

  const service = await getService(serviceId);
  if (!service) notFound();

  const staff = await getServiceStaff(serviceId);
  const reviewsData = await getServiceReviews(serviceId);

  const images = service.image_urls?.length
    ? service.image_urls
    : service.image_url
      ? [service.image_url]
      : [];

  const inclusionItems = service.inclusions
    ? service.inclusions
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const displayName = service.public_name || service.name;
  const heroArtClass = getBookingArtClass(`${service.id}${service.category ?? ""}`);
  const serviceTagline = service.category
    ? `${service.category.toUpperCase()} EXCLUSIVE`
    : "CURATED EXPERIENCE";

  return (
    <div className="sevacam-home min-h-screen bg-(--bg-base) text-(--text-primary)">
      <header className="border-b border-(--border-muted) bg-(--bg-base)">
        <div className="mx-auto flex max-w-[86rem] items-center justify-between gap-6 px-6 py-5 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="sevacam-display text-[1.6rem] tracking-[-0.04em] text-(--text-primary)"
          >
            SevaCam
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/services" className="sevacam-nav-link sevacam-nav-link-active">
              Curation
            </Link>
            <Link href="/bookings" className="sevacam-nav-link">
              Experiences
            </Link>
            <Link href="/support" className="sevacam-nav-link">
              Concierge
            </Link>
          </nav>

          <Link
            href="/services"
            className="sevacam-primary-button inline-flex min-h-11 items-center rounded-[0.18rem] px-5 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
          >
            Reserve
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[86rem] px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <Link
          href="/services"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-(--text-secondary) transition-colors hover:text-(--text-primary)"
        >
          <ChevronLeft className="h-4 w-4" />
          All Services
        </Link>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_24rem] xl:grid-cols-[minmax(0,1.18fr)_27rem]">
          <div className="space-y-8">
            <section className="relative overflow-hidden rounded-[0.5rem] bg-(--bg-surface)">
              {images.length > 0 ? (
                <ImageCarousel
                  images={images}
                  alt={displayName}
                  className="h-[26rem] w-full sm:h-[34rem] xl:h-[42rem]"
                  imageClassName="h-[26rem] w-full object-cover sm:h-[34rem] xl:h-[42rem]"
                />
              ) : (
                <div className={`h-[26rem] w-full sm:h-[34rem] xl:h-[42rem] ${heroArtClass}`} />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/82" />
              <div className="absolute inset-x-0 top-0 p-6 sm:p-8">
                <p className="text-[0.62rem] uppercase tracking-[0.22em] text-(--text-secondary)">
                  Service Detail
                </p>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
                <p className="text-[0.62rem] uppercase tracking-[0.22em] text-(--color-accent-warm)">
                  {serviceTagline}
                </p>
                <h1 className="sevacam-display mt-5 max-w-[8ch] text-[clamp(3.6rem,9vw,6.8rem)] leading-[0.88] tracking-[-0.06em] text-white">
                  {displayName}
                </h1>
                <div className="mt-8 grid gap-6 border-t border-white/10 pt-6 sm:grid-cols-3">
                  <div>
                    <p className="text-[0.62rem] uppercase tracking-[0.18em] text-(--text-secondary)">
                      Duration
                    </p>
                    <p className="mt-2 text-[1.05rem] text-white">
                      {formatDuration(service.duration_minutes)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.62rem] uppercase tracking-[0.18em] text-(--text-secondary)">
                      Investment
                    </p>
                    <p className="mt-2 text-[1.05rem] text-white">
                      {formatPrice(service.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.62rem] uppercase tracking-[0.18em] text-(--text-secondary)">
                      Curators
                    </p>
                    <p className="mt-2 text-[1.05rem] text-white">
                      {staff.length > 0 ? `${staff.length} available` : "Assigned on request"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="space-y-5">
                {service.description ? (
                  <p className="max-w-3xl text-base leading-8 text-(--text-secondary)">
                    {service.description}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2 text-xs font-medium">
                  <span className="flex items-center gap-1.5 rounded-full bg-(--bg-elevated) px-3 py-1.5 text-(--text-secondary)">
                    <Clock className="h-3.5 w-3.5 text-(--text-disabled)" />
                    {formatDuration(service.duration_minutes)}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-(--bg-elevated) px-3 py-1.5 text-(--text-secondary)">
                    <DollarSign className="h-3.5 w-3.5 text-(--text-disabled)" />
                    {formatPrice(service.price)}
                  </span>
                  {service.deposit_amount > 0 ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-(--state-warning-subtle) px-3 py-1.5 text-(--state-warning)">
                      <Tag className="h-3 w-3" />
                      {formatPrice(service.deposit_amount)} deposit
                    </span>
                  ) : (
                    <span className="rounded-full bg-(--bg-elevated) px-3 py-1.5 text-(--text-secondary)">
                      No deposit required
                    </span>
                  )}
                  {service.max_capacity > 1 ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-(--bg-elevated) px-3 py-1.5 text-(--text-secondary)">
                      <Users className="h-3.5 w-3.5 text-(--text-disabled)" />
                      Group - up to {service.max_capacity}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="sevacam-rail p-6">
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-(--text-secondary)">
                  Service Notes
                </p>
                <div className="mt-4 space-y-3">
                  <div className="sevacam-side-stat">
                    <span>Category</span>
                    <span>{service.category || "Curated Service"}</span>
                  </div>
                  <div className="sevacam-side-stat">
                    <span>Provider options</span>
                    <span>{staff.length > 0 ? staff.length : "On request"}</span>
                  </div>
                  <div className="sevacam-side-stat">
                    <span>Booking source</span>
                    <span>{source === "social" ? "Social referral" : "Direct web"}</span>
                  </div>
                </div>
              </div>
            </section>

            {service.locations && service.locations.filter(l => l.latitude !== null).length > 0 && (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-(--text-disabled)">
                  Location{service.locations.length > 1 ? "s" : ""}
                </h3>
                {service.locations
                  .filter((l) => l.latitude !== null && l.longitude !== null)
                  .map((loc) => (
                    <LocationMapView
                      key={loc.id}
                      location={{
                        name: loc.name,
                        address: loc.address,
                        latitude: loc.latitude!,
                        longitude: loc.longitude!,
                      }}
                    />
                  ))}
              </section>
            )}

            {inclusionItems.length > 0 || service.prep_notes ? (
              <section className="grid gap-6 md:grid-cols-2">
                {inclusionItems.length > 0 ? (
                  <div className="sevacam-rail p-6">
                    <h2 className="text-sm font-semibold text-(--text-primary)">
                      What&apos;s Included
                    </h2>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-(--text-secondary)">
                      {inclusionItems.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-(--accent-primary)" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {service.prep_notes ? (
                  <div className="sevacam-rail p-6">
                    <h2 className="text-sm font-semibold text-(--text-primary)">
                      Prep Notes
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-(--text-secondary)">
                      {service.prep_notes}
                    </p>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section>
              <ServiceReviews data={reviewsData} />
            </section>
          </div>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="sevacam-rail p-6 shadow-[0_20px_40px_rgba(0,0,0,0.32)] sm:p-8">
              <div className="space-y-4 border-b border-(--border-muted) pb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-(--text-secondary)">
                  Step-by-step booking
                </p>
                <h2 className="sevacam-display text-[1.8rem] leading-none text-(--text-primary)">
                  Reserve your window
                </h2>
                <div className="grid gap-3 rounded-[0.45rem] bg-(--bg-elevated) p-4 text-xs text-(--text-secondary)">
                  <div className="flex items-center justify-between gap-3">
                    <span>{displayName}</span>
                    <span className="font-semibold text-(--text-primary)">
                      {formatPrice(service.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>{formatDuration(service.duration_minutes)}</span>
                    <span>
                      {staff.length > 0
                        ? `${staff.length} provider${staff.length === 1 ? "" : "s"}`
                        : "Provider assigned"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <BookingForm
                  service={service}
                  staff={staff}
                  customer={me}
                  bookingSource={source}
                  locations={service.locations}
                />
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-16 border-t border-(--border-muted) pt-8">
          <div className="flex flex-col gap-6 text-[0.58rem] uppercase tracking-[0.18em] text-(--text-secondary) sm:flex-row sm:items-center sm:justify-between">
            <p>Copyright 2026 SevaCam. All rights reserved.</p>
            <nav className="flex flex-wrap gap-x-6 gap-y-3">
              <Link href="/" className="transition-colors hover:text-(--text-primary)">
                Privacy
              </Link>
              <Link href="/" className="transition-colors hover:text-(--text-primary)">
                Terms
              </Link>
              <Link href="/services" className="transition-colors hover:text-(--text-primary)">
                Atelier
              </Link>
              <Link href="/support" className="transition-colors hover:text-(--text-primary)">
                Contact
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
