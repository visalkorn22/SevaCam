"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Download } from "lucide-react";

export function PaymentReceiptActions() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print:hidden rounded-[1.6rem] border border-(--receipt-card-border) bg-(--receipt-card-bg) p-5 text-(--receipt-card-text) shadow-[0_24px_60px_rgba(0,0,0,0.10)]">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-(--receipt-card-accent)">
        Receipt Actions
      </p>
      <h2 className="mt-3 text-xl font-semibold tracking-tight text-(--receipt-card-text)">
        Keep a copy of this booking
      </h2>
      <p className="mt-2 text-sm leading-6 text-(--receipt-card-soft)">
        Download this page as a PDF or return to the service collection when
        you are ready to book again.
      </p>

      <div className="mt-5 space-y-3">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[0.75rem] bg-(--receipt-card-accent) px-4 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-(--receipt-card-accent-hover)"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>

        <Link
          href="/services"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[0.75rem] border border-(--receipt-card-border) bg-(--receipt-card-alt) px-4 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-(--receipt-card-text) transition-colors hover:bg-(--receipt-card-alt-hover) hover:text-(--receipt-card-accent)"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Services
        </Link>

        <Link
          href="/bookings"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[0.75rem] px-4 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-(--receipt-card-muted) transition-colors hover:text-(--receipt-card-text)"
        >
          <CalendarDays className="h-4 w-4" />
          My Bookings
        </Link>
      </div>

      <p className="mt-4 text-xs leading-5 text-(--receipt-card-soft)">
        The download button opens your browser print dialog. Choose{" "}
        <span className="font-medium text-(--receipt-card-text)">Save as PDF</span>{" "}
        to store the receipt.
      </p>
    </div>
  );
}
