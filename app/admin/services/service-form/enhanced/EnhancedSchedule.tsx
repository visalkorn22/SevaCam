"use client";

import type { Dispatch, SetStateAction } from "react";
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

const fieldLabel =
  "mb-2 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)";
const fieldInput =
  "h-10 rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:border-(--accent-primary) focus-visible:ring-1 focus-visible:ring-(--accent-primary) transition-colors";
const selectContent =
  "rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-elevated) text-(--text-primary) shadow-[0_20px_40px_rgba(0,0,0,0.4)]";
const selectItem =
  "text-(--text-primary) data-[highlighted]:!bg-(--bg-inset) data-[highlighted]:!text-(--text-primary) data-[state=checked]:!bg-[rgba(122,213,221,0.12)] data-[state=checked]:!text-(--accent-primary)";

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
      const day = weekdays.find((d) => d.value === rule.weekday);
      return `${day?.label ?? "Weekday"} (weekly)`;
    }
    if (rule.rule_type === "monthly_day") {
      return `Day ${rule.month_day ?? "--"} (monthly)`;
    }
    const nthLabel = nthOptions.find((opt) => opt.value === rule.nth)?.label;
    const day = weekdays.find((d) => d.value === rule.weekday);
    return `${nthLabel ?? rule.nth} ${day?.label ?? "weekday"} (monthly)`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-[0.75rem] border border-(--border-subtle) bg-(--bg-inset) p-4">
        <div>
          <p className="text-sm font-semibold text-(--text-primary)">
            Enable Operating Schedule
          </p>
          <p className="text-xs text-(--text-secondary)">
            Optional: define availability, closed days, and special opens.
          </p>
        </div>
        <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
      </div>

      {!scheduleEnabled ? (
        <p className="text-xs text-(--text-disabled)">
          You can skip this and configure schedules later from the service edit
          screen.
        </p>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={fieldLabel}>Service Timezone</label>
              <Input
                value={scheduleForm.timezone}
                onChange={(e) =>
                  setScheduleForm((p) => ({ ...p, timezone: e.target.value }))
                }
                placeholder="e.g. Asia/Phnom_Penh"
                className={fieldInput}
              />
            </div>
            <div>
              <label className={fieldLabel}>Open Days</label>
              <Select
                value={scheduleForm.rule_type}
                onValueChange={(v) =>
                  setScheduleForm((p) => ({
                    ...p,
                    rule_type: v as OperatingScheduleDraft["rule_type"],
                  }))
                }
              >
                <SelectTrigger className={fieldInput}>
                  <SelectValue placeholder="Select schedule type" />
                </SelectTrigger>
                <SelectContent className={selectContent}>
                  <SelectItem value="daily" className={selectItem}>
                    Every day
                  </SelectItem>
                  <SelectItem value="weekly" className={selectItem}>
                    Only some days per week
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
                onChange={(e) =>
                  setScheduleForm((p) => ({ ...p, open_time: e.target.value }))
                }
                className={fieldInput}
              />
            </div>
            <div>
              <label className={fieldLabel}>Close Time</label>
              <Input
                type="time"
                value={scheduleForm.close_time ?? ""}
                onChange={(e) =>
                  setScheduleForm((p) => ({ ...p, close_time: e.target.value }))
                }
                className={fieldInput}
              />
            </div>
            <div>
              <label className={fieldLabel}>Effective From</label>
              <Input
                type="date"
                value={scheduleForm.effective_from ?? ""}
                onChange={(e) =>
                  setScheduleForm((p) => ({
                    ...p,
                    effective_from: e.target.value,
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
                onChange={(e) =>
                  setScheduleForm((p) => ({
                    ...p,
                    effective_to: e.target.value,
                  }))
                }
                className={fieldInput}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-[0.75rem] border border-(--border-subtle) bg-(--bg-inset) p-4">
            <div>
              <p className="text-sm font-semibold text-(--text-primary)">
                Schedule Active
              </p>
              <p className="text-xs text-(--text-secondary)">
                Turn off to temporarily close this service.
              </p>
            </div>
            <Switch
              checked={scheduleForm.is_active}
              onCheckedChange={(checked) =>
                setScheduleForm((p) => ({ ...p, is_active: checked }))
              }
            />
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)">
                Rules (days to open)
              </p>
              <p className="text-xs text-(--text-secondary)">
                Use rules for weekly or monthly schedules. Daily schedules use
                the default hours above.
              </p>
            </div>

            {scheduleForm.rule_type === "daily" ? (
              <div className="rounded-[0.75rem] border border-(--border-subtle) bg-(--bg-inset) p-4 text-sm text-(--text-secondary)">
                Daily schedule selected - no extra rules needed.
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
                      onValueChange={(v) =>
                        setRuleDraft((p) => ({
                          ...p,
                          rule_type: v as OperatingRuleDraft["rule_type"],
                        }))
                      }
                    >
                      <SelectTrigger className={fieldInput}>
                        <SelectValue placeholder="Monthly rule" />
                      </SelectTrigger>
                      <SelectContent className={selectContent}>
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
                  )}

                  {scheduleForm.rule_type === "weekly" && (
                    <Select
                      value={String(ruleDraft.weekday ?? 1)}
                      onValueChange={(v) =>
                        setRuleDraft((p) => ({
                          ...p,
                          rule_type: "weekly",
                          weekday: Number(v),
                        }))
                      }
                    >
                      <SelectTrigger className={fieldInput}>
                        <SelectValue placeholder="Choose weekday" />
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
                  )}

                  {scheduleForm.rule_type === "monthly" &&
                    ruleDraft.rule_type === "monthly_day" && (
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={ruleDraft.month_day ?? 1}
                        onChange={(e) =>
                          setRuleDraft((p) => ({
                            ...p,
                            month_day: Number(e.target.value),
                          }))
                        }
                        placeholder="Day of month"
                        className={fieldInput}
                      />
                    )}

                  {scheduleForm.rule_type === "monthly" &&
                    ruleDraft.rule_type === "monthly_nth_weekday" && (
                      <>
                        <Select
                          value={String(ruleDraft.nth ?? 1)}
                          onValueChange={(v) =>
                            setRuleDraft((p) => ({ ...p, nth: Number(v) }))
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
                        <Select
                          value={String(ruleDraft.weekday ?? 1)}
                          onValueChange={(v) =>
                            setRuleDraft((p) => ({
                              ...p,
                              weekday: Number(v),
                            }))
                          }
                        >
                          <SelectTrigger className={fieldInput}>
                            <SelectValue placeholder="Weekday" />
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
                      </>
                    )}

                  <Input
                    type="time"
                    value={ruleDraft.start_time ?? ""}
                    onChange={(e) =>
                      setRuleDraft((p) => ({
                        ...p,
                        start_time: e.target.value,
                      }))
                    }
                    placeholder="Start time"
                    className={fieldInput}
                  />
                  <Input
                    type="time"
                    value={ruleDraft.end_time ?? ""}
                    onChange={(e) =>
                      setRuleDraft((p) => ({
                        ...p,
                        end_time: e.target.value,
                      }))
                    }
                    placeholder="End time"
                    className={fieldInput}
                  />
                </div>

                <Button
                  type="button"
                  onClick={() =>
                    setScheduleRules((p) => [
                      ...p,
                      { ...ruleDraft, id: crypto.randomUUID() },
                    ])
                  }
                  className="sevacam-secondary-button h-9 rounded-[0.22rem] px-5 text-[0.6rem] font-semibold uppercase tracking-[0.16em]"
                >
                  Add Rule
                </Button>

                {scheduleRules.length > 0 ? (
                  <div className="space-y-2">
                    {scheduleRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between rounded-[0.65rem] border border-(--border-subtle) bg-(--bg-inset) px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-(--text-primary)">
                            {formatRuleSummary(rule)}
                          </p>
                          {(rule.start_time || rule.end_time) && (
                            <p className="text-xs text-(--text-disabled)">
                              {rule.start_time || "--"} - {rule.end_time || "--"}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setScheduleRules((p) =>
                              p.filter((r) => r.id !== rule.id),
                            )
                          }
                          className="text-xs text-(--text-disabled) transition hover:text-[#ffb785]"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-(--text-disabled)">No rules added.</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)">
                Exceptions
              </p>
              <p className="text-xs text-(--text-secondary)">
                Add closed dates for holidays or mark special open days.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                type="date"
                value={exceptionDraft.date}
                onChange={(e) =>
                  setExceptionDraft((p) => ({ ...p, date: e.target.value }))
                }
                className={fieldInput}
              />
              <Input
                value={exceptionDraft.reason ?? ""}
                onChange={(e) =>
                  setExceptionDraft((p) => ({ ...p, reason: e.target.value }))
                }
                placeholder="Reason (holiday, maintenance)"
                className={fieldInput}
              />
              <Input
                type="time"
                value={exceptionDraft.start_time ?? ""}
                onChange={(e) =>
                  setExceptionDraft((p) => ({
                    ...p,
                    start_time: e.target.value,
                  }))
                }
                className={fieldInput}
              />
              <Input
                type="time"
                value={exceptionDraft.end_time ?? ""}
                onChange={(e) =>
                  setExceptionDraft((p) => ({
                    ...p,
                    end_time: e.target.value,
                  }))
                }
                className={fieldInput}
              />
            </div>

            <div className="flex items-center justify-between rounded-[0.75rem] border border-(--border-subtle) bg-(--bg-inset) p-4">
              <div>
                <p className="text-sm font-semibold text-(--text-primary)">
                  Open on this date
                </p>
                <p className="text-xs text-(--text-secondary)">
                  Turn on to create a special open day.
                </p>
              </div>
              <Switch
                checked={exceptionDraft.is_open}
                onCheckedChange={(checked) =>
                  setExceptionDraft((p) => ({ ...p, is_open: checked }))
                }
              />
            </div>

            <Button
              type="button"
              onClick={() => {
                if (!exceptionDraft.date) return;
                setScheduleExceptions((p) => [
                  ...p,
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
              className="sevacam-secondary-button h-9 rounded-[0.22rem] px-5 text-[0.6rem] font-semibold uppercase tracking-[0.16em]"
            >
              Add Exception
            </Button>

            {scheduleExceptions.length > 0 ? (
              <div className="space-y-2">
                {scheduleExceptions.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between rounded-[0.65rem] border border-(--border-subtle) bg-(--bg-inset) px-4 py-3"
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
                      onClick={() =>
                        setScheduleExceptions((p) =>
                          p.filter((e) => e.id !== ex.id),
                        )
                      }
                      className="text-xs text-(--text-disabled) transition hover:text-[#ffb785]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-(--text-disabled)">
                No exceptions added.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
