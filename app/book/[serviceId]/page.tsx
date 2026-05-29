import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { BookingForm } from "@/components/booking/booking-form";
import { ImageCarousel } from "@/components/ui/image-carousel";
import { StarRating } from "@/components/ui/star-rating";
import LocationMapView from "@/components/booking/LocationMapView";
import { resolveAvatarUrl } from "@/lib/utils/avatar";
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
  skills?: string[];
  bio?: string | null;
  average_rating?: number | null;
  review_count?: number;
  completed_bookings?: number;
  experience_level?: string | null;
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

const SECTION_LABEL_CLASS = "sevacam-booking-label text-(--text-secondary)";
const PRIMARY_ACTION_CLASS =
  "sevacam-booking-primary-action flex min-h-12 w-full items-center justify-center gap-2 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.18em]";
const SECONDARY_ACTION_CLASS =
  "sevacam-booking-secondary-action inline-flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em]";

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
          className={`mb-8 ${SECONDARY_ACTION_CLASS}`}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to services
        </Link>

        {/* ── Service hero: 2-column ── */}
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          {/* Left: image */}
          <div className="sevacam-booking-card overflow-hidden">
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
          <div className="lg:py-2">
            {service.category && (
              <p className={SECTION_LABEL_CLASS}>
                {service.category}
              </p>
            )}
            <h1
              className={`${service.category ? "mt-1 " : ""}text-3xl font-medium leading-tight text-(--text-primary) sm:text-4xl`}
            >
              {displayName}
            </h1>
            {service.description && (
              <p className="mt-6 text-sm leading-7 text-(--text-secondary)">
                {service.description}
              </p>
            )}

            {/* Stats row */}
            <div className="mt-6 flex gap-8 border-y border-(--booking-frame) py-4">
              <div>
                <p className={SECTION_LABEL_CLASS}>
                  Price
                </p>
                <p className="mt-1 text-xl font-medium text-(--text-primary)">
                  {formatPrice(service.price)}
                </p>
              </div>
              <div>
                <p className={SECTION_LABEL_CLASS}>
                  Length
                </p>
                <p className="mt-1 text-xl font-medium text-(--text-primary)">
                  {formatDuration(service.duration_minutes)}
                </p>
              </div>
              {reviewsData?.average_rating != null && (
                <div>
                  <p className={SECTION_LABEL_CLASS}>
                    Rating
                  </p>
                  <p className="mt-1 text-xl font-medium text-(--text-primary)">
                    {reviewsData.average_rating.toFixed(1)}
                  </p>
                </div>
              )}
            </div>

            {/* CTA — scrolls to the booking form */}
            <a
              href="#booking"
              className={`mt-6 ${PRIMARY_ACTION_CLASS}`}
            >
              Reserve service · {formatPrice(service.price)}
              <ArrowRight className="h-4 w-4" />
            </a>
            {service.deposit_amount > 0 && (
              <p className="mt-3 text-center text-xs text-(--text-secondary)">
                {formatPrice(service.deposit_amount)} deposit now ·{" "}
                {formatPrice(service.price - service.deposit_amount)} after session
              </p>
            )}
          </div>
        </div>

        {/* ── What's included + Who guides it ── */}
        {(inclusionItems.length > 0 || staff.length > 0) && (
          <div className="mt-7 grid gap-7 md:grid-cols-2">
            {inclusionItems.length > 0 && (
              <div>
                <p className={`${SECTION_LABEL_CLASS} mb-4`}>
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
                <p className={`${SECTION_LABEL_CLASS} mb-4`}>
                  Who Guides It
                </p>
                <div className="space-y-3">
                  {staff.map((member) => {
                    const avatarSrc = resolveAvatarUrl(member.avatar_url);
                    return (
                      <div
                        key={member.id}
                        className="sevacam-booking-card space-y-3 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--bg-inset)">
                            {avatarSrc ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={avatarSrc}
                                alt={member.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-medium text-(--text-primary)">
                                {member.name
                                  .split(" ")
                                  .map((part: string) => part[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-(--text-primary)">
                              {member.name}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2 text-[0.68rem] text-(--text-secondary)">
                              <span className="rounded-full bg-(--bg-inset) px-2.5 py-1">
                                {member.experience_level || "Beginner"}
                              </span>
                              <span className="rounded-full bg-(--bg-inset) px-2.5 py-1">
                                {member.average_rating != null ? (
                                  <StarRating
                                    rating={member.average_rating}
                                    showValue
                                    className="text-[0.68rem]"
                                    valueClassName="text-[0.68rem] text-(--text-secondary)"
                                  />
                                ) : (
                                  "New"
                                )}
                              </span>
                              <span className="rounded-full bg-(--bg-inset) px-2.5 py-1">
                                {member.completed_bookings ?? 0} completed
                              </span>
                            </div>
                          </div>
                        </div>

                        {member.skills && member.skills.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {member.skills.map((skill) => (
                              <span
                                key={`${member.id}-${skill}`}
                                className="rounded-full border border-(--booking-frame) px-2.5 py-1 text-[0.66rem] text-(--text-secondary)"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}

                        {member.bio && (
                          <p className="text-xs leading-6 text-(--text-secondary)">
                            {member.bio}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Prep notes ── */}
        {service.prep_notes && (
          <div className="sevacam-booking-rail mt-7 p-6">
            <p className={`${SECTION_LABEL_CLASS} mb-3`}>
              Prep Notes
            </p>
            <p className="text-sm leading-7 text-(--text-secondary)">{service.prep_notes}</p>
          </div>
        )}

        {/* ── Location maps ── */}
        {service.locations &&
          service.locations.filter((l: { latitude: number | null; longitude: number | null }) => l.latitude !== null && l.longitude !== null).length > 0 && (
            <div className="mt-7 space-y-4">
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
            <div className="mt-7 space-y-3">
              {service.locations
                .filter((l: { latitude: number | null; longitude: number | null; name: string; address: string | null }) => !(l.latitude != null && l.longitude != null) && (l.name || l.address))
                .map((loc: { id: string; name: string; address: string | null }) => (
                  <div key={loc.id} className="sevacam-booking-card p-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-primary)" />
                      <div>
                        <p className="text-sm font-medium text-(--text-primary)">
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
        <div className="mt-7">
          <ServiceReviews data={reviewsData} />
        </div>

        {/* ── Booking form — full width ── */}
        <section id="booking" className="mt-7 scroll-mt-6 border-t border-(--booking-frame) pt-7">
          <BookingForm
            service={service}
            staff={staff}
            customer={me}
            bookingSource={source}
            locations={service.locations}
          />
        </section>

        <footer className="mt-7 border-t border-(--booking-frame) pt-7">
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
