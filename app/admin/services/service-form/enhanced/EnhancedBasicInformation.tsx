"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const fieldLabel = "block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled) mb-2";
const fieldInput = "h-11 rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:ring-1 focus-visible:ring-(--accent-primary) focus-visible:border-(--accent-primary) transition-colors";

export default function EnhancedBasicInformation({
  formData,
  updateField,
}: EnhancedBasicInformationProps) {
  const charCount = formData.description.length;
  const charMax = 250;
  const charOver = charCount > charMax;

  return (
    <div className="space-y-6">
      {/* Service Name */}
      <div>
        <label className={fieldLabel}>Service Name</label>
        <Input
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="e.g. Signature Hydrafacial"
          className={`${fieldInput} text-base font-medium`}
        />
      </div>

      {/* Description */}
      <div>
        <label className={fieldLabel}>Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Describe your service offering in a way that excites customers…"
          rows={4}
          className="resize-none rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:ring-1 focus-visible:ring-(--accent-primary) focus-visible:border-(--accent-primary) transition-colors"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-[0.68rem] text-(--text-disabled)">
            Helps customers understand what to expect
          </p>
          <p className={`text-[0.68rem] font-medium ${charOver ? "text-[#ffb785]" : "text-(--text-disabled)"}`}>
            {charCount}/{charMax}
          </p>
        </div>
      </div>

      {/* Category */}
      <div>
        <label className={fieldLabel}>Category</label>
        <Select
          value={formData.category}
          onValueChange={(value) => updateField("category", value)}
        >
          <SelectTrigger className={fieldInput}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-[0.7rem] border border-[color:var(--border-subtle,rgba(240,238,235,0.08))] bg-[var(--bg-elevated,#1c1b1b)] text-[var(--text-primary,#f0eeeb)] shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            {CATEGORIES.map((cat) => (
              <SelectItem
                key={cat.value}
                value={cat.value}
                className="text-[var(--text-primary,#f0eeeb)] focus:bg-[rgba(122,213,221,0.12)] focus:text-[var(--accent-primary,#7ad5dd)] data-[state=checked]:bg-[var(--accent-primary,#7ad5dd)] data-[state=checked]:text-[var(--text-on-accent,#07292d)]"
              >
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
