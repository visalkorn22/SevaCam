import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ServicesClient } from "@/components/booking/services-client";

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

async function getActiveServices(): Promise<ServiceRow[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  try {
    const res = await fetch(`${apiUrl}/api/services`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as ServiceRow[];
    return data
      .filter((s) => s.is_active)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export default async function ServicesPage() {
  const services = await getActiveServices();
  const categories = Array.from(
    new Set(services.map((s) => s.category).filter(Boolean)),
  );
  const totalDeposits = services.filter(
    (service) => service.deposit_amount > 0,
  ).length;

  return (
    <div className="sevacam-home min-h-screen bg-(--seva-base) text-(--seva-text)">
      <div className="mx-auto max-w-[86rem] px-6 py-10 sm:px-8 lg:px-10 lg:py-12">
        <div className="mb-6 flex items-center justify-start">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-[0.38rem] border border-(--seva-border-subtle) bg-(--seva-elevated) px-4 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-(--seva-text-soft) transition-colors hover:border-(--seva-border-interactive) hover:bg-(--seva-accent-subtle) hover:text-(--seva-text)"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <section className="grid gap-8 border-b border-(--seva-border-subtle) pb-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <p className="sevacam-eyebrow text-(--seva-warm)">
              Curated services
            </p>
            <h1 className="sevacam-display mt-4 max-w-4xl text-[clamp(3rem,7vw,5.4rem)] leading-[0.92] tracking-[-0.05em] text-(--seva-text)">
              Choose a service with less friction.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-(--seva-text-soft) sm:text-lg">
              Browse {services.length} active service
              {services.length !== 1 ? "s" : ""} across {categories.length}{" "}
              categor{categories.length !== 1 ? "ies" : "y"}, compare duration
              and price clearly, then move directly into booking.
            </p>
          </div>

          <div className="sevacam-rail px-6 py-6">
            <p className="text-[0.62rem] uppercase tracking-[0.18em] text-(--seva-text-muted)">
              Service notes
            </p>
            <div className="mt-5 space-y-3">
              <div className="sevacam-side-stat">
                <span>Collections</span>
                <span>{categories.length}</span>
              </div>
              <div className="sevacam-side-stat">
                <span>Bookable now</span>
                <span>{services.length}</span>
              </div>
              <div className="sevacam-side-stat">
                <span>Deposit required</span>
                <span>{totalDeposits}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="pt-10">
          <ServicesClient initialServices={services} />
        </div>
      </div>
    </div>
  );
}
