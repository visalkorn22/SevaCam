"use client";

import {
  Calendar,
  Shield,
  Clock,
  Star,
  CreditCard,
  Headphones,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Instant Booking",
    description:
      "Book your service in under 2 minutes with real-time availability.",
  },
  {
    icon: Shield,
    title: "Secure & Safe",
    description:
      "Payments and personal data protected with bank-level security.",
  },
  {
    icon: Star,
    title: "Verified Professionals",
    description: "All providers are thoroughly vetted and highly rated.",
  },
  {
    icon: Clock,
    title: "Flexible Scheduling",
    description: "Reschedule or cancel anytime with our hassle-free policy.",
  },
  {
    icon: CreditCard,
    title: "Easy Payments",
    description:
      "Multiple payment options with transparent pricing — no hidden fees.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Our dedicated team is always here to help you.",
  },
];

export function FeatureHighlights() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="mb-16 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">
            Everything you need
          </p>
          <h2 className="mt-4 font-serif text-4xl font-normal text-foreground sm:text-5xl">
            Built for your peace of mind
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
            We&apos;ve designed every detail to make booking effortless, secure,
            and enjoyable.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/40 bg-border/40 grid gap-px sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-background p-8 transition-colors hover:bg-muted/30"
            >
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-5 text-base font-semibold text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
