"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2 } from "lucide-react";

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
    updater: Record<string, StaffWorkBlockDraft[]> | ((prev: Record<string, StaffWorkBlockDraft[]>) => Record<string, StaffWorkBlockDraft[]>),
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
    const loadStaff = async () => {
      try {
        const res = await fetch("/api/admin/staff", { credentials: "include" });
        if (!res.ok) {
          throw new Error("Unable to load staff list");
        }
        const data = (await res.json()) as StaffOption[];
        if (!cancelled) {
          setLocalStaff(data);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Unable to load staff",
          );
        }
      }
    };

    loadStaff();
    return () => {
      cancelled = true;
    };
  }, [staffOptions]);

  const availableStaff = localStaff.filter(
    (staff) => staff.role === "staff" && staff.is_active !== false,
  );

  const selectedStaff = useMemo(
    () => availableStaff.filter((staff) => selectedStaffIds.includes(staff.id)),
    [availableStaff, selectedStaffIds],
  );

  const toggleStaff = (id: string) => {
    setSelectedStaffIds(
      selectedStaffIds.includes(id)
        ? selectedStaffIds.filter((staffId) => staffId !== id)
        : [...selectedStaffIds, id],
    );
  };

  const getDraft = (staffId: string) =>
    drafts[staffId] || { weekday: "1", start: "09:00", end: "17:00" };

  const updateDraft = (staffId: string, patch: Partial<{ weekday: string; start: string; end: string }>) => {
    setDrafts((prev) => ({
      ...prev,
      [staffId]: { ...getDraft(staffId), ...patch },
    }));
  };

  const addBlock = (staffId: string) => {
    if (!setScheduleBlocksByStaff) return;
    const draft = getDraft(staffId);
    if (!draft.start || !draft.end) return;
    if (draft.start >= draft.end) return;

    const block: StaffWorkBlockDraft = {
      weekday: Number.parseInt(draft.weekday, 10),
      start_time_local: draft.start,
      end_time_local: draft.end,
    };

    setScheduleBlocksByStaff((prev) => ({
      ...prev,
      [staffId]: [...(prev[staffId] || []), block],
    }));
  };

  const removeBlock = (staffId: string, index: number) => {
    if (!setScheduleBlocksByStaff) return;
    setScheduleBlocksByStaff((prev) => ({
      ...prev,
      [staffId]: (prev[staffId] || []).filter((_, idx) => idx !== index),
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground">Assign Staff</h4>
        <p className="text-xs text-muted-foreground">
          Optional: select staff members who can deliver this service.
        </p>
      </div>

      {availableStaff.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          {loadError
            ? loadError
            : "No active staff found. Add staff accounts first, then assign them to this service."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {availableStaff.map((staff) => {
            const isSelected = selectedStaffIds.includes(staff.id);
            return (
              <button
                key={staff.id}
                type="button"
                onClick={() => toggleStaff(staff.id)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                  isSelected
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "border-border/60 bg-background text-foreground hover:border-primary/30"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold">
                    {staff.full_name || "Staff Member"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {staff.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
                <Badge variant="secondary">{staff.role}</Badge>
              </button>
            );
          })}
        </div>
      )}

      {enableScheduleAssignment && (
        <div className="space-y-4 rounded-xl border border-dashed border-border bg-muted/20 p-4">
          <div>
            <h5 className="text-sm font-semibold">
              {scheduleMode === "edit" ? "Staff Time Blocks" : "Quick Staff Schedule"}
            </h5>
            <p className="text-xs text-muted-foreground">
              {scheduleMode === "edit"
                ? "Add or remove weekly time blocks for selected staff."
                : "Optional: assign weekly time slots for selected staff while creating this service."}
            </p>
            {scheduleLoading && (
              <p className="mt-2 text-xs text-muted-foreground">
                Loading current staff blocks...
              </p>
            )}
            {scheduleError && (
              <p className="mt-2 text-xs text-destructive">{scheduleError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              {scheduleMode === "edit"
                ? "Timezone (used only if a schedule is created)"
                : "Schedule timezone"}
            </Label>
            <Input
              value={scheduleTimezone}
              onChange={(e) => setScheduleTimezone?.(e.target.value)}
              placeholder="Asia/Phnom_Penh"
            />
          </div>

          {selectedStaff.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Select staff to add time slots.
            </p>
          ) : (
            <div className="space-y-4">
              {selectedStaff.map((staff) => {
                const blocks = scheduleBlocksByStaff[staff.id] || [];
                const existingBlocks = existingScheduleBlocksByStaff[staff.id] || [];
                const draft = getDraft(staff.id);
                return (
                  <div
                    key={staff.id}
                    className="rounded-lg border border-border/60 bg-background p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          {staff.full_name || "Staff Member"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Weekly time slots
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {existingBlocks.length + blocks.length} blocks
                      </Badge>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Day</Label>
                        <Select
                          value={draft.weekday}
                          onValueChange={(value) =>
                            updateDraft(staff.id, { weekday: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS_OF_WEEK.map((day) => (
                              <SelectItem key={day.value} value={day.value}>
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Start</Label>
                        <Input
                          type="time"
                          value={draft.start}
                          onChange={(e) =>
                            updateDraft(staff.id, { start: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End</Label>
                        <Input
                          type="time"
                          value={draft.end}
                          onChange={(e) =>
                            updateDraft(staff.id, { end: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addBlock(staff.id)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add time block
                      </Button>
                    </div>

                    {existingBlocks.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Current blocks
                        </p>
                        {existingBlocks.map((block) => (
                          <div
                            key={block.id}
                            className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-xs"
                          >
                            <span>
                              {
                                DAYS_OF_WEEK.find(
                                  (day) =>
                                    day.value === String(block.weekday),
                                )?.label
                              }{" "}
                              {block.start_time_local} -{" "}
                              {block.end_time_local}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onRemoveExistingBlock?.(staff.id, block.id)
                              }
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="Remove existing time block"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {blocks.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">
                          New blocks
                        </p>
                        {blocks.map((block, index) => (
                          <div
                            key={`${staff.id}-${index}`}
                            className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-xs"
                          >
                            <span>
                              {
                                DAYS_OF_WEEK.find(
                                  (day) =>
                                    day.value === String(block.weekday),
                                )?.label
                              }{" "}
                              {block.start_time_local} -{" "}
                              {block.end_time_local}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeBlock(staff.id, index)}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="Remove time block"
                            >
                              <Trash2 className="h-4 w-4" />
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
