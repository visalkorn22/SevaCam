"use client";

import { Input } from "@/components/ui/input";
import { Clock, DollarSign, Users, Timer } from "lucide-react";
import type { ServiceFormData, UpdateServiceField } from "./types";

type EnhancedPricingDurationProps = {
  formData: ServiceFormData;
  updateField: UpdateServiceField;
};

const fieldLabel = "block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled) mb-2";
const fieldInput = "h-11 rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:ring-1 focus-visible:ring-(--accent-primary) focus-visible:border-(--accent-primary) transition-colors";
const iconClass = "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-(--text-disabled) pointer-events-none";

export default function EnhancedPricingDuration({
  formData,
  updateField,
}: EnhancedPricingDurationProps) {
  return (
    <div className="space-y-6">

      {/* Primary row — Price + Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={fieldLabel}>Price (USD)</label>
          <div className="relative">
            <DollarSign className={iconClass} />
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => updateField("price", Number(e.target.value))}
              className={`${fieldInput} pl-9`}
              min="0"
              step="0.01"
            />
          </div>
        </div>
        <div>
          <label className={fieldLabel}>Duration (min)</label>
          <div className="relative">
            <Clock className={iconClass} />
            <Input
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => updateField("duration_minutes", Number(e.target.value))}
              className={`${fieldInput} pl-9`}
              min="1"
            />
          </div>
        </div>
      </div>

      {/* Secondary row — Deposit + Capacity */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={fieldLabel}>Deposit (USD)</label>
          <div className="relative">
            <DollarSign className={iconClass} />
            <Input
              type="number"
              value={formData.deposit_amount}
              onChange={(e) => updateField("deposit_amount", Number(e.target.value))}
              className={`${fieldInput} pl-9`}
              min="0"
              step="0.01"
            />
          </div>
          <p className="mt-1.5 text-[0.68rem] text-(--text-disabled)">
            Set 0 to charge full amount at booking
          </p>
        </div>
        <div>
          <label className={fieldLabel}>Max Capacity</label>
          <div className="relative">
            <Users className={iconClass} />
            <Input
              type="number"
              value={formData.max_capacity}
              onChange={(e) => updateField("max_capacity", Number(e.target.value))}
              className={`${fieldInput} pl-9`}
              min="1"
            />
          </div>
          <p className="mt-1.5 text-[0.68rem] text-(--text-disabled)">
            Guests per session slot
          </p>
        </div>
      </div>

      {/* Buffer time */}
      <div>
        <label className={fieldLabel}>Buffer Time (min)</label>
        <div className="relative">
          <Timer className={iconClass} />
          <Input
            type="number"
            value={formData.buffer_minutes}
            onChange={(e) => updateField("buffer_minutes", Number(e.target.value))}
            className={`${fieldInput} pl-9`}
            min="0"
          />
        </div>
        <p className="mt-1.5 text-[0.68rem] text-(--text-disabled)">
          Gap after each session for setup or cleanup
        </p>
      </div>

      {/* Live summary tile */}
      <div className="grid grid-cols-3 gap-3 rounded-[0.75rem] border border-(--border-subtle) bg-(--bg-inset) p-4">
        <div>
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-(--text-disabled)">Total slot</p>
          <p className="mt-1.5 text-sm font-semibold text-(--text-primary)">
            {formData.duration_minutes + formData.buffer_minutes} min
          </p>
        </div>
        <div>
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-(--text-disabled)">Full price</p>
          <p className="mt-1.5 text-sm font-semibold text-(--text-primary)">
            ${Number(formData.price).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-(--text-disabled)">Due today</p>
          <p className="mt-1.5 text-sm font-semibold text-(--accent-primary)">
            ${formData.deposit_amount > 0 ? Number(formData.deposit_amount).toFixed(2) : Number(formData.price).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
