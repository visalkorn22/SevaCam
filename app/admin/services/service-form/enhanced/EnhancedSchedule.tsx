"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  OperatingExceptionDraft,
  OperatingRuleDraft,
  OperatingScheduleDraft,
} from "../types";
import { nthOptions, weekdays } from "../types";

type EnhancedScheduleProps = {
  scheduleEnabled: boolean;
  setScheduleEnabled: Dispatch<SetStateAction<boolean>>;
  scheduleForm: OperatingScheduleDraft;
  setScheduleForm: Dispatch<SetStateAction<OperatingScheduleDraft>>;
  scheduleRules: OperatingRuleDraft[];
  setScheduleRules: Dispatch<SetStateAction<OperatingRuleDraft[]>>;
  scheduleExceptions: OperatingExceptionDraft[];
  setScheduleExceptions: Dispatch<SetStateAction<OperatingExceptionDraft[]>>;
  ruleDraft: OperatingRuleDraft;
  setRuleDraft: Dispatch<SetStateAction<OperatingRuleDraft>>;
  exceptionDraft: OperatingExceptionDraft;
  setExceptionDraft: Dispatch<SetStateAction<OperatingExceptionDraft>>;
};

export default function EnhancedSchedule({
  scheduleEnabled,
  setScheduleEnabled,
  scheduleForm,
  setScheduleForm,
  scheduleRules,
  setScheduleRules,
  scheduleExceptions,
  setScheduleExceptions,
  ruleDraft,
  setRuleDraft,
  exceptionDraft,
  setExceptionDraft,
}: EnhancedScheduleProps) {
  const formatRuleSummary = (rule: OperatingRuleDraft) => {
    if (rule.rule_type === "weekly") {
      const day = weekdays.find((weekday) => weekday.value === rule.weekday);
      return `${day?.label ?? "Weekday"} (weekly)`;
    }
    if (rule.rule_type === "monthly_day") {
      return `Day ${rule.month_day ?? "--"} (monthly)`;
    }
    const nthLabel = nthOptions.find((opt) => opt.value === rule.nth)?.label;
    const day = weekdays.find((weekday) => weekday.value === rule.weekday);
    return `${nthLabel ?? rule.nth} ${day?.label ?? "weekday"} (monthly)`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-muted/40 p-4">
        <div>
          <h4 className="font-semibold text-gray-900">
            Enable Operating Schedule
          </h4>
          <p className="text-sm text-gray-600">
            Optional: define availability, closed days, and special opens.
          </p>
        </div>
        <Switch
          checked={scheduleEnabled}
          onCheckedChange={setScheduleEnabled}
        />
      </div>

      {!scheduleEnabled ? (
        <p className="text-xs text-gray-500">
          You can skip this and configure schedules later from the service edit
          screen.
        </p>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Service Timezone
              </label>
              <Input
                value={scheduleForm.timezone}
                onChange={(e) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    timezone: e.target.value,
                  }))
                }
                placeholder="e.g. Asia/Phnom_Penh"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Open Days
              </label>
              <Select
                value={scheduleForm.rule_type}
                onValueChange={(value) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    rule_type: value as OperatingScheduleDraft["rule_type"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select schedule type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Every day</SelectItem>
                  <SelectItem value="weekly">
                    Only some days per week
                  </SelectItem>
                  <SelectItem value="monthly">Monthly pattern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Open Time
              </label>
              <Input
                type="time"
                value={scheduleForm.open_time ?? ""}
                onChange={(e) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    open_time: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Close Time
              </label>
              <Input
                type="time"
                value={scheduleForm.close_time ?? ""}
                onChange={(e) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    close_time: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Effective From
              </label>
              <Input
                type="date"
                value={scheduleForm.effective_from ?? ""}
                onChange={(e) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    effective_from: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Effective To
              </label>
              <Input
                type="date"
                value={scheduleForm.effective_to ?? ""}
                onChange={(e) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    effective_to: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-muted/40 p-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Schedule Active
              </p>
              <p className="text-sm text-gray-600">
                Turn off to temporarily close this service.
              </p>
            </div>
            <Switch
              checked={scheduleForm.is_active}
              onCheckedChange={(checked) =>
                setScheduleForm((prev) => ({ ...prev, is_active: checked }))
              }
            />
          </div>

          <div className="space-y-4">
            <div>
              <h5 className="text-sm font-semibold text-gray-900">
                Rules (days to open)
              </h5>
              <p className="text-xs text-gray-500">
                Use rules for weekly or monthly schedules. Daily schedules use
                the default hours above.
              </p>
            </div>

            {scheduleForm.rule_type === "daily" ? (
              <div className="rounded-2xl border border-border/40 bg-muted/30 p-4 text-sm text-gray-600">
                Daily schedule selected. No extra rules needed.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {scheduleForm.rule_type === "monthly" && (
                    <Select
                      value={
                        ruleDraft.rule_type === "weekly"
                          ? "monthly_day"
                          : ruleDraft.rule_type
                      }
                      onValueChange={(value) =>
                        setRuleDraft((prev) => ({
                          ...prev,
                          rule_type: value as OperatingRuleDraft["rule_type"],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Monthly rule" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly_day">
                          Monthly (day of month)
                        </SelectItem>
                        <SelectItem value="monthly_nth_weekday">
                          Monthly (nth weekday)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {scheduleForm.rule_type === "weekly" && (
                    <Select
                      value={String(ruleDraft.weekday ?? 1)}
                      onValueChange={(value) =>
                        setRuleDraft((prev) => ({
                          ...prev,
                          rule_type: "weekly",
                          weekday: Number(value),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose weekday" />
                      </SelectTrigger>
                      <SelectContent>
                        {weekdays.map((day) => (
                          <SelectItem key={day.value} value={String(day.value)}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {scheduleForm.rule_type === "monthly" &&
                    ruleDraft.rule_type === "monthly_day" && (
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={ruleDraft.month_day ?? 1}
                        onChange={(e) =>
                          setRuleDraft((prev) => ({
                            ...prev,
                            month_day: Number(e.target.value),
                          }))
                        }
                        placeholder="Day of month"
                      />
                    )}

                  {scheduleForm.rule_type === "monthly" &&
                    ruleDraft.rule_type === "monthly_nth_weekday" && (
                      <>
                        <Select
                          value={String(ruleDraft.nth ?? 1)}
                          onValueChange={(value) =>
                            setRuleDraft((prev) => ({
                              ...prev,
                              nth: Number(value),
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Nth" />
                          </SelectTrigger>
                          <SelectContent>
                            {nthOptions.map((opt) => (
                              <SelectItem
                                key={opt.value}
                                value={String(opt.value)}
                              >
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={String(ruleDraft.weekday ?? 1)}
                          onValueChange={(value) =>
                            setRuleDraft((prev) => ({
                              ...prev,
                              weekday: Number(value),
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Weekday" />
                          </SelectTrigger>
                          <SelectContent>
                            {weekdays.map((day) => (
                              <SelectItem
                                key={day.value}
                                value={String(day.value)}
                              >
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}

                  <Input
                    type="time"
                    value={ruleDraft.start_time ?? ""}
                    onChange={(e) =>
                      setRuleDraft((prev) => ({
                        ...prev,
                        start_time: e.target.value,
                      }))
                    }
                    placeholder="Start time"
                  />
                  <Input
                    type="time"
                    value={ruleDraft.end_time ?? ""}
                    onChange={(e) =>
                      setRuleDraft((prev) => ({
                        ...prev,
                        end_time: e.target.value,
                      }))
                    }
                    placeholder="End time"
                  />
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setScheduleRules((prev) => [
                        ...prev,
                        {
                          ...ruleDraft,
                          id: crypto.randomUUID(),
                        },
                      ])
                    }
                  >
                    Add Rule
                  </Button>
                </div>

                {scheduleRules.length > 0 ? (
                  <div className="space-y-2">
                    {scheduleRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between rounded-2xl border border-border/40 bg-background p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatRuleSummary(rule)}
                          </p>
                          {(rule.start_time || rule.end_time) && (
                            <p className="text-xs text-gray-500">
                              {rule.start_time || "--"} -{" "}
                              {rule.end_time || "--"}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setScheduleRules((prev) =>
                              prev.filter((item) => item.id !== rule.id),
                            )
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No rules added.</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h5 className="text-sm font-semibold text-gray-900">
                Exceptions (closed or special open days)
              </h5>
              <p className="text-xs text-gray-500">
                Add closed dates for holidays or mark special open days.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                type="date"
                value={exceptionDraft.date}
                onChange={(e) =>
                  setExceptionDraft((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
              />
              <Input
                value={exceptionDraft.reason ?? ""}
                onChange={(e) =>
                  setExceptionDraft((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                placeholder="Reason (holiday, maintenance)"
              />
              <Input
                type="time"
                value={exceptionDraft.start_time ?? ""}
                onChange={(e) =>
                  setExceptionDraft((prev) => ({
                    ...prev,
                    start_time: e.target.value,
                  }))
                }
              />
              <Input
                type="time"
                value={exceptionDraft.end_time ?? ""}
                onChange={(e) =>
                  setExceptionDraft((prev) => ({
                    ...prev,
                    end_time: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-muted/40 p-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Open on this date
                </p>
                <p className="text-sm text-gray-600">
                  Turn on to create a special open day.
                </p>
              </div>
              <Switch
                checked={exceptionDraft.is_open}
                onCheckedChange={(checked) =>
                  setExceptionDraft((prev) => ({
                    ...prev,
                    is_open: checked,
                  }))
                }
              />
            </div>

            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!exceptionDraft.date) return;
                  setScheduleExceptions((prev) => [
                    ...prev,
                    { ...exceptionDraft, id: crypto.randomUUID() },
                  ]);
                  setExceptionDraft({
                    id: "",
                    date: "",
                    is_open: false,
                    start_time: "",
                    end_time: "",
                    reason: "",
                  });
                }}
              >
                Add Exception
              </Button>
            </div>

            {scheduleExceptions.length > 0 ? (
              <div className="space-y-2">
                {scheduleExceptions.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between rounded-2xl border border-border/40 bg-background p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {ex.date} {ex.is_open ? "Open" : "Closed"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {ex.start_time || "--"} - {ex.end_time || "--"}
                        {ex.reason ? ` - ${ex.reason}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setScheduleExceptions((prev) =>
                          prev.filter((item) => item.id !== ex.id),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No exceptions added.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
