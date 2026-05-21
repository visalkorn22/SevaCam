"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronDown,
  Plus,
  Trash2,
  Save,
  Clock,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sun,
  Moon,
} from "lucide-react";

const DAYS = [
  { key: 0, label: "Mon", full: "Monday" },
  { key: 1, label: "Tue", full: "Tuesday" },
  { key: 2, label: "Wed", full: "Wednesday" },
  { key: 3, label: "Thu", full: "Thursday" },
  { key: 4, label: "Fri", full: "Friday" },
  { key: 5, label: "Sat", full: "Saturday" },
  { key: 6, label: "Sun", full: "Sunday" },
];

type StaffMember = { id: string; full_name: string | null };
type WorkBlock = { id: string; schedule_id: string; weekday: number; start_time_local: string; end_time_local: string };
type Schedule = { id: string; staff_id: string; timezone: string; is_default: boolean; max_slots_per_day: number | null; max_bookings_per_day: number | null };

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function authedFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, { ...opts, credentials: "include" });
  return res;
}

export function AvailabilityManager() {
  const [dark, setDark] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [blocks, setBlocks] = useState<WorkBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [staffOpen, setStaffOpen] = useState(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // Load staff list
  useEffect(() => {
    fetch("/api/admin/staff-list")
      .then((r) => r.json())
      .then((data: StaffMember[]) => {
        setStaff(data);
        if (data.length > 0) setSelectedStaff(data[0]);
      })
      .catch(() => {});
  }, []);

  // Load schedules when staff changes
  const loadSchedules = useCallback(async (staffId: string) => {
    setLoading(true);
    try {
      const res = await authedFetch(`${apiUrl}/api/availability/weekly-schedules/${staffId}`);
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
    const res = await authedFetch(`${apiUrl}/api/availability/weekly-schedules/${scheduleId}/blocks`);
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
      const res = await authedFetch(`${apiUrl}/api/availability/weekly-schedules`, {
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
      });
      if (res.ok) {
        showToast("success", "Schedule created");
        await loadSchedules(selectedStaff.id);
      } else {
        const err = await res.json();
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
      const res = await authedFetch(`${apiUrl}/api/availability/weekly-schedules/work-blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule_id: selectedSchedule.id,
          weekday,
          start_time_local: "09:00:00",
          end_time_local: "17:00:00",
        }),
      });
      if (res.ok) {
        showToast("success", "Work block added");
        await loadBlocks(selectedSchedule.id);
      } else {
        const err = await res.json();
        showToast("error", err.detail ?? "Failed to add block");
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteBlock = async (blockId: string) => {
    setSaving(true);
    try {
      const res = await authedFetch(`${apiUrl}/api/availability/weekly-schedules/work-blocks/${blockId}`, {
        method: "DELETE",
      });
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

  const updateBlock = async (block: WorkBlock, field: "start_time_local" | "end_time_local", value: string) => {
    const updated = { ...block, [field]: value + ":00" };
    setBlocks((prev) => prev.map((b) => (b.id === block.id ? updated : b)));
    try {
      await authedFetch(`${apiUrl}/api/availability/weekly-schedules/work-blocks/${block.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value + ":00" }),
      });
    } catch {
      showToast("error", "Failed to update time");
    }
  };

  const blocksForDay = (day: number) => blocks.filter((b) => b.weekday === day);

  const t = (val: string) => val.slice(0, 5);

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-white dark:bg-[#0a0a0f] text-gray-900 dark:text-gray-100 transition-colors duration-300">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all
            ${toast.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"}`}>
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0f] sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight">Availability Manager</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Set staff working hours</p>
              </div>
            </div>
            <button
              onClick={() => setDark(!dark)}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

          {/* Staff Selector */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>Staff member</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setStaffOpen(!staffOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors text-sm font-medium min-w-[180px] justify-between"
              >
                <span>{selectedStaff?.full_name || "Select staff"}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${staffOpen ? "rotate-180" : ""}`} />
              </button>
              {staffOpen && (
                <div className="absolute top-full mt-1 left-0 w-full bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                  {staff.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedStaff(s); setStaffOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors
                        ${selectedStaff?.id === s.id ? "text-cyan-500 font-medium" : ""}`}
                    >
                      {s.full_name || "Unnamed staff"}
                    </button>
                  ))}
                  {staff.length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-400">No staff found</div>
                  )}
                </div>
              )}
            </div>

            {selectedStaff && schedules.length === 0 && !loading && (
              <button
                onClick={createDefaultSchedule}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Schedule
              </button>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          )}

          {/* No schedule state */}
          {!loading && selectedStaff && schedules.length === 0 && (
            <div className="border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-12 text-center">
              <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">No schedule yet for {selectedStaff.full_name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Create a schedule to set working hours</p>
            </div>
          )}

          {/* Weekly Schedule Grid */}
          {!loading && selectedSchedule && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-semibold">Weekly Working Hours</h2>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                    · {selectedSchedule.timezone}
                    {selectedSchedule.is_default && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-500 text-[10px] font-medium">DEFAULT</span>
                    )}
                  </span>
                </div>
                {saving && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
              </div>

              <div className="grid gap-2">
                {DAYS.map((day) => {
                  const dayBlocks = blocksForDay(day.key);
                  const hasBlocks = dayBlocks.length > 0;

                  return (
                    <div
                      key={day.key}
                      className={`rounded-xl border transition-colors ${
                        hasBlocks
                          ? "border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-500/5"
                          : "border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/2"
                      }`}
                    >
                      <div className="flex items-center gap-4 px-4 py-3">
                        {/* Day label */}
                        <div className="w-10 shrink-0">
                          <span className={`text-sm font-bold ${hasBlocks ? "text-cyan-500" : "text-gray-400 dark:text-gray-600"}`}>
                            {day.label}
                          </span>
                        </div>

                        {/* Status indicator */}
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasBlocks ? "bg-cyan-400" : "bg-gray-300 dark:bg-gray-700"}`} />

                        {/* Blocks */}
                        <div className="flex-1 flex flex-wrap items-center gap-2">
                          {hasBlocks ? (
                            dayBlocks.map((block) => (
                              <div
                                key={block.id}
                                className="flex items-center gap-2 bg-white dark:bg-black/20 rounded-lg px-3 py-1.5 border border-cyan-500/20"
                              >
                                <input
                                  type="time"
                                  value={t(block.start_time_local)}
                                  onChange={(e) => updateBlock(block, "start_time_local", e.target.value)}
                                  className="text-sm bg-transparent border-none outline-none text-gray-700 dark:text-gray-200 w-[90px]"
                                />
                                <span className="text-gray-300 dark:text-gray-600 text-xs">→</span>
                                <input
                                  type="time"
                                  value={t(block.end_time_local)}
                                  onChange={(e) => updateBlock(block, "end_time_local", e.target.value)}
                                  className="text-sm bg-transparent border-none outline-none text-gray-700 dark:text-gray-200 w-[90px]"
                                />
                                <button
                                  onClick={() => deleteBlock(block.id)}
                                  className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors ml-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-600">Day off</span>
                          )}
                        </div>

                        {/* Add block button */}
                        <button
                          onClick={() => addBlock(day.key)}
                          disabled={saving}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-cyan-500/50 hover:text-cyan-500 transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" />
                          Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { label: "Working days", value: `${new Set(blocks.map((b) => b.weekday)).size} / 7` },
                  { label: "Max slots/day", value: selectedSchedule.max_slots_per_day ?? "Unlimited" },
                  { label: "Max bookings/day", value: selectedSchedule.max_bookings_per_day ?? "Unlimited" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/2 px-4 py-3"
                  >
                    <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">{stat.label}</div>
                    <div className="text-sm font-semibold">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No staff selected */}
          {!selectedStaff && !loading && (
            <div className="border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-12 text-center">
              <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Select a staff member to manage their schedule</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
