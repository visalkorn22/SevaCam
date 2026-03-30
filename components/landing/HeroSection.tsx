"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="bg-background overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid min-h-[calc(100vh-4rem)] max-h-[900px] grid-cols-1 items-center gap-12 py-16 lg:grid-cols-[1fr_440px] lg:gap-20 xl:grid-cols-[1fr_500px]">
          {/* Text column */}
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-muted-foreground">
              Aicser Booking System
            </p>

            <h1 className="mt-7 font-serif text-5xl font-normal leading-[1.08] tracking-tight text-foreground sm:text-6xl xl:text-[5.5rem]">
              Excellence in<br />
              Every{" "}
              <span className="italic text-muted-foreground font-light">
                Appointment
              </span>
            </h1>

            <p className="mt-7 max-w-[420px] text-base leading-relaxed text-muted-foreground sm:text-lg">
              Curated experiences and premium service booking — designed for
              discerning professionals.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="h-12 px-8 text-[11px] font-bold uppercase tracking-[0.2em]"
              >
                <Link href="#services">Book a Session</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-12 px-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                <Link href="#about">
                  Our story
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            {/* Trust stats */}
            <div className="mt-14 grid grid-cols-3 divide-x divide-border/40 border-t border-border/40 pt-8">
              {[
                { value: "10K+", label: "Clients served" },
                { value: "4.9", label: "Average rating" },
                { value: "100%", label: "Secure payments" },
              ].map((stat) => (
                <div key={stat.label} className="pr-6 first:pl-0 pl-6">
                  <p className="text-2xl font-semibold tabular-nums text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Image column — hidden on small screens */}
          <div className="hidden lg:block">
            <div className="relative">
              <div className="relative overflow-hidden rounded-[2.5rem] bg-muted aspect-[4/5]">
                <Image
                  src="/Office.webp"
                  alt="Premium appointment space"
                  fill
                  priority
                  sizes="(max-width: 1280px) 440px, 500px"
                  className="object-cover"
                />
                {/* Subtle bottom fade */}
                <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background/20 to-transparent" />
              </div>

              {/* Floating card */}
              <div className="absolute -bottom-5 -left-5 overflow-hidden rounded-2xl border border-border/60 bg-card/95 px-5 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-muted-foreground">
                  Availability
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Open for bookings
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                  <span className="text-[11px] text-muted-foreground">
                    Slots available today
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
