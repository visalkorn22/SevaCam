"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Service } from "@/lib/types/landing";

interface FeaturedServicesProps {
  services: Service[];
}

export function FeaturedServices({ services }: FeaturedServicesProps) {
  if (services.length === 0) return null;
  const highlight = services[0];
  const image = highlight.imageUrls?.[0] || highlight.imageUrl;

  return (
    <section className="border-y border-border/40 bg-muted/20">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <p className="mb-12 text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">
          Monthly highlight
        </p>

        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Image */}
          <div className="overflow-hidden rounded-4xl bg-muted aspect-4/3">
            {image ? (
              <img
                src={image}
                alt={highlight.publicName || highlight.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground/40">
                Highlight Image
              </div>
            )}
          </div>

          {/* Text */}
          <div>
            <h2 className="font-serif text-4xl font-normal leading-tight tracking-tight text-foreground sm:text-5xl">
              {highlight.publicName || highlight.name}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {highlight.description ||
                "A premium experience curated for focus, clarity, and convenience."}
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Concierge service included",
                "Flexible schedule options",
                "Designed for premium clientele",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm text-muted-foreground"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link
                href={`/book/${highlight.id}?serviceId=${highlight.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[11px] font-bold uppercase tracking-[0.25em] text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
              >
                Explore session
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                {highlight.durationMinutes} min &mdash; ${highlight.price}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
