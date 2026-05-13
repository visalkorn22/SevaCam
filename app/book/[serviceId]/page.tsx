import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { BookingForm } from "@/components/booking/booking-form";
import { ImageCarousel } from "@/components/ui/image-carousel";
import LocationMapView from "@/components/booking/LocationMapView";
import {
  ServiceReviews,
  type ServiceReviewsData,
} from "@/components/booking/ServiceReviews";
import { ArrowRight, Check, ChevronLeft, MapPin } from "lucide-react";

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
    address: string | null;
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
  return (
    <div className="sevacam-home min-h-screen bg-(--bg-base) text-(--text-primary)">
      <div className="mx-auto w-full max-w-[86rem] px-6 py-8 sm:px-8 lg:px-10">

        {/* Back link */}
        <Link
          href="/services"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-(--text-secondary) transition-colors hover:text-(--text-primary)"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to services
        </Link>

        {/* ── Service hero: 2-column ── */}
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          {/* Left: image */}
          <div className="overflow-hidden rounded-2xl">
            {images.length > 0 ? (
              <ImageCarousel
                images={images}
                alt={displayName}
                className="w-full"
                imageClassName="w-full object-cover"
              />
            ) : (
              <div className={`aspect-4/3 w-full ${heroArtClass}`} />
            )}
          </div>

          {/* Right: info + CTA */}
          <div className="space-y-5 lg:py-2">
            {service.category && (
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-(--seva-warm)">
                {service.category}
              </p>
            )}
            <h1 className="text-3xl font-bold leading-tight text-(--text-primary) sm:text-4xl">
              {displayName}
            </h1>
            {service.description && (
              <p className="text-sm leading-7 text-(--text-secondary)">
                {service.description}
              </p>
            )}

            {/* Stats row */}
            <div className="flex gap-8 border-y border-(--border-muted) py-5">
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                  Price
                </p>
                <p className="mt-1 text-xl font-bold text-(--text-primary)">
                  {formatPrice(service.price)}
                </p>
              </div>
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                  Length
                </p>
                <p className="mt-1 text-xl font-bold text-(--text-primary)">
                  {formatDuration(service.duration_minutes)}
                </p>
              </div>
              {reviewsData?.average_rating != null && (
                <div>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                    Rating
                  </p>
                  <p className="mt-1 text-xl font-bold text-(--text-primary)">
                    {reviewsData.average_rating.toFixed(1)}
                  </p>
                </div>
              )}
            </div>

            {/* CTA — scrolls to the booking form */}
            <a
              href="#booking"
              className="sevacam-primary-button flex min-h-12 w-full items-center justify-center gap-2 rounded-[0.18rem] px-6 py-3.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#07292d]"
            >
              Reserve service · {formatPrice(service.price)}
              <ArrowRight className="h-4 w-4" />
            </a>
            {service.deposit_amount > 0 && (
              <p className="text-center text-xs text-(--text-secondary)">
                {formatPrice(service.deposit_amount)} deposit now ·{" "}
                {formatPrice(service.price - service.deposit_amount)} after session
              </p>
            )}
          </div>
        </div>

        {/* ── What's included + Who guides it ── */}
        {(inclusionItems.length > 0 || staff.length > 0) && (
          <div className="mt-14 grid gap-10 md:grid-cols-2">
            {inclusionItems.length > 0 && (
              <div>
                <p className="mb-4 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                  What&apos;s Included
                </p>
                <ul className="space-y-3">
                  {inclusionItems.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-(--text-secondary)">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-primary)" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {staff.length > 0 && (
              <div>
                <p className="mb-4 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                  Who Guides It
                </p>
                <div className="space-y-3">
                  {staff.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--border-muted) bg-(--bg-elevated)">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-(--text-primary)/80">
                            {member.name
                              .split(" ")
                              .map((p: string) => p[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-(--text-primary)">
                        {member.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Prep notes ── */}
        {service.prep_notes && (
          <div className="mt-10 rounded-xl border border-(--border-muted) bg-(--bg-elevated) p-6">
            <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
              Prep Notes
            </p>
            <p className="text-sm leading-7 text-(--text-secondary)">{service.prep_notes}</p>
          </div>
        )}

        {/* ── Location maps ── */}
        {service.locations &&
          service.locations.filter((l: { latitude: number | null; longitude: number | null }) => l.latitude !== null && l.longitude !== null).length > 0 && (
            <div className="mt-10 space-y-4">
              {service.locations
                .filter((l: { latitude: number | null; longitude: number | null }) => l.latitude !== null && l.longitude !== null)
                .map((loc: { id: string; name: string; address: string | null; latitude: number | null; longitude: number | null }) => (
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
            </div>
          )}

        {/* ── Text-only locations ── */}
        {service.locations &&
          service.locations.filter(
            (l: { latitude: number | null; longitude: number | null; name: string; address: string | null }) => !(l.latitude != null && l.longitude != null) && (l.name || l.address),
          ).length > 0 && (
            <div className="mt-6 space-y-3">
              {service.locations
                .filter((l: { latitude: number | null; longitude: number | null; name: string; address: string | null }) => !(l.latitude != null && l.longitude != null) && (l.name || l.address))
                .map((loc: { id: string; name: string; address: string | null }) => (
                  <div key={loc.id} className="rounded-xl border border-(--border-muted) bg-(--bg-elevated) p-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-primary)" />
                      <div>
                        <p className="text-sm font-semibold text-(--text-primary)">
                          {loc.name || loc.address}
                        </p>
                        {loc.name && loc.address && (
                          <p className="mt-1 text-xs text-(--text-secondary)">{loc.address}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

        {/* ── Reviews ── */}
        <div className="mt-12">
          <ServiceReviews data={reviewsData} />
        </div>

        {/* ── Booking form — full width ── */}
        <section id="booking" className="mt-16 scroll-mt-6 border-t border-(--border-muted) pt-12">
          <BookingForm
            service={service}
            staff={staff}
            customer={me}
            bookingSource={source}
            locations={service.locations}
          />
        </section>

        <footer className="mt-16 border-t border-(--border-muted) pt-8">
          <div className="flex flex-col gap-6 text-[0.58rem] uppercase tracking-[0.18em] text-(--text-secondary) sm:flex-row sm:items-center sm:justify-between">
            <p>Copyright 2026 SevaCam. All rights reserved.</p>
            <nav className="flex flex-wrap gap-x-6 gap-y-3">
              <Link href="/" className="transition-colors hover:text-(--text-primary)">Privacy</Link>
              <Link href="/" className="transition-colors hover:text-(--text-primary)">Terms</Link>
              <Link href="/services" className="transition-colors hover:text-(--text-primary)">Atelier</Link>
              <Link href="/support" className="transition-colors hover:text-(--text-primary)">Contact</Link>
            </nav>
          </div>
        </footer>

      </div>
    </div>
  );
}
