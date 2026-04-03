"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Plus, Trash2, UserRound } from "lucide-react";

type StaffOption = {
  id: string;
  full_name: string | null;
  role: "staff" | "admin" | "superadmin" | "customer";
  is_active: boolean;
};

type StaffWorkBlockDraft = {
  weekday: number;
  start_time_local: string;
  end_time_local: string;
};

type StaffWorkBlockExisting = {
  id: string;
  weekday: number;
  start_time_local: string;
  end_time_local: string;
};

type EnhancedStaffAssignmentsProps = {
  staffOptions: StaffOption[];
  selectedStaffIds: string[];
  setSelectedStaffIds: (ids: string[]) => void;
  enableScheduleAssignment?: boolean;
  scheduleMode?: "create" | "edit";
  scheduleTimezone?: string;
  setScheduleTimezone?: (value: string) => void;
  scheduleBlocksByStaff?: Record<string, StaffWorkBlockDraft[]>;
  setScheduleBlocksByStaff?: (
    updater:
      | Record<string, StaffWorkBlockDraft[]>
      | ((prev: Record<string, StaffWorkBlockDraft[]>) => Record<string, StaffWorkBlockDraft[]>),
  ) => void;
  existingScheduleBlocksByStaff?: Record<string, StaffWorkBlockExisting[]>;
  onRemoveExistingBlock?: (staffId: string, blockId: string) => void;
  scheduleLoading?: boolean;
  scheduleError?: string | null;
};

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const fieldInput =
  "h-10 rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:ring-1 focus-visible:ring-(--accent-primary) focus-visible:border-(--accent-primary) transition-colors text-sm";

export default function EnhancedStaffAssignments({
  staffOptions,
  selectedStaffIds,
  setSelectedStaffIds,
  enableScheduleAssignment = false,
  scheduleMode = "create",
  scheduleTimezone = "Asia/Phnom_Penh",
  setScheduleTimezone,
  scheduleBlocksByStaff = {},
  setScheduleBlocksByStaff,
  existingScheduleBlocksByStaff = {},
  onRemoveExistingBlock,
  scheduleLoading = false,
  scheduleError = null,
}: EnhancedStaffAssignmentsProps) {
  const [localStaff, setLocalStaff] = useState<StaffOption[]>(staffOptions);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { weekday: string; start: string; end: string }>
  >({});

  useEffect(() => {
    if (staffOptions.length > 0) {
      setLocalStaff(staffOptions);
      return;
    }
    let cancelled = false;
    fetch("/api/admin/staff", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Unable to load staff list");
        return res.json() as Promise<StaffOption[]>;
      })
      .then((data) => { if (!cancelled) setLocalStaff(data); })
      .catch((err) => {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : "Unable to load staff");
      });
    return () => { cancelled = true; };
  }, [staffOptions]);

  const availableStaff = localStaff.filter(
    (s) => s.role === "staff" && s.is_active !== false,
  );

  const selectedStaff = useMemo(
    () => availableStaff.filter((s) => selectedStaffIds.includes(s.id)),
    [availableStaff, selectedStaffIds],
  );

  const toggleStaff = (id: string) =>
    setSelectedStaffIds(
      selectedStaffIds.includes(id)
        ? selectedStaffIds.filter((sid) => sid !== id)
        : [...selectedStaffIds, id],
    );

  const getDraft = (staffId: string) =>
    drafts[staffId] || { weekday: "1", start: "09:00", end: "17:00" };

  const updateDraft = (
    staffId: string,
    patch: Partial<{ weekday: string; start: string; end: string }>,
  ) =>
    setDrafts((prev) => ({
      ...prev,
      [staffId]: { ...getDraft(staffId), ...patch },
    }));

  const addBlock = (staffId: string) => {
    if (!setScheduleBlocksByStaff) return;
    const draft = getDraft(staffId);
    if (!draft.start || !draft.end || draft.start >= draft.end) return;
    setScheduleBlocksByStaff((prev) => ({
      ...prev,
      [staffId]: [
        ...(prev[staffId] || []),
        {
          weekday: Number.parseInt(draft.weekday, 10),
          start_time_local: draft.start,
          end_time_local: draft.end,
        },
      ],
    }));
  };

  const removeBlock = (staffId: string, index: number) => {
    if (!setScheduleBlocksByStaff) return;
    setScheduleBlocksByStaff((prev) => ({
      ...prev,
      [staffId]: (prev[staffId] || []).filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled) mb-1">
          Staff Members
        </p>
        <p className="text-sm text-(--text-secondary)">
          Select who can deliver this service. At least one is required.
        </p>
      </div>

      {/* Staff grid */}
      {availableStaff.length === 0 ? (
        <div className="rounded-[0.75rem] border border-dashed border-(--border-subtle) bg-(--bg-inset) px-5 py-6 text-center">
          <UserRound className="mx-auto mb-3 h-8 w-8 text-(--text-disabled)" />
          <p className="text-sm text-(--text-secondary)">
            {loadError ?? "No active staff found. Add staff accounts first."}
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {availableStaff.map((staff) => {
            const isSelected = selectedStaffIds.includes(staff.id);
            return (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => toggleStaff(staff.id)}
                  className={`flex items-center justify-between rounded-[0.75rem] border px-4 py-3.5 text-left transition-all duration-150 ${
                    isSelected
                      ? "border-(--accent-primary)/40 bg-[rgba(122,213,221,0.08)] text-[var(--accent-primary,#7ad5dd)]"
                      : "border-(--border-subtle) bg-(--bg-inset) text-[var(--text-primary,#f0eeeb)] hover:border-(--accent-primary)/25 hover:bg-(--bg-elevated)"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isSelected ? "bg-(--accent-primary)/15 text-[var(--accent-primary,#7ad5dd)]" : "bg-(--bg-elevated) text-[var(--text-secondary,#c7c2bb)]"}`}>
                      {(staff.full_name || "S").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold leading-tight ${isSelected ? "text-[var(--accent-primary,#7ad5dd)]" : "text-[var(--text-primary,#f0eeeb)]"}`}>
                        {staff.full_name || "Staff Member"}
                      </p>
                      <p className={`text-[0.68rem] ${isSelected ? "text-[color:color-mix(in_srgb,var(--accent-primary,#7ad5dd)_75%,white)]" : "text-[var(--text-disabled,#8a837c)]"}`}>
                        {staff.is_active ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-(--accent-primary) bg-(--accent-primary)" : "border-(--border-subtle) bg-transparent"}`}>
                  {isSelected && <Check className="h-3 w-3 text-(--text-on-accent)" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Schedule blocks */}
      {enableScheduleAssignment && (
        <div className="space-y-5 rounded-[0.85rem] border border-(--border-subtle) bg-(--bg-inset) p-5">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled) mb-1">
              {scheduleMode === "edit" ? "Staff Time Blocks" : "Quick Schedule"}
            </p>
            <p className="text-sm text-(--text-secondary)">
              {scheduleMode === "edit"
                ? "Add or remove weekly time blocks for selected staff."
                : "Optionally assign weekly time slots to selected staff."}
            </p>
            {scheduleLoading && (
              <p className="mt-2 text-xs text-(--text-disabled)">Loading current blocks…</p>
            )}
            {scheduleError && (
              <p className="mt-2 text-xs text-(--state-warning)">{scheduleError}</p>
            )}
          </div>

          <div>
            <Label className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled) mb-2 block">
              Timezone
            </Label>
            <Input
              value={scheduleTimezone}
              onChange={(e) => setScheduleTimezone?.(e.target.value)}
              placeholder="Asia/Phnom_Penh"
              className={fieldInput}
            />
          </div>

          {selectedStaff.length === 0 ? (
            <p className="text-xs text-(--text-disabled)">Select staff above to configure time slots.</p>
          ) : (
            <div className="space-y-4">
              {selectedStaff.map((staff) => {
                const blocks = scheduleBlocksByStaff[staff.id] || [];
                const existingBlocks = existingScheduleBlocksByStaff[staff.id] || [];
                const draft = getDraft(staff.id);
                const totalBlocks = existingBlocks.length + blocks.length;

                return (
                  <div key={staff.id} className="rounded-[0.75rem] border border-(--border-subtle) bg-(--bg-elevated) p-4 space-y-4">
                    {/* Staff header */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-(--text-primary)">
                        {staff.full_name || "Staff Member"}
                      </p>
                      {totalBlocks > 0 && (
                        <span className="rounded-full bg-(--accent-primary)/12 px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-(--accent-primary)">
                          {totalBlocks} block{totalBlocks !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Add block form */}
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                      <div>
                        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-(--text-disabled) mb-1.5">Day</p>
                        <Select
                          value={draft.weekday}
                          onValueChange={(v) => updateDraft(staff.id, { weekday: v })}
                        >
                          <SelectTrigger className={fieldInput}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-[0.7rem] border border-[color:var(--border-subtle,rgba(240,238,235,0.08))] bg-[var(--bg-elevated,#1c1b1b)] text-[var(--text-primary,#f0eeeb)] shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                            {DAYS_OF_WEEK.map((day) => (
                              <SelectItem key={day.value} value={day.value} className="text-[var(--text-primary,#f0eeeb)] focus:bg-[rgba(122,213,221,0.12)] focus:text-[var(--accent-primary,#7ad5dd)] data-[state=checked]:bg-[var(--accent-primary,#7ad5dd)] data-[state=checked]:text-[var(--text-on-accent,#07292d)]">
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-(--text-disabled) mb-1.5">Start</p>
                        <Input type="time" value={draft.start} onChange={(e) => updateDraft(staff.id, { start: e.target.value })} className={fieldInput} />
                      </div>
                      <div>
                        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-(--text-disabled) mb-1.5">End</p>
                        <Input type="time" value={draft.end} onChange={(e) => updateDraft(staff.id, { end: e.target.value })} className={fieldInput} />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          onClick={() => addBlock(staff.id)}
                          className="sevacam-primary-button h-10 w-10 rounded-[0.55rem] p-0"
                          aria-label="Add time block"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Existing blocks */}
                    {existingBlocks.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-(--text-disabled)">Current</p>
                        {existingBlocks.map((block) => (
                          <div key={block.id} className="flex items-center justify-between rounded-[0.5rem] border border-(--border-subtle) bg-(--bg-inset) px-3 py-2">
                            <span className="text-xs text-(--text-secondary)">
                              {DAYS_OF_WEEK.find((d) => d.value === String(block.weekday))?.label}{" "}
                              · {block.start_time_local} – {block.end_time_local}
                            </span>
                            <button type="button" onClick={() => onRemoveExistingBlock?.(staff.id, block.id)} className="text-(--text-disabled) transition hover:text-(--state-warning)" aria-label="Remove">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* New draft blocks */}
                    {blocks.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-(--accent-primary)">New</p>
                        {blocks.map((block, idx) => (
                          <div key={`${staff.id}-${idx}`} className="flex items-center justify-between rounded-[0.5rem] border border-(--accent-primary)/20 bg-[rgba(122,213,221,0.05)] px-3 py-2">
                            <span className="text-xs text-(--text-secondary)">
                              {DAYS_OF_WEEK.find((d) => d.value === String(block.weekday))?.label}{" "}
                              · {block.start_time_local} – {block.end_time_local}
                            </span>
                            <button type="button" onClick={() => removeBlock(staff.id, idx)} className="text-(--text-disabled) transition hover:text-(--state-warning)" aria-label="Remove">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
