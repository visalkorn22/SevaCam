import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { BookingForm } from "@/components/booking/booking-form";
import { ImageCarousel } from "@/components/ui/image-carousel";
import {
  ServiceReviews,
  type ServiceReviewsData,
} from "@/components/booking/ServiceReviews";
import { cn } from "@/lib/utils";
import { ChevronLeft, Clock, DollarSign, Tag, Users } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-(--bg-base)">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        {/* Back navigation */}
        <Link
          href="/services"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-(--text-secondary) transition-colors hover:text-(--text-primary)"
        >
          <ChevronLeft className="h-4 w-4" />
          All Services
        </Link>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)]">
          <div className="space-y-8 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-6 motion-preset-slide-up-sm motion-duration-500">
            {/* Hero image */}
            <div className="relative overflow-hidden rounded-2xl bg-(--bg-surface)">
              {images.length > 0 ? (
                <ImageCarousel
                  images={images}
                  alt={service.name}
                  className="h-80 w-full"
                  imageClassName="h-80 w-full object-cover"
                />
              ) : (
                <div className="h-80 w-full" />
              )}
              {service.category && (
                <span className="absolute left-4 top-4 rounded-full bg-(--bg-overlay)/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-(--text-primary) backdrop-blur-md">
                  {service.category}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-(--text-primary) sm:text-4xl">
                {service.public_name || service.name}
              </h1>
              {service.description ? (
                <p className="text-base leading-relaxed text-(--text-secondary)">
                  {service.description}
                </p>
              ) : null}
            </div>

            {/* Meta pills with icons */}
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
              ) : null}
              {service.max_capacity > 1 ? (
                <span className="flex items-center gap-1.5 rounded-full bg-(--bg-elevated) px-3 py-1.5 text-(--text-secondary)">
                  <Users className="h-3.5 w-3.5 text-(--text-disabled)" />
                  Group · up to {service.max_capacity}
                </span>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {inclusionItems.length > 0 ? (
                <div className="rounded-2xl bg-(--bg-elevated) p-5">
                  <h2 className="text-sm font-semibold text-(--text-primary)">
                    What's Included
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm text-(--text-secondary)">
                    {inclusionItems.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-(--accent-primary)/60" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {service.prep_notes ? (
                <div className="rounded-2xl bg-(--bg-elevated) p-5">
                  <h2 className="text-sm font-semibold text-(--text-primary)">
                    Prep Notes
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-(--text-secondary)">
                    {service.prep_notes}
                  </p>
                </div>
              ) : null}
            </div>

            <ServiceReviews data={reviewsData} />
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-2xl bg-(--bg-surface) p-6 shadow-(--shadow-lg) sm:p-8 motion-preset-slide-up-sm motion-duration-500 motion-delay-100">
              {/* Booking form header */}
              <div className="mb-6 space-y-1 border-b border-(--border-muted) pb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-(--text-secondary)">
                  Step-by-step booking
                </p>
                <h2 className="text-lg font-bold text-(--text-primary)">
                  {service.public_name || service.name}
                </h2>
                <div className="flex items-center gap-3 text-xs text-(--text-secondary)">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(service.duration_minutes)}
                  </span>
                  <span className="text-(--text-disabled)">·</span>
                  <span className="font-semibold tabular-nums text-(--text-primary)">
                    {formatPrice(service.price)}
                  </span>
                </div>
              </div>
              <BookingForm
                service={service}
                staff={staff}
                customer={me}
                bookingSource={source}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
