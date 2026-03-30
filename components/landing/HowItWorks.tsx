"use client";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Explore services",
      description:
        "Browse our curated selection and pick the service that suits your needs.",
    },
    {
      number: "02",
      title: "Select schedule",
      description:
        "Choose a time that fits your calendar with instant availability.",
    },
    {
      number: "03",
      title: "Arrive & enjoy",
      description:
        "Experience a seamless session with professional service delivery.",
    },
  ];

  return (
    <section id="how-it-works" className="bg-background">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        {/* Header */}
        <div className="mb-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">
              The process
            </p>
            <h2 className="mt-4 font-serif text-4xl font-normal leading-tight text-foreground sm:text-5xl">
              Three steps,<br />one experience
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground sm:text-right">
            From discovery to confirmation — designed for speed and clarity.
          </p>
        </div>

        {/* Steps */}
        <div className="relative grid gap-10 md:grid-cols-3">
          {/* Connecting line */}
          <div className="absolute left-10 right-10 top-10 hidden h-px bg-border/40 md:block" />

          {steps.map((step) => (
            <div key={step.title} className="relative">
              <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card shadow-(--shadow-card)">
                <span className="font-serif text-2xl font-light text-muted-foreground/50">
                  {step.number}
                </span>
              </div>

              <h3 className="mt-6 text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
