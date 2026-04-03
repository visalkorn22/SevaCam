"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaymentReceiptActions() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print:hidden rounded-[1.6rem] border border-white/8 bg-(--bg-surface) p-5 text-(--text-primary) shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-(--accent-primary)">
        Receipt Actions
      </p>
      <h2 className="mt-3 text-xl font-semibold tracking-tight text-(--text-primary)">
        Keep a copy of this booking
      </h2>
      <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
        Download this page as a PDF or return to the service collection when
        you are ready to book again.
      </p>

      <div className="mt-5 space-y-3">
        <Button
          type="button"
          onClick={handlePrint}
          className="h-12 w-full rounded-[0.75rem] text-[0.68rem] font-semibold uppercase tracking-[0.18em]"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </Button>

        <Button
          asChild
          variant="outline"
          className="h-12 w-full rounded-[0.75rem] border-white/12 bg-(--bg-base) text-[0.68rem] font-semibold uppercase tracking-[0.18em] hover:bg-(--bg-elevated)"
        >
          <Link href="/services">
            <ArrowLeft className="h-4 w-4" />
            Back to Services
          </Link>
        </Button>

        <Button
          asChild
          variant="ghost"
          className="h-11 w-full rounded-[0.75rem] text-[0.68rem] font-semibold uppercase tracking-[0.18em]"
        >
          <Link href="/bookings">
            <CalendarDays className="h-4 w-4" />
            My Bookings
          </Link>
        </Button>
      </div>

      <p className="mt-4 text-xs leading-5 text-(--text-secondary)">
        The download button opens your browser print dialog. Choose{" "}
        <span className="font-medium text-(--text-primary)">Save as PDF</span>{" "}
        to store the receipt.
      </p>
    </div>
  );
}
