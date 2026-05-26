"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Download } from "lucide-react";

export function PaymentReceiptActions() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="sevacam-booking-rail print:hidden p-6 text-(--text-primary)">
      <p className="sevacam-booking-label text-(--text-secondary)">
        Receipt Actions
      </p>
      <h2 className="mt-4 text-xl font-medium tracking-tight text-(--text-primary)">
        Keep a copy of this booking
      </h2>
      <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
        Download this page as a PDF or return to the service collection when
        you are ready to book again.
      </p>

      <div className="mt-5 space-y-3">
        <button
          type="button"
          onClick={handlePrint}
          className="sevacam-booking-primary-action inline-flex h-12 w-full items-center justify-center gap-2 px-4 text-[11px] font-medium uppercase tracking-[0.18em]"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>

        <Link
          href="/services"
          className="sevacam-booking-secondary-action inline-flex h-12 w-full items-center justify-center gap-2 px-4 text-[11px] font-medium uppercase tracking-[0.18em]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Services
        </Link>

        <Link
          href="/bookings"
          className="inline-flex h-11 w-full items-center justify-center gap-2 px-4 text-[11px] font-normal uppercase tracking-[0.18em] text-(--text-secondary) transition-colors hover:text-(--text-primary)"
        >
          <CalendarDays className="h-4 w-4" />
          My Bookings
        </Link>
      </div>

      <p className="mt-4 text-xs leading-5 text-(--text-secondary)">
        The download button opens your browser print dialog. Choose{" "}
        <span className="font-medium text-(--text-primary)">Save as PDF</span>{" "}
        to store the receipt.
      </p>
    </div>
  );
}
