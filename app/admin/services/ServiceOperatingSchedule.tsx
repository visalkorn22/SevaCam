"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";

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

type Props = {
  serviceId: string;
};

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

export default function ServiceOperatingSchedule({ serviceId }: Props) {
  const [data, setData] = useState<SchedulePayload>({
    schedule: null,
    rules: [],
    exceptions: [],
  });
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
      const res = await fetch(
        `/api/services/${serviceId}/operating-schedule/rules`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            rule_type: ruleForm.rule_type,
            weekday: ruleForm.rule_type === "weekly" ? ruleForm.weekday : null,
            month_day:
              ruleForm.rule_type === "monthly_day" ? ruleForm.month_day : null,
            nth:
              ruleForm.rule_type === "monthly_nth_weekday"
                ? ruleForm.nth
                : null,
            start_time: ruleForm.start_time || null,
            end_time: ruleForm.end_time || null,
          }),
        },
      );
      if (!res.ok) throw new Error("Failed to add rule");
      const payload = (await res.json()) as SchedulePayload;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add rule");
    }
  };

  const deleteRule = async (ruleId: string) => {
    setError(null);
    try {
      const res = await fetch(
        `/api/services/${serviceId}/operating-schedule/rules/${ruleId}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to delete rule");
      const payload = (await res.json()) as SchedulePayload;
      setData(payload);
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
      const res = await fetch(
        `/api/services/${serviceId}/operating-schedule/exceptions`,
        {
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
        },
      );
      if (!res.ok) throw new Error("Failed to add exception");
      const payload = (await res.json()) as SchedulePayload;
      setData(payload);
      setExceptionForm({
        date: "",
        is_open: false,
        start_time: "",
        end_time: "",
        reason: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add exception");
    }
  };

  const deleteException = async (exceptionId: string) => {
    setError(null);
    try {
      const res = await fetch(
        `/api/services/${serviceId}/operating-schedule/exceptions/${exceptionId}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to delete exception");
      const payload = (await res.json()) as SchedulePayload;
      setData(payload);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete exception",
      );
    }
  };

  const ruleSummary = useMemo(() => {
    return data.rules.map((rule) => {
      if (rule.rule_type === "weekly") {
        const day = weekdays.find((w) => w.value === rule.weekday)?.label;
        return `${day || "Day"} (weekly)`;
      }
      if (rule.rule_type === "monthly_day") {
        return `Day ${rule.month_day} (monthly)`;
      }
      const nthLabel = nthOptions.find((n) => n.value === rule.nth)?.label;
      const day = weekdays.find((w) => w.value === rule.weekday)?.label;
      return `${nthLabel || rule.nth} ${day || "Day"} (monthly)`;
    });
  }, [data.rules]);

  const previewDays = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: scheduleForm.timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    });
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    const isNthWeekday = (
      year: number,
      month: number,
      day: number,
      weekday: number,
      nth: number,
    ) => {
      const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
      const offset = (weekday - firstDay + 7) % 7;
      const firstOccurrence = 1 + offset;
      const occurrence = Math.floor((day - firstOccurrence) / 7) + 1;
      if (nth === -1) {
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const lastWeekday = new Date(
          Date.UTC(year, month - 1, lastDay),
        ).getUTCDay();
        const lastOffset = (lastWeekday - weekday + 7) % 7;
        const lastOccurrenceDay = lastDay - lastOffset;
        return day === lastOccurrenceDay;
      }
      return occurrence === nth;
    };

    const formatHours = (start?: string | null, end?: string | null) => {
      if (start && end) return `${start} - ${end}`;
      return scheduleForm.open_time && scheduleForm.close_time
        ? `${scheduleForm.open_time} - ${scheduleForm.close_time}`
        : "Open";
    };

    const rules = data.rules;
    const exceptions = data.exceptions;
    const days = [] as Array<{ date: string; label: string; status: string }>;

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
        (!scheduleForm.effective_from ||
          dateStr >= scheduleForm.effective_from) &&
        (!scheduleForm.effective_to || dateStr <= scheduleForm.effective_to);

      if (!scheduleForm.is_active || !inRange) {
        days.push({ date: dateStr, label: weekdayLabel, status: "Closed" });
        continue;
      }

      const dayExceptions = exceptions.filter((ex) => ex.date === dateStr);
      const override = dayExceptions.filter(
        (ex) => ex.is_open && ex.start_time && ex.end_time,
      );
      const closed = dayExceptions.filter((ex) => !ex.is_open);
      const extraOpen = dayExceptions.filter(
        (ex) => ex.is_open && !ex.start_time && !ex.end_time,
      );

      if (override.length > 0) {
        days.push({
          date: dateStr,
          label: weekdayLabel,
          status: `Open (${override
            .map((ex) => `${ex.start_time} - ${ex.end_time}`)
            .join(", ")})`,
        });
        continue;
      }

      if (closed.length > 0) {
        days.push({ date: dateStr, label: weekdayLabel, status: "Closed" });
        continue;
      }

      if (extraOpen.length > 0) {
        days.push({
          date: dateStr,
          label: weekdayLabel,
          status: `Open (${formatHours()})`,
        });
        continue;
      }

      let isOpen = false;
      let hours = "";

      if (scheduleForm.rule_type === "daily") {
        isOpen = true;
        hours = formatHours();
      } else if (scheduleForm.rule_type === "weekly") {
        const matches = rules.filter(
          (rule) => rule.rule_type === "weekly" && rule.weekday === weekday,
        );
        if (matches.length > 0) {
          isOpen = true;
          hours = formatHours(matches[0].start_time, matches[0].end_time);
        }
      } else if (scheduleForm.rule_type === "monthly") {
        const matches = rules.filter((rule) => {
          if (rule.rule_type === "monthly_day") {
            return rule.month_day === day;
          }
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

      days.push({
        date: dateStr,
        label: weekdayLabel,
        status: isOpen ? `Open (${hours})` : "Closed",
      });
    }

    return days;
  }, [
    data.exceptions,
    data.rules,
    previewRange,
    scheduleForm.effective_from,
    scheduleForm.effective_to,
    scheduleForm.is_active,
    scheduleForm.open_time,
    scheduleForm.close_time,
    scheduleForm.rule_type,
    scheduleForm.timezone,
  ]);

  return (
    <Card className="border-border/40 bg-card/80">
      <CardHeader>
        <CardTitle>Service Operating Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Timezone
            </label>
            <input
              value={scheduleForm.timezone}
              onChange={(event) =>
                setScheduleForm((prev) => ({
                  ...prev,
                  timezone: event.target.value,
                }))
              }
              placeholder="e.g. UTC, Asia/Singapore"
              className="mt-2 w-full rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Rule Type
            </label>
            <select
              value={scheduleForm.rule_type}
              onChange={(event) =>
                setScheduleForm((prev) => ({
                  ...prev,
                  rule_type: event.target
                    .value as OperatingSchedule["rule_type"],
                }))
              }
              className="mt-2 w-full rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Open Time
            </label>
            <input
              type="time"
              value={scheduleForm.open_time ?? ""}
              onChange={(event) =>
                setScheduleForm((prev) => ({
                  ...prev,
                  open_time: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Close Time
            </label>
            <input
              type="time"
              value={scheduleForm.close_time ?? ""}
              onChange={(event) =>
                setScheduleForm((prev) => ({
                  ...prev,
                  close_time: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Effective From
            </label>
            <input
              type="date"
              value={scheduleForm.effective_from ?? ""}
              onChange={(event) =>
                setScheduleForm((prev) => ({
                  ...prev,
                  effective_from: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Effective To
            </label>
            <input
              type="date"
              value={scheduleForm.effective_to ?? ""}
              onChange={(event) =>
                setScheduleForm((prev) => ({
                  ...prev,
                  effective_to: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-muted/40 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Active</p>
            <p className="text-xs text-muted-foreground">
              Enable or disable schedule
            </p>
          </div>
          <Switch
            checked={scheduleForm.is_active}
            onCheckedChange={(checked) =>
              setScheduleForm((prev) => ({ ...prev, is_active: checked }))
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={saveSchedule}
            disabled={isSaving}
            className="rounded-full"
          >
            {isSaving ? "Saving..." : "Save Schedule"}
          </Button>
          {!scheduleExists && (
            <span className="text-xs text-muted-foreground">
              Save schedule before adding rules.
            </span>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Rules</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={ruleForm.rule_type}
              onChange={(event) =>
                setRuleForm((prev) => ({
                  ...prev,
                  rule_type: event.target.value as OperatingRule["rule_type"],
                }))
              }
              className="rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
            >
              <option value="weekly">Weekly (weekday)</option>
              <option value="monthly_day">Monthly (day of month)</option>
              <option value="monthly_nth_weekday">Monthly (nth weekday)</option>
            </select>

            {ruleForm.rule_type === "weekly" && (
              <select
                value={ruleForm.weekday}
                onChange={(event) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    weekday: Number(event.target.value),
                  }))
                }
                className="rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
              >
                {weekdays.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            )}

            {ruleForm.rule_type === "monthly_day" && (
              <input
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
                className="rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
                placeholder="Day of month"
              />
            )}

            {ruleForm.rule_type === "monthly_nth_weekday" && (
              <div className="flex gap-2">
                <select
                  value={ruleForm.nth}
                  onChange={(event) =>
                    setRuleForm((prev) => ({
                      ...prev,
                      nth: Number(event.target.value),
                    }))
                  }
                  className="flex-1 rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
                >
                  {nthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <select
                  value={ruleForm.weekday}
                  onChange={(event) =>
                    setRuleForm((prev) => ({
                      ...prev,
                      weekday: Number(event.target.value),
                    }))
                  }
                  className="flex-1 rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
                >
                  {weekdays.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <input
              type="time"
              value={ruleForm.start_time}
              onChange={(event) =>
                setRuleForm((prev) => ({
                  ...prev,
                  start_time: event.target.value,
                }))
              }
              className="rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
            />
            <input
              type="time"
              value={ruleForm.end_time}
              onChange={(event) =>
                setRuleForm((prev) => ({
                  ...prev,
                  end_time: event.target.value,
                }))
              }
              className="rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
            />
          </div>
          <Button variant="outline" onClick={addRule} className="rounded-full">
            Add Rule
          </Button>

          {data.rules.length > 0 ? (
            <div className="space-y-2">
              {data.rules.map((rule, index) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-2xl border border-border/40 bg-card/80 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {ruleSummary[index] || rule.rule_type}
                    </p>
                    {(rule.start_time || rule.end_time) && (
                      <p className="text-xs text-muted-foreground">
                        {rule.start_time || "--"} - {rule.end_time || "--"}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No rules added.</p>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Exceptions</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="date"
              value={exceptionForm.date}
              onChange={(event) =>
                setExceptionForm((prev) => ({
                  ...prev,
                  date: event.target.value,
                }))
              }
              className="rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={exceptionForm.reason}
              onChange={(event) =>
                setExceptionForm((prev) => ({
                  ...prev,
                  reason: event.target.value,
                }))
              }
              placeholder="Reason"
              className="rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
            />
            <input
              type="time"
              value={exceptionForm.start_time}
              onChange={(event) =>
                setExceptionForm((prev) => ({
                  ...prev,
                  start_time: event.target.value,
                }))
              }
              className="rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
            />
            <input
              type="time"
              value={exceptionForm.end_time}
              onChange={(event) =>
                setExceptionForm((prev) => ({
                  ...prev,
                  end_time: event.target.value,
                }))
              }
              className="rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-muted/40 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Open on this date</p>
              <p className="text-xs text-muted-foreground">
                Turn on to create a special open day.
              </p>
            </div>
            <Switch
              checked={exceptionForm.is_open}
              onCheckedChange={(checked) =>
                setExceptionForm((prev) => ({ ...prev, is_open: checked }))
              }
            />
          </div>
          <Button
            variant="outline"
            onClick={addException}
            className="rounded-full"
          >
            Add Exception
          </Button>

          {data.exceptions.length > 0 ? (
            <div className="space-y-2">
              {data.exceptions.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between rounded-2xl border border-border/40 bg-card/80 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {ex.date} {ex.is_open ? "Open" : "Closed"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ex.start_time || "--"} - {ex.end_time || "--"}{" "}
                      {ex.reason ? `• ${ex.reason}` : ""}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteException(ex.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No exceptions added.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-sm font-semibold">Preview (next days)</h4>
            <select
              value={previewRange}
              onChange={(event) => setPreviewRange(Number(event.target.value))}
              className="rounded-2xl border border-border/40 bg-background/80 px-3 py-2 text-sm"
            >
              <option value={30}>Next 30 days</option>
              <option value={60}>Next 60 days</option>
              <option value={90}>Next 90 days</option>
            </select>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {previewDays.map((day) => (
              <div
                key={day.date}
                className="rounded-2xl border border-border/40 bg-card/80 px-3 py-2 text-sm"
              >
                <p className="font-semibold">
                  {day.date} • {day.label}
                </p>
                <p
                  className={`text-xs ${
                    day.status.startsWith("Open")
                      ? "text-emerald-600"
                      : "text-rose-500"
                  }`}
                >
                  {day.status}
                </p>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
