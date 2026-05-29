"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resolveAvatarUrl } from "@/lib/utils/avatar";
import { StarRating } from "@/components/ui/star-rating";
import { Check, Plus, Trash2, UserRound } from "lucide-react";

type StaffOption = {
  id: string;
  full_name: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  role: "staff" | "admin" | "superadmin" | "customer";
  is_active: boolean;
  average_rating?: number | null;
  completed_bookings?: number;
  experience_level?: string | null;
};

type AssignedStaff = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  role: string;
  assignment_id: string;
  skills?: string[];
  bio?: string | null;
  average_rating?: number | null;
  review_count?: number;
  completed_bookings?: number;
  experience_level?: string | null;
};

type StaffProfileDraft = {
  skills: string;
  bio: string;
};

type ResolvedSelectedStaff = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  average_rating: number | null;
  completed_bookings: number;
  experience_level: string | null;
  review_count: number;
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
  assignedStaff?: AssignedStaff[];
  selectedStaffIds: string[];
  setSelectedStaffIds: (ids: string[]) => void;
  staffProfileDrafts: Record<string, StaffProfileDraft>;
  setStaffProfileDrafts: (
    updater:
      | Record<string, StaffProfileDraft>
      | ((
          prev: Record<string, StaffProfileDraft>,
        ) => Record<string, StaffProfileDraft>),
  ) => void;
  enableScheduleAssignment?: boolean;
  scheduleMode?: "create" | "edit";
  scheduleTimezone?: string;
  setScheduleTimezone?: (value: string) => void;
  scheduleBlocksByStaff?: Record<string, StaffWorkBlockDraft[]>;
  setScheduleBlocksByStaff?: (
    updater:
      | Record<string, StaffWorkBlockDraft[]>
      | ((
          prev: Record<string, StaffWorkBlockDraft[]>,
        ) => Record<string, StaffWorkBlockDraft[]>),
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
  "!h-10 rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:border-(--accent-primary) focus-visible:bg-(--bg-elevated) focus-visible:ring-1 focus-visible:ring-[rgba(122,213,221,0.35)] transition-colors text-sm";
const textareaClass =
  "min-h-[7.5rem] rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-inset) text-sm text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:border-(--accent-primary) focus-visible:bg-(--bg-elevated) focus-visible:ring-1 focus-visible:ring-[rgba(122,213,221,0.35)]";

const microLabel =
  "mb-1.5 block text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)";

const selectContent =
  "rounded-[0.85rem] border border-(--border-subtle) bg-(--seva-dropdown-bg) text-(--text-primary) backdrop-blur-xl shadow-[0_24px_48px_rgba(0,0,0,0.45)]";

const selectItem =
  "seva-select-item min-h-10 rounded-[0.6rem] text-(--text-primary) data-[highlighted]:!bg-(--bg-hover) data-[highlighted]:!text-(--text-primary) data-[state=checked]:!bg-[rgba(122,213,221,0.18)] data-[state=checked]:!text-(--accent-primary) [&_svg]:text-(--text-secondary)";

export default function EnhancedStaffAssignments({
  staffOptions,
  assignedStaff = [],
  selectedStaffIds,
  setSelectedStaffIds,
  staffProfileDrafts,
  setStaffProfileDrafts,
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
  const [localStaff, setLocalStaff] = useState<StaffOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { weekday: string; start: string; end: string }>
  >({});

  useEffect(() => {
    if (staffOptions.length > 0) {
      return;
    }
    let cancelled = false;
    fetch("/api/admin/staff", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Unable to load staff list");
        return res.json() as Promise<StaffOption[]>;
      })
      .then((data) => {
        if (!cancelled) setLocalStaff(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Unable to load staff",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [staffOptions]);

  const resolvedStaff = staffOptions.length > 0 ? staffOptions : localStaff;

  const availableStaff = resolvedStaff.filter(
    (s) => s.role === "staff" && s.is_active !== false,
  );

  const assignedStaffById = useMemo(
    () =>
      new Map(
        assignedStaff.map((staff) => [staff.id, staff] as const).filter(Boolean),
      ),
    [assignedStaff],
  );

  const selectedStaff = useMemo(
    () =>
      selectedStaffIds
        .map<ResolvedSelectedStaff | null>((staffId) => {
          const option =
            availableStaff.find((staff) => staff.id === staffId) ||
            resolvedStaff.find((staff) => staff.id === staffId);
          const assigned = assignedStaffById.get(staffId);
          if (!option && !assigned) return null;
          return {
            id: staffId,
            full_name: assigned?.full_name ?? option?.full_name ?? null,
            email: assigned?.email ?? option?.email ?? null,
            phone: assigned?.phone ?? option?.phone ?? null,
            avatar_url: assigned?.avatar_url ?? option?.avatar_url ?? null,
            average_rating:
              assigned?.average_rating ?? option?.average_rating ?? null,
            completed_bookings:
              assigned?.completed_bookings ?? option?.completed_bookings ?? 0,
            experience_level:
              assigned?.experience_level ?? option?.experience_level ?? null,
            review_count: assigned?.review_count ?? 0,
          };
        })
        .filter((staff): staff is ResolvedSelectedStaff => staff !== null),
    [assignedStaffById, availableStaff, resolvedStaff, selectedStaffIds],
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

  const updateStaffProfileDraft = (
    staffId: string,
    patch: Partial<StaffProfileDraft>,
  ) =>
    setStaffProfileDrafts((prev) => ({
      ...prev,
      [staffId]: {
        skills: prev[staffId]?.skills ?? "",
        bio: prev[staffId]?.bio ?? "",
        ...patch,
      },
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
      <div>
        <p className="sevacam-eyebrow mb-1">Staff Members</p>
        <p className="text-sm text-(--text-secondary)">
          Select who can deliver this service. At least one is required.
        </p>
      </div>

      {availableStaff.length === 0 ? (
        <div className="rounded-[0.75rem] border border-dashed border-(--border-subtle) bg-(--bg-inset) px-5 py-8 text-center">
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
                    ? "border-[rgba(122,213,221,0.4)] bg-[rgba(122,213,221,0.08)]"
                    : "border-(--border-subtle) bg-(--bg-inset) hover:border-[rgba(122,213,221,0.25)] hover:bg-(--bg-elevated)"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isSelected
                        ? "bg-[rgba(122,213,221,0.15)] text-(--accent-primary)"
                        : "bg-(--bg-elevated) text-(--text-secondary)"
                    }`}
                  >
                    {(staff.full_name || "S").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-semibold leading-tight ${
                        isSelected
                          ? "text-(--accent-primary)"
                          : "text-(--text-primary)"
                      }`}
                    >
                      {staff.full_name || "Staff Member"}
                    </p>
                    <p
                      className={`text-[0.68rem] ${
                        isSelected
                          ? "text-[rgba(122,213,221,0.7)]"
                          : "text-(--text-disabled)"
                      }`}
                    >
                      {staff.is_active ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isSelected
                      ? "border-(--accent-primary) bg-(--accent-primary)"
                      : "border-(--border-subtle) bg-transparent"
                  }`}
                >
                  {isSelected && (
                    <Check
                      className="h-3 w-3 text-(--text-on-accent)"
                      strokeWidth={3}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedStaff.length > 0 && (
        <div className="space-y-3 border-t border-(--seva-border-subtle) pt-5">
          <div>
            <p className="sevacam-eyebrow mb-1">Staff Profiles</p>
            <p className="text-sm text-(--text-secondary)">
              Add service-specific skills and a short bio. Experience updates
              automatically from completed bookings and customer ratings.
            </p>
          </div>

          {selectedStaff.map((staff) => {
            const profileDraft = staffProfileDrafts[staff.id] ?? {
              skills: "",
              bio: "",
            };
            const avatarSrc = resolveAvatarUrl(staff.avatar_url);
            const hasPerformanceData =
              staff.average_rating != null || staff.completed_bookings > 0;

            return (
              <div
                key={`profile-${staff.id}`}
                className="overflow-hidden rounded-[0.85rem] border border-(--border-subtle) bg-(--bg-elevated)"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--seva-border-subtle) px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--bg-inset)">
                      {avatarSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarSrc}
                          alt={staff.full_name || "Staff Member"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold uppercase text-(--text-primary)">
                          {(staff.full_name || "S").slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-(--text-primary)">
                        {staff.full_name || "Staff Member"}
                      </p>
                      <p className="truncate text-[0.7rem] text-(--text-disabled)">
                        {staff.email || "No email on file"}
                      </p>
                      {staff.phone && (
                        <p className="truncate text-[0.7rem] text-(--text-disabled)">
                          {staff.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[rgba(122,213,221,0.12)] px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-(--accent-primary)">
                      {staff.experience_level || "Beginner"}
                    </span>
                    <span className="rounded-full bg-(--bg-inset) px-2.5 py-1 text-[0.65rem] text-(--text-secondary)">
                      {staff.average_rating != null ? (
                        <StarRating
                          rating={staff.average_rating}
                          showValue
                          className="text-[0.65rem]"
                          valueClassName="text-[0.65rem] text-(--text-primary)"
                        />
                      ) : (
                        <span className="text-(--text-primary)">New</span>
                      )}
                    </span>
                    <span className="rounded-full bg-(--bg-inset) px-2.5 py-1 text-[0.65rem] text-(--text-secondary)">
                      Completed:{" "}
                      <span className="text-(--text-primary)">
                        {staff.completed_bookings}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1.05fr]">
                  <div className="space-y-2">
                    <Label className={microLabel}>Skills</Label>
                    <Input
                      value={profileDraft.skills}
                      onChange={(event) =>
                        updateStaffProfileDraft(staff.id, {
                          skills: event.target.value,
                        })
                      }
                      placeholder="Portrait photography, photo editing, product styling"
                      className={fieldInput}
                    />
                    <p className="text-[0.7rem] leading-5 text-(--text-disabled)">
                      Separate each skill with a comma.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className={microLabel}>Bio</Label>
                    <Textarea
                      value={profileDraft.bio}
                      onChange={(event) =>
                        updateStaffProfileDraft(staff.id, {
                          bio: event.target.value,
                        })
                      }
                      placeholder="Short description customers see before they choose this staff member."
                      className={textareaClass}
                    />
                  </div>
                </div>

                <div className="border-t border-(--seva-border-subtle) px-4 py-3 text-[0.72rem] text-(--text-secondary)">
                  {hasPerformanceData
                    ? `Experience is calculated from ${staff.completed_bookings} completed booking${staff.completed_bookings === 1 ? "" : "s"} and ${staff.review_count} approved review${staff.review_count === 1 ? "" : "s"}.`
                    : "Experience will update after this staff member completes bookings and receives reviews."}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {enableScheduleAssignment && (
        <div className="space-y-5 border-t border-(--seva-border-subtle) pt-5">
          <div>
            <p className="sevacam-eyebrow mb-1">
              {scheduleMode === "edit" ? "Staff Time Blocks" : "Quick Schedule"}
            </p>
            <p className="text-sm text-(--text-secondary)">
              {scheduleMode === "edit"
                ? "Add or remove weekly time blocks for selected staff."
                : "Optionally assign weekly time slots to selected staff."}
            </p>
            {scheduleLoading && (
              <p className="mt-2 text-xs text-(--text-disabled)">
                Loading current blocks...
              </p>
            )}
            {scheduleError && (
              <p className="mt-2 text-xs text-[#ffb785]">{scheduleError}</p>
            )}
          </div>

          <div>
            <Label className={microLabel}>Timezone</Label>
            <Input
              value={scheduleTimezone}
              onChange={(e) => setScheduleTimezone?.(e.target.value)}
              placeholder="Asia/Phnom_Penh"
              className={fieldInput}
            />
          </div>

          {selectedStaff.length === 0 ? (
            <p className="text-xs text-(--text-disabled)">
              Select staff above to configure time slots.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedStaff.map((staff) => {
                const blocks = scheduleBlocksByStaff[staff.id] || [];
                const existingBlocks = existingScheduleBlocksByStaff[staff.id] || [];
                const totalBlocks = existingBlocks.length + blocks.length;
                const draft = getDraft(staff.id);

                return (
                  <div
                    key={staff.id}
                    className="overflow-hidden rounded-[0.85rem] border border-(--border-subtle) bg-(--bg-elevated)"
                  >
                    <div className="flex items-center justify-between border-b border-(--seva-border-subtle) px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(122,213,221,0.1)] text-[0.62rem] font-bold text-(--accent-primary)">
                          {(staff.full_name || "S").charAt(0).toUpperCase()}
                        </span>
                        <p className="text-[0.84rem] font-semibold text-(--text-primary)">
                          {staff.full_name || "Staff Member"}
                        </p>
                      </div>
                      {totalBlocks > 0 && (
                        <span className="rounded-full bg-[rgba(122,213,221,0.12)] px-2.5 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-(--accent-primary)">
                          {totalBlocks} block{totalBlocks !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    <div className="space-y-4 p-4">
                      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                        <div>
                          <p className={microLabel}>Day</p>
                          <Select
                            value={draft.weekday}
                            onValueChange={(v) =>
                              updateDraft(staff.id, { weekday: v })
                            }
                          >
                            <SelectTrigger className={fieldInput}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={selectContent}>
                              {DAYS_OF_WEEK.map((day) => (
                                <SelectItem
                                  key={day.value}
                                  value={day.value}
                                  className={selectItem}
                                >
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <p className={microLabel}>Start</p>
                          <Input
                            type="time"
                            value={draft.start}
                            onChange={(e) =>
                              updateDraft(staff.id, { start: e.target.value })
                            }
                            className={fieldInput}
                          />
                        </div>
                        <div>
                          <p className={microLabel}>End</p>
                          <Input
                            type="time"
                            value={draft.end}
                            onChange={(e) =>
                              updateDraft(staff.id, { end: e.target.value })
                            }
                            className={fieldInput}
                          />
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

                      {existingBlocks.length > 0 && (
                        <div className="space-y-1.5">
                          <p className={microLabel}>Current</p>
                          {existingBlocks.map((block) => (
                            <div
                              key={block.id}
                              className="flex items-center justify-between rounded-[0.5rem] border border-(--border-subtle) bg-(--bg-inset) px-3 py-2"
                            >
                              <span className="text-xs text-(--text-secondary)">
                                {
                                  DAYS_OF_WEEK.find(
                                    (d) => d.value === String(block.weekday),
                                  )?.label
                                }{" "}
                                - {block.start_time_local} - {block.end_time_local}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onRemoveExistingBlock?.(staff.id, block.id)
                                }
                                className="text-(--text-disabled) transition hover:text-[#ffb785]"
                                aria-label="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {blocks.length > 0 && (
                        <div className="space-y-1.5">
                          <p className={`${microLabel} text-(--accent-primary)`}>
                            New
                          </p>
                          {blocks.map((block, idx) => (
                            <div
                              key={`${staff.id}-${idx}`}
                              className="flex items-center justify-between rounded-[0.5rem] border border-[rgba(122,213,221,0.2)] bg-[rgba(122,213,221,0.05)] px-3 py-2"
                            >
                              <span className="text-xs text-(--text-secondary)">
                                {
                                  DAYS_OF_WEEK.find(
                                    (d) => d.value === String(block.weekday),
                                  )?.label
                                }{" "}
                                - {block.start_time_local} - {block.end_time_local}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeBlock(staff.id, idx)}
                                className="text-(--text-disabled) transition hover:text-[#ffb785]"
                                aria-label="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
