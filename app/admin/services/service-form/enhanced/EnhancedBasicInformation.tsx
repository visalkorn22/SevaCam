"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceFormData, UpdateServiceField } from "./types";

type EnhancedBasicInformationProps = {
  formData: ServiceFormData;
  updateField: UpdateServiceField;
};

const CATEGORIES = [
  { value: "WELLNESS", label: "Wellness" },
  { value: "THERAPY", label: "Therapy" },
  { value: "RITUAL", label: "Ritual" },
  { value: "BEAUTY", label: "Beauty" },
  { value: "FITNESS", label: "Fitness" },
];

const fieldLabel =
  "mb-2 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-disabled)]";
const fieldInput =
  "h-11 rounded-[0.55rem] border border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus-visible:border-[var(--accent-primary)] focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] transition-colors";
const selectTrigger =
  "h-11 rounded-[0.7rem] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.03)] text-white focus-visible:border-[var(--accent-primary)] focus-visible:bg-[var(--bg-elevated)] focus-visible:ring-1 focus-visible:ring-[rgba(122,213,221,0.35)]";
const selectContent =
  "rounded-[0.85rem] border border-[rgba(240,238,235,0.12)] bg-[rgba(28,27,27,0.98)] text-white backdrop-blur-xl shadow-[0_24px_48px_rgba(0,0,0,0.45)]";
const selectItem =
  "seva-select-item min-h-10 rounded-[0.6rem] text-white data-[highlighted]:!bg-[rgba(255,255,255,0.06)] data-[highlighted]:!text-white data-[state=checked]:!bg-[rgba(122,213,221,0.18)] data-[state=checked]:!text-white [&_svg]:text-white";

export default function EnhancedBasicInformation({
  formData,
  updateField,
}: EnhancedBasicInformationProps) {
  const charCount = formData.description.length;
  const charMax = 250;
  const charOver = charCount > charMax;

  return (
    <div className="space-y-6">
      <div>
        <label className={fieldLabel}>Service Name</label>
        <Input
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="e.g. Signature Hydrafacial"
          className={`${fieldInput} text-base font-medium`}
        />
      </div>

      <div>
        <label className={fieldLabel}>Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Describe your service offering in a way that excites customers..."
          rows={4}
          className="resize-none rounded-[0.55rem] border border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus-visible:border-[var(--accent-primary)] focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] transition-colors"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-[0.68rem] text-[var(--text-disabled)]">
            Helps customers understand what to expect
          </p>
          <p
            className={`text-[0.68rem] font-medium ${
              charOver ? "text-[#ffb785]" : "text-[var(--text-disabled)]"
            }`}
          >
            {charCount}/{charMax}
          </p>
        </div>
      </div>

      <div>
        <label className={fieldLabel}>Category</label>
        <Select
          value={formData.category}
          onValueChange={(value) => updateField("category", value)}
        >
          <SelectTrigger className={selectTrigger}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={selectContent}>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value} className={selectItem}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
