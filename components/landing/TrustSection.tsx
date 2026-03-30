"use client";

export function TrustSection() {
  const stats = [
    { value: "10K+", label: "Happy Clients" },
    { value: "4.9/5", label: "Average Rating" },
    { value: "100%", label: "Secure Payments" },
  ];

  const reviews = [
    {
      quote:
        "Effortless booking and refined presentation. Everything feels curated.",
      name: "Nina K.",
    },
    {
      quote: "Premium service details and a calm, trustworthy experience.",
      name: "Jacob P.",
    },
  ];

  return (
    <section id="about" className="bg-background">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        {/* Stats bar */}
        <div className="mb-20 overflow-hidden rounded-2xl border border-border/40">
          <div className="grid grid-cols-3 divide-x divide-border/40">
            {stats.map((stat) => (
              <div key={stat.label} className="px-6 py-8 text-center lg:px-10">
                <p className="text-3xl font-semibold tabular-nums text-foreground lg:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="grid gap-16 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">
              The experience
            </p>
            <h2 className="mt-4 font-serif text-4xl font-normal leading-tight tracking-tight text-foreground sm:text-5xl">
              Trusted by professionals<br />who value excellence
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Every booking is designed with clarity, discretion, and premium
              service at the core.
            </p>

            <div className="mt-10 space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.name}
                  className="rounded-xl border border-border/50 bg-muted/30 p-5"
                >
                  <p className="text-sm leading-relaxed text-foreground">
                    &ldquo;{review.quote}&rdquo;
                  </p>
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                    {review.name}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex aspect-3/4 items-center justify-center rounded-4xl border border-border/40 bg-muted/20">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground/40">
              Experience Image
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
