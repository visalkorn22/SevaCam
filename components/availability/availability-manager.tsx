"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Clock,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
} from "lucide-react";

// Backend weekday: 0=Sunday, 1=Monday, ..., 6=Saturday
// Formula used by backend: (python_weekday + 1) % 7
const DAYS = [
  { key: 1, label: "Mon", full: "Monday" },
  { key: 2, label: "Tue", full: "Tuesday" },
  { key: 3, label: "Wed", full: "Wednesday" },
  { key: 4, label: "Thu", full: "Thursday" },
  { key: 5, label: "Fri", full: "Friday" },
  { key: 6, label: "Sat", full: "Saturday" },
  { key: 0, label: "Sun", full: "Sunday" },
];

type StaffMember = { id: string; full_name: string | null };
type WorkBlock = {
  id: string;
  schedule_id: string;
  weekday: number;
  start_time_local: string;
  end_time_local: string;
};
type Schedule = {
  id: string;
  staff_id: string;
  timezone: string;
  is_default: boolean;
  max_slots_per_day: number | null;
  max_bookings_per_day: number | null;
};

async function authedFetch(path: string, opts: RequestInit = {}) {
  return fetch(path, opts);
}

const labelClass =
  "text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-(--seva-text-muted)";

const dayBadgeActive =
  "text-[0.62rem] font-bold uppercase tracking-[0.12em] text-(--seva-accent)";
const dayBadgeIdle =
  "text-[0.62rem] font-bold uppercase tracking-[0.12em] text-(--seva-text-muted)";

export function AvailabilityManager() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [blocks, setBlocks] = useState<WorkBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // Load staff list via Next.js proxy (uses httpOnly cookie on vercel.app)
  useEffect(() => {
    fetch("/api/admin/staff-list")
      .then((r) => r.json())
      .then((data: StaffMember[]) => {
        const list = Array.isArray(data) ? data : [];
        setStaff(list);
        if (list.length > 0) setSelectedStaff(list[0]);
      })
      .catch(() => {});
  }, []);

  const loadSchedules = useCallback(async (staffId: string) => {
    setLoading(true);
    try {
      const res = await authedFetch(
        `/api/availability/weekly-schedules/${staffId}`
      );
      if (res.ok) {
        const data: Schedule[] = await res.json();
        setSchedules(data);
        const def = data.find((s) => s.is_default) ?? data[0] ?? null;
        setSelectedSchedule(def);
      } else {
        setSchedules([]);
        setSelectedSchedule(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBlocks = useCallback(async (scheduleId: string) => {
    const res = await authedFetch(
      `/api/availability/weekly-schedules/${scheduleId}/blocks`
    );
    if (res.ok) {
      const data = await res.json();
      setBlocks(data.work_blocks ?? []);
    }
  }, []);

  useEffect(() => {
    if (selectedStaff) loadSchedules(selectedStaff.id);
  }, [selectedStaff, loadSchedules]);

  useEffect(() => {
    if (selectedSchedule) loadBlocks(selectedSchedule.id);
    else setBlocks([]);
  }, [selectedSchedule, loadBlocks]);

  const createDefaultSchedule = async () => {
    if (!selectedStaff) return;
    setSaving(true);
    try {
      const res = await authedFetch(
        `/api/availability/weekly-schedules`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staff_id: selectedStaff.id,
            timezone: "Asia/Phnom_Penh",
            is_default: true,
            max_slots_per_day: null,
            max_bookings_per_day: null,
            max_bookings_per_customer: null,
          }),
        }
      );
      if (res.ok) {
        showToast("success", "Schedule created");
        await loadSchedules(selectedStaff.id);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast("error", err.detail ?? "Failed to create schedule");
      }
    } finally {
      setSaving(false);
    }
  };

  const addBlock = async (weekday: number) => {
    if (!selectedSchedule) return;
    setSaving(true);
    try {
      const res = await authedFetch(
        `/api/availability/weekly-schedules/work-blocks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schedule_id: selectedSchedule.id,
            weekday,
            start_time_local: "09:00:00",
            end_time_local: "17:00:00",
          }),
        }
      );
      if (res.ok) {
        showToast("success", "Work block added");
        await loadBlocks(selectedSchedule.id);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast("error", err.detail ?? "Failed to add block");
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteBlock = async (blockId: string) => {
    setSaving(true);
    try {
      const res = await authedFetch(
        `/api/availability/weekly-schedules/work-blocks/${blockId}`,
        { method: "DELETE" }
      );
      if (res.ok || res.status === 204) {
        showToast("success", "Block removed");
        if (selectedSchedule) await loadBlocks(selectedSchedule.id);
      } else {
        showToast("error", "Failed to remove block");
      }
    } finally {
      setSaving(false);
    }
  };

  const updateBlock = async (
    block: WorkBlock,
    field: "start_time_local" | "end_time_local",
    value: string
  ) => {
    const updated = { ...block, [field]: value + ":00" };
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? updated : b)));
    try {
      await authedFetch(
        `/api/availability/weekly-schedules/work-blocks/${block.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value + ":00" }),
        }
      );
    } catch {
      showToast("error", "Failed to update time");
    }
  };

  const blocksForDay = (day: number) =>
    blocks.filter((b) => b.weekday === day);

  const trim = (val: string) => val.slice(0, 5);

  const workingDays = new Set(blocks.map((b) => b.weekday)).size;

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-5 top-5 z-50 flex items-center gap-2.5 rounded-[0.7rem] px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.12em] shadow-xl transition-all ${
            toast.type === "success"
              ? "bg-(--seva-accent) text-(--seva-base)"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          {toast.msg}
        </div>
      )}

      <div className="space-y-5">
        {/* Staff selector card */}
        <div className="rounded-[1.1rem] border border-(--seva-border-subtle) bg-(--seva-surface) px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-(--seva-elevated) text-(--seva-accent)">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <p className={labelClass}>Staff member</p>
                <p className="mt-0.5 text-[0.84rem] font-medium text-(--seva-text)">
                  {selectedStaff?.full_name ?? "No staff selected"}
                </p>
              </div>
            </div>

            {/* Staff dropdown */}
            <div className="relative">
              <button
                onClick={() => setStaffOpen((o) => !o)}
                className="flex min-w-50 items-center justify-between gap-3 rounded-[0.55rem] border border-(--border-subtle) bg-(--seva-elevated) px-4 py-2.5 text-[0.78rem] font-medium text-(--seva-text) transition-colors hover:border-(--border-interactive)"
              >
                <span className="truncate">
                  {selectedStaff?.full_name || "Select staff…"}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-(--seva-text-muted) transition-transform ${staffOpen ? "rotate-180" : ""}`}
                />
              </button>

              {staffOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 min-w-50 overflow-hidden rounded-[0.75rem] border border-(--border-subtle) bg-(--seva-dropdown-bg) shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
                  {staff.length === 0 ? (
                    <div className="px-4 py-3 text-[0.75rem] text-(--seva-text-muted)">
                      No staff found
                    </div>
                  ) : (
                    staff.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedStaff(s);
                          setStaffOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-[0.78rem] transition-colors hover:bg-(--seva-elevated) ${
                          selectedStaff?.id === s.id
                            ? "font-semibold text-(--seva-accent)"
                            : "text-(--seva-text)"
                        }`}
                      >
                        {s.full_name || "Unnamed staff"}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-(--seva-accent)" />
          </div>
        )}

        {/* Empty — no schedule yet */}
        {!loading && selectedStaff && schedules.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[1.1rem] border border-dashed border-(--border-subtle) bg-(--seva-surface) py-16 text-center">
            <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-(--seva-elevated) ring-1 ring-(--border-subtle)">
              <Clock className="h-6 w-6 text-(--seva-text-muted)" />
            </span>
            <p className="text-[0.9rem] font-semibold text-(--seva-text)">
              No schedule for {selectedStaff.full_name}
            </p>
            <p className="mt-1.5 max-w-xs text-[0.78rem] leading-5 text-(--seva-text-muted)">
              Create a weekly schedule to start adding working hours.
            </p>
            <button
              onClick={createDefaultSchedule}
              disabled={saving}
              className="sevacam-primary-button mt-6 inline-flex h-10 items-center gap-2 rounded-[0.45rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Create Schedule
            </button>
          </div>
        )}

        {/* No staff */}
        {!loading && !selectedStaff && (
          <div className="flex flex-col items-center justify-center rounded-[1.1rem] border border-dashed border-(--border-subtle) bg-(--seva-surface) py-16 text-center">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-(--seva-elevated) ring-1 ring-(--border-subtle)">
              <Users className="h-6 w-6 text-(--seva-text-muted)" />
            </span>
            <p className="text-[0.84rem] text-(--seva-text-soft)">
              Select a staff member to manage their schedule
            </p>
          </div>
        )}

        {/* Weekly schedule editor */}
        {!loading && selectedSchedule && (
          <div className="space-y-4">
            {/* Schedule meta bar */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <Calendar className="h-3.5 w-3.5 text-(--seva-accent)" />
                <span className="text-[0.78rem] font-semibold text-(--seva-text)">
                  Weekly Working Hours
                </span>
                <span className="rounded-full border border-(--border-subtle) bg-(--seva-elevated) px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-widest text-(--seva-text-muted)">
                  {selectedSchedule.timezone}
                </span>
                {selectedSchedule.is_default && (
                  <span className="rounded-full bg-(--accent-subtle) px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-widest text-(--seva-accent)">
                    Default
                  </span>
                )}
              </div>
              {saving && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-(--seva-accent)" />
              )}
            </div>

            {/* Day rows */}
            <div className="overflow-hidden rounded-[1.1rem] border border-(--seva-border-subtle) bg-(--seva-surface)">
              {DAYS.map((day, idx) => {
                const dayBlocks = blocksForDay(day.key);
                const hasBlocks = dayBlocks.length > 0;
                const isLast = idx === DAYS.length - 1;

                return (
                  <div
                    key={day.key}
                    className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:gap-4 ${
                      !isLast ? "border-b border-(--border-subtle)" : ""
                    } ${hasBlocks ? "bg-(--seva-surface)" : "bg-(--seva-base)"}`}
                  >
                    {/* Day label */}
                    <div className="flex w-10 shrink-0 items-center gap-2 sm:pt-1">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          hasBlocks ? "bg-(--seva-accent)" : "bg-(--border-subtle)"
                        }`}
                      />
                      <span
                        className={hasBlocks ? dayBadgeActive : dayBadgeIdle}
                      >
                        {day.label}
                      </span>
                    </div>

                    {/* Blocks */}
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      {hasBlocks ? (
                        dayBlocks.map((block) => (
                          <div
                            key={block.id}
                            className="flex items-center gap-1.5 rounded-[0.55rem] border border-(--border-subtle) bg-(--seva-elevated) px-3 py-2"
                          >
                            <input
                              type="time"
                              value={trim(block.start_time_local)}
                              onChange={(e) =>
                                updateBlock(block, "start_time_local", e.target.value)
                              }
                              className="w-20.5 bg-transparent text-[0.78rem] font-medium text-(--seva-text) outline-none"
                            />
                            <span className="text-[0.7rem] text-(--seva-text-muted)">
                              →
                            </span>
                            <input
                              type="time"
                              value={trim(block.end_time_local)}
                              onChange={(e) =>
                                updateBlock(block, "end_time_local", e.target.value)
                              }
                              className="w-20.5 bg-transparent text-[0.78rem] font-medium text-(--seva-text) outline-none"
                            />
                            <button
                              onClick={() => deleteBlock(block.id)}
                              disabled={saving}
                              className="ml-1 rounded-md p-0.5 text-(--seva-text-muted) transition-colors hover:text-red-400 disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <span className="text-[0.75rem] text-(--seva-text-muted)">
                          Day off
                        </span>
                      )}
                    </div>

                    {/* Add block */}
                    <button
                      onClick={() => addBlock(day.key)}
                      disabled={saving}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-[0.45rem] border border-(--border-subtle) bg-(--seva-elevated) px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-(--seva-text-muted) transition-colors hover:border-(--border-interactive) hover:text-(--seva-accent) disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                {
                  icon: Calendar,
                  label: "Working Days",
                  value: `${workingDays} / 7`,
                },
                {
                  icon: Clock,
                  label: "Max Slots / Day",
                  value: selectedSchedule.max_slots_per_day ?? "Unlimited",
                },
                {
                  icon: Users,
                  label: "Max Bookings / Day",
                  value: selectedSchedule.max_bookings_per_day ?? "Unlimited",
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-[0.85rem] border border-(--seva-border-subtle) bg-(--seva-surface) px-4 py-4"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-(--seva-accent)" />
                      <p className={labelClass}>{stat.label}</p>
                    </div>
                    <p className="mt-2 text-[1.1rem] font-bold text-(--seva-text)">
                      {stat.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
