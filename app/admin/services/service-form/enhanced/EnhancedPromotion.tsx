"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceFormData, UpdateServiceField } from "./types";

type EnhancedPromotionProps = {
  formData: ServiceFormData;
  updateField: UpdateServiceField;
};

const fieldLabel =
  "mb-2 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)";
const fieldInput =
  "h-10 rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:border-(--accent-primary) focus-visible:ring-1 focus-visible:ring-(--accent-primary) transition-colors";

export default function EnhancedPromotion({
  formData,
  updateField,
}: EnhancedPromotionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-[0.75rem] border border-(--border-subtle) bg-(--bg-inset) p-4">
        <div>
          <p className="text-sm font-semibold text-(--text-primary)">
            Service Visibility
          </p>
          <p className="text-xs text-(--text-secondary)">
            Control whether this service is visible to customers
          </p>
        </div>
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => updateField("is_active", checked)}
        />
      </div>

      <div>
        <label className={fieldLabel}>Tags (comma separated)</label>
        <Input
          value={formData.tags}
          onChange={(e) => updateField("tags", e.target.value)}
          placeholder="e.g. relaxing, premium, hydrating"
          className={fieldInput}
        />
        <p className="mt-1.5 text-[0.68rem] text-(--text-disabled)">
          Tags help customers find this service in search
        </p>
      </div>

      <div>
        <label className={fieldLabel}>What&apos;s Included</label>
        <Textarea
          value={formData.inclusions}
          onChange={(e) => updateField("inclusions", e.target.value)}
          placeholder="List what's included in this service..."
          rows={3}
          className="resize-none rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:border-(--accent-primary) focus-visible:ring-1 focus-visible:ring-(--accent-primary) transition-colors"
        />
      </div>
    </div>
  );
}
