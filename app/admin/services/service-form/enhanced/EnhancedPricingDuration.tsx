"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, Clock, DollarSign, Timer, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ServiceFormData, UpdateServiceField } from "./types";

type EnhancedPricingDurationProps = {
  formData: ServiceFormData;
  updateField: UpdateServiceField;
};

type NumericFieldKey =
  | "price"
  | "duration_minutes"
  | "deposit_amount"
  | "max_capacity"
  | "buffer_minutes";

const fieldLabel =
  "mb-2 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-disabled)]";
const fieldInput =
  "sevacam-number-input h-12 rounded-[0.8rem] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.03)] text-base font-medium text-white placeholder:text-[var(--text-disabled)] focus-visible:border-[var(--accent-primary)] focus-visible:bg-[var(--bg-elevated)] focus-visible:ring-1 focus-visible:ring-[rgba(122,213,221,0.35)] transition-colors";
const iconShell =
  "pointer-events-none absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(122,213,221,0.08)] text-[var(--accent-primary)]";
const stepperButton =
  "sevacam-stepper-button flex h-[1.15rem] w-[1.35rem] items-center justify-center rounded-[0.4rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors hover:border-[rgba(122,213,221,0.22)] hover:bg-[rgba(122,213,221,0.1)] hover:text-white";

function clampNumber(value: number, min: number, decimals = 0) {
  const safe = Number.isFinite(value) ? value : min;
  const next = Math.max(min, safe);
  return decimals > 0 ? Number(next.toFixed(decimals)) : Math.round(next);
}

function NumericField({
  label,
  icon,
  value,
  field,
  min,
  step,
  decimals = 0,
  helpText,
  updateField,
}: {
  label: string;
  icon: ReactNode;
  value: number;
  field: NumericFieldKey;
  min: number;
  step: number;
  decimals?: number;
  helpText?: string;
  updateField: UpdateServiceField;
}) {
  const setValue = (next: number) => {
    updateField(field, clampNumber(next, min, decimals) as ServiceFormData[NumericFieldKey]);
  };

  return (
    <div>
      <label className={fieldLabel}>{label}</label>
      <div className="relative">
        <span className={iconShell}>{icon}</span>
        <Input
          type="number"
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              setValue(min);
              return;
            }
            const parsed = Number(raw);
            setValue(parsed);
          }}
          className={`${fieldInput} pl-14 pr-12 focus-visible:pl-14 focus-visible:pr-12`}
          min={String(min)}
          step={String(step)}
          inputMode={decimals > 0 ? "decimal" : "numeric"}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-1">
          <button
            type="button"
            className={stepperButton}
            onClick={() => setValue(Number(value ?? 0) + step)}
            aria-label={`Increase ${label.toLowerCase()}`}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={stepperButton}
            onClick={() => setValue(Number(value ?? 0) - step)}
            aria-label={`Decrease ${label.toLowerCase()}`}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {helpText ? (
        <p className="mt-1.5 text-[0.68rem] text-[var(--text-disabled)]">{helpText}</p>
      ) : null}
    </div>
  );
}

export default function EnhancedPricingDuration({
  formData,
  updateField,
}: EnhancedPricingDurationProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumericField
          label="Price (USD)"
          icon={<DollarSign className="h-4 w-4" />}
          value={Number(formData.price)}
          field="price"
          min={0}
          step={1}
          decimals={2}
          updateField={updateField}
        />
        <NumericField
          label="Duration (min)"
          icon={<Clock className="h-4 w-4" />}
          value={Number(formData.duration_minutes)}
          field="duration_minutes"
          min={1}
          step={5}
          updateField={updateField}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumericField
          label="Deposit (USD)"
          icon={<DollarSign className="h-4 w-4" />}
          value={Number(formData.deposit_amount)}
          field="deposit_amount"
          min={0}
          step={1}
          decimals={2}
          helpText="Set 0 to charge full amount at booking"
          updateField={updateField}
        />
        <NumericField
          label="Max Capacity"
          icon={<Users className="h-4 w-4" />}
          value={Number(formData.max_capacity)}
          field="max_capacity"
          min={1}
          step={1}
          helpText="Guests per session slot"
          updateField={updateField}
        />
      </div>

      <NumericField
        label="Buffer Time (min)"
        icon={<Timer className="h-4 w-4" />}
        value={Number(formData.buffer_minutes)}
        field="buffer_minutes"
        min={0}
        step={5}
        helpText="Gap after each session for setup or cleanup"
        updateField={updateField}
      />

      <div className="grid grid-cols-3 gap-3 rounded-[0.85rem] border border-[var(--border-subtle)] bg-[var(--bg-inset)] p-4">
        <div className="rounded-[0.65rem] bg-[rgba(255,255,255,0.03)] px-3 py-3">
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-disabled)]">
            Total slot
          </p>
          <p className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">
            {formData.duration_minutes + formData.buffer_minutes} min
          </p>
        </div>
        <div className="rounded-[0.65rem] bg-[rgba(255,255,255,0.03)] px-3 py-3">
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-disabled)]">
            Full price
          </p>
          <p className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">
            ${Number(formData.price).toFixed(2)}
          </p>
        </div>
        <div className="rounded-[0.65rem] bg-[rgba(122,213,221,0.06)] px-3 py-3">
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-disabled)]">
            Due today
          </p>
          <p className="mt-1.5 text-sm font-semibold text-[var(--accent-primary)]">
            $
            {formData.deposit_amount > 0
              ? Number(formData.deposit_amount).toFixed(2)
              : Number(formData.price).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
