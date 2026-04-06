"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type OperatingSchedule = {
  id: string;
  service_id: string;
  timezone: string;
  rule_type: "daily" | "weekly" | "monthly";
  open_time?: string | null;
  close_time?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  is_active: boolean;
};

type OperatingRule = {
  id: string;
  schedule_id: string;
  rule_type: "weekly" | "monthly_day" | "monthly_nth_weekday";
  weekday?: number | null;
  month_day?: number | null;
  nth?: number | null;
  start_time?: string | null;
  end_time?: string | null;
};

type OperatingException = {
  id: string;
  service_id: string;
  date: string;
  is_open: boolean;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string | null;
};

type SchedulePayload = {
  schedule: OperatingSchedule | null;
  rules: OperatingRule[];
  exceptions: OperatingException[];
};

type Props = { serviceId: string };

const weekdays = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const nthOptions = [
  { value: 1, label: "1st" },
  { value: 2, label: "2nd" },
  { value: 3, label: "3rd" },
  { value: 4, label: "4th" },
  { value: 5, label: "5th" },
  { value: -1, label: "Last" },
];

const fieldLabel =
  "mb-2 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)";
const sectionLabel =
  "mb-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)";
const fieldInput =
  "h-10 rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:border-(--accent-primary) focus-visible:ring-1 focus-visible:ring-(--accent-primary) transition-colors";
const selectContent =
  "rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-elevated) text-(--text-primary) shadow-[0_20px_40px_rgba(0,0,0,0.4)]";
const selectItem =
  "text-(--text-primary) data-[highlighted]:!bg-(--bg-inset) data-[highlighted]:!text-(--text-primary) data-[state=checked]:!bg-[rgba(122,213,221,0.12)] data-[state=checked]:!text-(--accent-primary)";

export default function ServiceOperatingSchedule({ serviceId }: Props) {
  const [data, setData] = useState<SchedulePayload>({ schedule: null, rules: [], exceptions: [] });
  const [scheduleForm, setScheduleForm] = useState<OperatingSchedule>({
    id: "",
    service_id: serviceId,
    timezone: "UTC",
    rule_type: "daily",
    open_time: "",
    close_time: "",
    effective_from: "",
    effective_to: "",
    is_active: true,
  });
  const [ruleForm, setRuleForm] = useState({
    rule_type: "weekly" as OperatingRule["rule_type"],
    weekday: 1,
    month_day: 1,
    nth: 1,
    start_time: "",
    end_time: "",
  });
  const [exceptionForm, setExceptionForm] = useState({
    date: "",
    is_open: false,
    start_time: "",
    end_time: "",
    reason: "",
  });
  const [previewRange, setPreviewRange] = useState(30);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scheduleExists = Boolean(data.schedule?.id);

  const loadSchedule = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/services/${serviceId}/operating-schedule`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load schedule");
      const payload = (await res.json()) as SchedulePayload;
      setData(payload);
      if (payload.schedule) {
        setScheduleForm({
          ...payload.schedule,
          open_time: payload.schedule.open_time ?? "",
          close_time: payload.schedule.close_time ?? "",
          effective_from: payload.schedule.effective_from ?? "",
          effective_to: payload.schedule.effective_to ?? "",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load schedule");
    }
  }, [serviceId]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const saveSchedule = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const method = scheduleExists ? "PUT" : "POST";
      const res = await fetch(`/api/services/${serviceId}/operating-schedule`, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          timezone: scheduleForm.timezone,
          rule_type: scheduleForm.rule_type,
          open_time: scheduleForm.open_time || null,
          close_time: scheduleForm.close_time || null,
          effective_from: scheduleForm.effective_from || null,
          effective_to: scheduleForm.effective_to || null,
          is_active: scheduleForm.is_active,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const payload = (await res.json()) as SchedulePayload;
      setData(payload);
      if (payload.schedule) {
        setScheduleForm({
          ...payload.schedule,
          open_time: payload.schedule.open_time ?? "",
          close_time: payload.schedule.close_time ?? "",
          effective_from: payload.schedule.effective_from ?? "",
          effective_to: payload.schedule.effective_to ?? "",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const addRule = async () => {
    setError(null);
    if (!scheduleExists) {
      setError("Save the schedule before adding rules.");
      return;
    }
    try {
      const res = await fetch(`/api/services/${serviceId}/operating-schedule/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rule_type: ruleForm.rule_type,
          weekday: ruleForm.rule_type === "weekly" ? ruleForm.weekday : null,
          month_day: ruleForm.rule_type === "monthly_day" ? ruleForm.month_day : null,
          nth: ruleForm.rule_type === "monthly_nth_weekday" ? ruleForm.nth : null,
          start_time: ruleForm.start_time || null,
          end_time: ruleForm.end_time || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add rule");
      setData((await res.json()) as SchedulePayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add rule");
    }
  };

  const deleteRule = async (ruleId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/services/${serviceId}/operating-schedule/rules/${ruleId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete rule");
      setData((await res.json()) as SchedulePayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete rule");
    }
  };

  const addException = async () => {
    setError(null);
    if (!exceptionForm.date) {
      setError("Select a date for the exception.");
      return;
    }
    try {
      const res = await fetch(`/api/services/${serviceId}/operating-schedule/exceptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: exceptionForm.date,
          is_open: exceptionForm.is_open,
          start_time: exceptionForm.start_time || null,
          end_time: exceptionForm.end_time || null,
          reason: exceptionForm.reason || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add exception");
      const payload = (await res.json()) as SchedulePayload;
      setData(payload);
      setExceptionForm({ date: "", is_open: false, start_time: "", end_time: "", reason: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add exception");
    }
  };

  const deleteException = async (exceptionId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/services/${serviceId}/operating-schedule/exceptions/${exceptionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete exception");
      setData((await res.json()) as SchedulePayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete exception");
    }
  };

  const ruleSummary = useMemo(
    () =>
      data.rules.map((rule) => {
        if (rule.rule_type === "weekly") {
          const day = weekdays.find((w) => w.value === rule.weekday)?.label;
          return `${day || "Day"} (weekly)`;
        }
        if (rule.rule_type === "monthly_day") return `Day ${rule.month_day} (monthly)`;
        const nthLabel = nthOptions.find((n) => n.value === rule.nth)?.label;
        const day = weekdays.find((w) => w.value === rule.weekday)?.label;
        return `${nthLabel || rule.nth} ${day || "Day"} (monthly)`;
      }),
    [data.rules],
  );

  const previewDays = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: scheduleForm.timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    });
    const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const isNthWeekday = (year: number, month: number, day: number, weekday: number, nth: number) => {
      const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
      const offset = (weekday - firstDay + 7) % 7;
      const firstOccurrence = 1 + offset;
      const occurrence = Math.floor((day - firstOccurrence) / 7) + 1;
      if (nth === -1) {
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const lastWeekday = new Date(Date.UTC(year, month - 1, lastDay)).getUTCDay();
        const lastOffset = (lastWeekday - weekday + 7) % 7;
        return day === lastDay - lastOffset;
      }
      return occurrence === nth;
    };
    const formatHours = (start?: string | null, end?: string | null) => {
      if (start && end) return `${start} - ${end}`;
      return scheduleForm.open_time && scheduleForm.close_time
        ? `${scheduleForm.open_time} - ${scheduleForm.close_time}`
        : "Open";
    };
    const days: Array<{ date: string; label: string; status: string }> = [];
    for (let i = 0; i < previewRange; i += 1) {
      const base = new Date();
      base.setUTCDate(base.getUTCDate() + i);
      const parts = formatter.formatToParts(base);
      const year = Number(parts.find((p) => p.type === "year")?.value ?? 0);
      const month = Number(parts.find((p) => p.type === "month")?.value ?? 0);
      const day = Number(parts.find((p) => p.type === "day")?.value ?? 0);
      const weekdayLabel = parts.find((p) => p.type === "weekday")?.value ?? "";
      const weekday = weekdayMap[weekdayLabel] ?? 0;
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const inRange =
        (!scheduleForm.effective_from || dateStr >= scheduleForm.effective_from) &&
        (!scheduleForm.effective_to || dateStr <= scheduleForm.effective_to);
      if (!scheduleForm.is_active || !inRange) {
        days.push({ date: dateStr, label: weekdayLabel, status: "Closed" });
        continue;
      }
      const dayExceptions = data.exceptions.filter((ex) => ex.date === dateStr);
      const override = dayExceptions.filter((ex) => ex.is_open && ex.start_time && ex.end_time);
      const closed = dayExceptions.filter((ex) => !ex.is_open);
      const extraOpen = dayExceptions.filter((ex) => ex.is_open && !ex.start_time && !ex.end_time);
      if (override.length > 0) {
        days.push({ date: dateStr, label: weekdayLabel, status: `Open (${override.map((ex) => `${ex.start_time} - ${ex.end_time}`).join(", ")})` });
        continue;
      }
      if (closed.length > 0) {
        days.push({ date: dateStr, label: weekdayLabel, status: "Closed" });
        continue;
      }
      if (extraOpen.length > 0) {
        days.push({ date: dateStr, label: weekdayLabel, status: `Open (${formatHours()})` });
        continue;
      }
      let isOpen = false;
      let hours = "";
      if (scheduleForm.rule_type === "daily") {
        isOpen = true;
        hours = formatHours();
      } else if (scheduleForm.rule_type === "weekly") {
        const matches = data.rules.filter((rule) => rule.rule_type === "weekly" && rule.weekday === weekday);
        if (matches.length > 0) {
          isOpen = true;
          hours = formatHours(matches[0].start_time, matches[0].end_time);
        }
      } else {
        const matches = data.rules.filter((rule) => {
          if (rule.rule_type === "monthly_day") return rule.month_day === day;
          if (rule.rule_type === "monthly_nth_weekday") {
            if (rule.weekday == null || rule.nth == null) return false;
            return isNthWeekday(year, month, day, rule.weekday, rule.nth);
          }
          return false;
        });
        if (matches.length > 0) {
          isOpen = true;
          hours = formatHours(matches[0].start_time, matches[0].end_time);
        }
      }
      days.push({ date: dateStr, label: weekdayLabel, status: isOpen ? `Open (${hours})` : "Closed" });
    }
    return days;
  }, [data.exceptions, data.rules, previewRange, scheduleForm.close_time, scheduleForm.effective_from, scheduleForm.effective_to, scheduleForm.is_active, scheduleForm.open_time, scheduleForm.rule_type, scheduleForm.timezone]);

  return (
    <section className="sevacam-rail overflow-hidden motion-page">
      <div className="border-b border-white/5 px-6 py-5 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="sevacam-eyebrow">Availability Control</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-(--text-primary)">
              Service Operating Schedule
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-(--text-secondary)">
              Define recurring hours, blackout dates, and special openings
              without leaving the service edit flow.
            </p>
          </div>
          <div className="rounded-[0.75rem] border border-(--border-subtle) bg-(--bg-inset) px-4 py-3">
            <p className={sectionLabel}>Current Mode</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  scheduleForm.is_active
                    ? "bg-(--accent-primary)"
                    : "bg-[#ffb785]"
                }`}
              />
              <span className="text-sm font-medium text-(--text-primary)">
                {scheduleForm.is_active ? "Active" : "Paused"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8 px-6 py-6 sm:px-7">
        <div className="rounded-[0.85rem] border border-(--border-subtle) bg-(--bg-inset) p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className={sectionLabel}>Schedule Status</p>
              <p className="text-sm text-(--text-secondary)">
                Save the base schedule first, then add recurring rules and
                exceptions underneath.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 rounded-[0.65rem] border border-(--border-subtle) bg-(--bg-elevated) px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-(--text-primary)">
                    Schedule live
                  </p>
                  <p className="text-[0.72rem] text-(--text-disabled)">
                    Toggle availability without deleting the setup.
                  </p>
                </div>
                <Switch
                  checked={scheduleForm.is_active}
                  onCheckedChange={(checked) =>
                    setScheduleForm((prev) => ({ ...prev, is_active: checked }))
                  }
                />
              </div>
              <Button
                type="button"
                onClick={saveSchedule}
                disabled={isSaving}
                className="sevacam-primary-button h-10 rounded-[0.22rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.16em]"
              >
                {isSaving ? "Saving..." : "Save Schedule"}
              </Button>
            </div>
          </div>
          {!scheduleExists && (
            <p className="mt-3 text-xs text-(--text-disabled)">
              Save the schedule once before adding weekly or monthly rules.
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={fieldLabel}>Service Timezone</label>
            <Input
              value={scheduleForm.timezone}
              onChange={(event) =>
                setScheduleForm((prev) => ({
                  ...prev,
                  timezone: event.target.value,
                }))
              }
              placeholder="e.g. Asia/Phnom_Penh"
              className={fieldInput}
            />
          </div>
          <div>
            <label className={fieldLabel}>Open Days</label>
            <Select
              value={scheduleForm.rule_type}
              onValueChange={(value) =>
                setScheduleForm((prev) => ({
                  ...prev,
                  rule_type: value as OperatingSchedule["rule_type"],
                }))
              }
            >
              <SelectTrigger className={fieldInput}>
                <SelectValue placeholder="Select rule type" />
              </SelectTrigger>
              <SelectContent className={selectContent}>
                <SelectItem value="daily" className={selectItem}>
                  Every day
                </SelectItem>
                <SelectItem value="weekly" className={selectItem}>
                  Weekly pattern
                </SelectItem>
                <SelectItem value="monthly" className={selectItem}>
                  Monthly pattern
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={fieldLabel}>Open Time</label>
            <Input
              type="time"
              value={scheduleForm.open_time ?? ""}
              onChange={(event) =>
                setScheduleForm((prev) => ({
                  ...prev,
                  open_time: event.target.value,
                }))
              }
              className={fieldInput}
            />
          </div>
          <div>
            <label className={fieldLabel}>Close Time</label>
            <Input
              type="time"
              value={scheduleForm.close_time ?? ""}
              onChange={(event) =>
                setScheduleForm((prev) => ({
                  ...prev,
                  close_time: event.target.value,
                }))
              }
              className={fieldInput}
            />
          </div>
          <div>
            <label className={fieldLabel}>Effective From</label>
            <Input
              type="date"
              value={scheduleForm.effective_from ?? ""}
              onChange={(event) =>
                setScheduleForm((prev) => ({
                  ...prev,
                  effective_from: event.target.value,
                }))
              }
              className={fieldInput}
            />
          </div>
          <div>
            <label className={fieldLabel}>Effective To</label>
            <Input
              type="date"
              value={scheduleForm.effective_to ?? ""}
              onChange={(event) =>
                setScheduleForm((prev) => ({
                  ...prev,
                  effective_to: event.target.value,
                }))
              }
              className={fieldInput}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className={sectionLabel}>Recurring Rules</p>
            <p className="text-sm text-(--text-secondary)">
              Weekly and monthly schedules can be refined with rule rows below.
            </p>
          </div>
          {scheduleForm.rule_type === "daily" ? (
            <div className="rounded-[0.75rem] border border-(--border-subtle) bg-(--bg-inset) p-4 text-sm text-(--text-secondary)">
              Daily schedule selected. The default open and close time above
              will be used every day.
            </div>
          ) : (
            <div className="rounded-[0.85rem] border border-(--border-subtle) bg-(--bg-inset) p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className={fieldLabel}>Rule Type</label>
                  <Select
                    value={ruleForm.rule_type}
                    onValueChange={(value) =>
                      setRuleForm((prev) => ({
                        ...prev,
                        rule_type: value as OperatingRule["rule_type"],
                      }))
                    }
                  >
                    <SelectTrigger className={fieldInput}>
                      <SelectValue placeholder="Select rule type" />
                    </SelectTrigger>
                    <SelectContent className={selectContent}>
                      <SelectItem value="weekly" className={selectItem}>
                        Weekly (weekday)
                      </SelectItem>
                      <SelectItem value="monthly_day" className={selectItem}>
                        Monthly (day of month)
                      </SelectItem>
                      <SelectItem
                        value="monthly_nth_weekday"
                        className={selectItem}
                      >
                        Monthly (nth weekday)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {ruleForm.rule_type === "weekly" && (
                  <div>
                    <label className={fieldLabel}>Weekday</label>
                    <Select
                      value={String(ruleForm.weekday)}
                      onValueChange={(value) =>
                        setRuleForm((prev) => ({
                          ...prev,
                          weekday: Number(value),
                        }))
                      }
                    >
                      <SelectTrigger className={fieldInput}>
                        <SelectValue placeholder="Select weekday" />
                      </SelectTrigger>
                      <SelectContent className={selectContent}>
                        {weekdays.map((day) => (
                          <SelectItem
                            key={day.value}
                            value={String(day.value)}
                            className={selectItem}
                          >
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {ruleForm.rule_type === "monthly_day" && (
                  <div>
                    <label className={fieldLabel}>Day of Month</label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={ruleForm.month_day}
                      onChange={(event) =>
                        setRuleForm((prev) => ({
                          ...prev,
                          month_day: Number(event.target.value),
                        }))
                      }
                      className={fieldInput}
                      placeholder="Day of month"
                    />
                  </div>
                )}

                {ruleForm.rule_type === "monthly_nth_weekday" && (
                  <>
                    <div>
                      <label className={fieldLabel}>Nth</label>
                      <Select
                        value={String(ruleForm.nth)}
                        onValueChange={(value) =>
                          setRuleForm((prev) => ({
                            ...prev,
                            nth: Number(value),
                          }))
                        }
                      >
                        <SelectTrigger className={fieldInput}>
                          <SelectValue placeholder="Nth" />
                        </SelectTrigger>
                        <SelectContent className={selectContent}>
                          {nthOptions.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={String(opt.value)}
                              className={selectItem}
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className={fieldLabel}>Weekday</label>
                      <Select
                        value={String(ruleForm.weekday)}
                        onValueChange={(value) =>
                          setRuleForm((prev) => ({
                            ...prev,
                            weekday: Number(value),
                          }))
                        }
                      >
                        <SelectTrigger className={fieldInput}>
                          <SelectValue placeholder="Select weekday" />
                        </SelectTrigger>
                        <SelectContent className={selectContent}>
                          {weekdays.map((day) => (
                            <SelectItem
                              key={day.value}
                              value={String(day.value)}
                              className={selectItem}
                            >
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div>
                  <label className={fieldLabel}>Start Time</label>
                  <Input
                    type="time"
                    value={ruleForm.start_time}
                    onChange={(event) =>
                      setRuleForm((prev) => ({
                        ...prev,
                        start_time: event.target.value,
                      }))
                    }
                    className={fieldInput}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>End Time</label>
                  <Input
                    type="time"
                    value={ruleForm.end_time}
                    onChange={(event) =>
                      setRuleForm((prev) => ({
                        ...prev,
                        end_time: event.target.value,
                      }))
                    }
                    className={fieldInput}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={addRule}
                  className="sevacam-secondary-button h-9 rounded-[0.22rem] px-5 text-[0.6rem] font-semibold uppercase tracking-[0.16em]"
                >
                  Add Rule
                </Button>
                {!scheduleExists && (
                  <span className="text-xs text-(--text-disabled)">
                    Save the base schedule before adding rules.
                  </span>
                )}
              </div>

              {data.rules.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {data.rules.map((rule, index) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between rounded-[0.65rem] border border-(--border-subtle) bg-(--bg-elevated) px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-(--text-primary)">
                          {ruleSummary[index] || rule.rule_type}
                        </p>
                        {(rule.start_time || rule.end_time) && (
                          <p className="text-xs text-(--text-disabled)">
                            {rule.start_time || "--"} - {rule.end_time || "--"}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteRule(rule.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-disabled) transition hover:border-[#ffb785]/35 hover:text-[#ffb785]"
                        aria-label="Delete rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-xs text-(--text-disabled)">
                  No rules added.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className={sectionLabel}>Exceptions</p>
            <p className="text-sm text-(--text-secondary)">
              Mark holidays, maintenance windows, and special open dates.
            </p>
          </div>
          <div className="rounded-[0.85rem] border border-(--border-subtle) bg-(--bg-inset) p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className={fieldLabel}>Date</label>
                <Input
                  type="date"
                  value={exceptionForm.date}
                  onChange={(event) =>
                    setExceptionForm((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                  className={fieldInput}
                />
              </div>
              <div>
                <label className={fieldLabel}>Reason</label>
                <Input
                  type="text"
                  value={exceptionForm.reason}
                  onChange={(event) =>
                    setExceptionForm((prev) => ({
                      ...prev,
                      reason: event.target.value,
                    }))
                  }
                  placeholder="Reason"
                  className={fieldInput}
                />
              </div>
              <div>
                <label className={fieldLabel}>Start Time</label>
                <Input
                  type="time"
                  value={exceptionForm.start_time}
                  onChange={(event) =>
                    setExceptionForm((prev) => ({
                      ...prev,
                      start_time: event.target.value,
                    }))
                  }
                  className={fieldInput}
                />
              </div>
              <div>
                <label className={fieldLabel}>End Time</label>
                <Input
                  type="time"
                  value={exceptionForm.end_time}
                  onChange={(event) =>
                    setExceptionForm((prev) => ({
                      ...prev,
                      end_time: event.target.value,
                    }))
                  }
                  className={fieldInput}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-[0.75rem] border border-(--border-subtle) bg-(--bg-elevated) px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-(--text-primary)">
                  Open on this date
                </p>
                <p className="text-xs text-(--text-secondary)">
                  Turn this on to create a special open day.
                </p>
              </div>
              <Switch
                checked={exceptionForm.is_open}
                onCheckedChange={(checked) =>
                  setExceptionForm((prev) => ({ ...prev, is_open: checked }))
                }
              />
            </div>

            <div className="mt-4">
              <Button
                type="button"
                onClick={addException}
                className="sevacam-secondary-button h-9 rounded-[0.22rem] px-5 text-[0.6rem] font-semibold uppercase tracking-[0.16em]"
              >
                Add Exception
              </Button>
            </div>

            {data.exceptions.length > 0 ? (
              <div className="mt-4 space-y-2">
                {data.exceptions.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between rounded-[0.65rem] border border-(--border-subtle) bg-(--bg-elevated) px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-(--text-primary)">
                        {ex.date} - {ex.is_open ? "Open" : "Closed"}
                      </p>
                      <p className="text-xs text-(--text-disabled)">
                        {ex.start_time || "--"} - {ex.end_time || "--"}
                        {ex.reason ? ` - ${ex.reason}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteException(ex.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-disabled) transition hover:border-[#ffb785]/35 hover:text-[#ffb785]"
                      aria-label="Delete exception"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-(--text-disabled)">
                No exceptions added.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={sectionLabel}>Availability Preview</p>
              <p className="text-sm text-(--text-secondary)">
                Scan the next window to confirm the schedule behaves as expected.
              </p>
            </div>
            <div className="w-full max-w-[12rem]">
              <Select
                value={String(previewRange)}
                onValueChange={(value) => setPreviewRange(Number(value))}
              >
                <SelectTrigger className={fieldInput}>
                  <SelectValue placeholder="Select preview range" />
                </SelectTrigger>
                <SelectContent className={selectContent}>
                  <SelectItem value="30" className={selectItem}>
                    Next 30 days
                  </SelectItem>
                  <SelectItem value="60" className={selectItem}>
                    Next 60 days
                  </SelectItem>
                  <SelectItem value="90" className={selectItem}>
                    Next 90 days
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {previewDays.map((day) => {
              const isOpen = day.status.startsWith("Open");
              return (
                <div
                  key={day.date}
                  className="rounded-[0.75rem] border border-(--border-subtle) bg-(--bg-inset) px-4 py-3"
                >
                  <p className="text-sm font-semibold text-(--text-primary)">
                    {day.date} - {day.label}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      isOpen ? "text-(--accent-primary)" : "text-[#ffb785]"
                    }`}
                  >
                    {day.status}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div
            className="rounded-[0.75rem] border border-[#ffb785]/25 bg-[#ffb785]/8 px-4 py-3 text-sm text-[#ffcfad]"
            role="alert"
          >
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
