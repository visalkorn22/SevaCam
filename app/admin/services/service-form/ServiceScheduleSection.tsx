import type React from "react";
import { Switch } from "@/components/ui/switch";
import type {
  OperatingExceptionDraft,
  OperatingRuleDraft,
  OperatingScheduleDraft,
} from "./types";
import { nthOptions, weekdays } from "./types";

type ServiceScheduleSectionProps = {
  sectionCardClass: string;
  inputCompactClass: string;
  pillButtonClass: string;
  scheduleEnabled: boolean;
  setScheduleEnabled: (value: boolean) => void;
  scheduleForm: OperatingScheduleDraft;
  setScheduleForm: React.Dispatch<React.SetStateAction<OperatingScheduleDraft>>;
  ruleDraft: OperatingRuleDraft;
  setRuleDraft: React.Dispatch<React.SetStateAction<OperatingRuleDraft>>;
  scheduleRules: OperatingRuleDraft[];
  setScheduleRules: React.Dispatch<React.SetStateAction<OperatingRuleDraft[]>>;
  exceptionDraft: OperatingExceptionDraft;
  setExceptionDraft: React.Dispatch<
    React.SetStateAction<OperatingExceptionDraft>
  >;
  scheduleExceptions: OperatingExceptionDraft[];
  setScheduleExceptions: React.Dispatch<
    React.SetStateAction<OperatingExceptionDraft[]>
  >;
};

export function ServiceScheduleSection({
  sectionCardClass,
  inputCompactClass,
  pillButtonClass,
  scheduleEnabled,
  setScheduleEnabled,
  scheduleForm,
  setScheduleForm,
  ruleDraft,
  setRuleDraft,
  scheduleRules,
  setScheduleRules,
  exceptionDraft,
  setExceptionDraft,
  scheduleExceptions,
  setScheduleExceptions,
}: ServiceScheduleSectionProps) {
  return (
    <div className={sectionCardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-lg font-bold text-foreground">
            Service Operating Schedule
          </h4>
          <p className="text-xs font-medium text-muted-foreground">
            Define when this service is open before saving.
          </p>
        </div>
        <Switch
          checked={scheduleEnabled}
          onCheckedChange={setScheduleEnabled}
        />
      </div>

      {scheduleEnabled && (
        <div className="mt-6 space-y-6">
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
                placeholder="e.g. Asia/Phnom_Penh"
                className={inputCompactClass}
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
                      .value as OperatingScheduleDraft["rule_type"],
                  }))
                }
                className={inputCompactClass}
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
                className={inputCompactClass}
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
                className={inputCompactClass}
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
                className={inputCompactClass}
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
                className={inputCompactClass}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Schedule Active</p>
              <p className="text-xs text-muted-foreground">
                Enable or disable this schedule.
              </p>
            </div>
            <Switch
              checked={scheduleForm.is_active}
              onCheckedChange={(checked) =>
                setScheduleForm((prev) => ({
                  ...prev,
                  is_active: checked,
                }))
              }
            />
          </div>

          <div className="space-y-3">
            <h5 className="text-sm font-semibold text-foreground">Rules</h5>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={ruleDraft.rule_type}
                onChange={(event) =>
                  setRuleDraft((prev) => ({
                    ...prev,
                    rule_type: event.target
                      .value as OperatingRuleDraft["rule_type"],
                  }))
                }
                className="rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground"
              >
                <option value="weekly">Weekly (weekday)</option>
                <option value="monthly_day">Monthly (day of month)</option>
                <option value="monthly_nth_weekday">
                  Monthly (nth weekday)
                </option>
              </select>

              {ruleDraft.rule_type === "weekly" && (
                <select
                  value={ruleDraft.weekday}
                  onChange={(event) =>
                    setRuleDraft((prev) => ({
                      ...prev,
                      weekday: Number(event.target.value),
                    }))
                  }
                  className="rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground"
                >
                  {weekdays.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              )}

              {ruleDraft.rule_type === "monthly_day" && (
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={ruleDraft.month_day}
                  onChange={(event) =>
                    setRuleDraft((prev) => ({
                      ...prev,
                      month_day: Number(event.target.value),
                    }))
                  }
                  className="rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground"
                  placeholder="Day of month"
                />
              )}

              {ruleDraft.rule_type === "monthly_nth_weekday" && (
                <div className="flex gap-2">
                  <select
                    value={ruleDraft.nth}
                    onChange={(event) =>
                      setRuleDraft((prev) => ({
                        ...prev,
                        nth: Number(event.target.value),
                      }))
                    }
                    className="flex-1 rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground"
                  >
                    {nthOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={ruleDraft.weekday}
                    onChange={(event) =>
                      setRuleDraft((prev) => ({
                        ...prev,
                        weekday: Number(event.target.value),
                      }))
                    }
                    className="flex-1 rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground"
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
                value={ruleDraft.start_time ?? ""}
                onChange={(event) =>
                  setRuleDraft((prev) => ({
                    ...prev,
                    start_time: event.target.value,
                  }))
                }
                className="rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground"
              />
              <input
                type="time"
                value={ruleDraft.end_time ?? ""}
                onChange={(event) =>
                  setRuleDraft((prev) => ({
                    ...prev,
                    end_time: event.target.value,
                  }))
                }
                className="rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setScheduleRules((prev) => [
                  ...prev,
                  {
                    ...ruleDraft,
                    id: crypto.randomUUID(),
                  },
                ]);
              }}
              className={pillButtonClass}
            >
              Add Rule
            </button>

            {scheduleRules.length > 0 ? (
              <div className="space-y-2">
                {scheduleRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between rounded-2xl border border-border px-4 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {rule.rule_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {rule.start_time || "--"} - {rule.end_time || "--"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setScheduleRules((prev) =>
                          prev.filter((item) => item.id !== rule.id),
                        )
                      }
                      className="text-xs font-semibold text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No rules added.</p>
            )}
          </div>

          <div className="space-y-3">
            <h5 className="text-sm font-semibold text-foreground">
              Exceptions
            </h5>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="date"
                value={exceptionDraft.date}
                onChange={(event) =>
                  setExceptionDraft((prev) => ({
                    ...prev,
                    date: event.target.value,
                  }))
                }
                className="rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground"
              />
              <input
                type="text"
                value={exceptionDraft.reason ?? ""}
                onChange={(event) =>
                  setExceptionDraft((prev) => ({
                    ...prev,
                    reason: event.target.value,
                  }))
                }
                placeholder="Reason"
                className="rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground"
              />
              <input
                type="time"
                value={exceptionDraft.start_time ?? ""}
                onChange={(event) =>
                  setExceptionDraft((prev) => ({
                    ...prev,
                    start_time: event.target.value,
                  }))
                }
                className="rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground"
              />
              <input
                type="time"
                value={exceptionDraft.end_time ?? ""}
                onChange={(event) =>
                  setExceptionDraft((prev) => ({
                    ...prev,
                    end_time: event.target.value,
                  }))
                }
                className="rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground"
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Open on this date</p>
                <p className="text-xs text-muted-foreground">
                  Enable for a special open day.
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
            <button
              type="button"
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
              className={pillButtonClass}
            >
              Add Exception
            </button>

            {scheduleExceptions.length > 0 ? (
              <div className="space-y-2">
                {scheduleExceptions.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between rounded-2xl border border-border px-4 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {ex.date} {ex.is_open ? "Open" : "Closed"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ex.start_time || "--"} - {ex.end_time || "--"}
                        {ex.reason ? ` • ${ex.reason}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setScheduleExceptions((prev) =>
                          prev.filter((item) => item.id !== ex.id),
                        )
                      }
                      className="text-xs font-semibold text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No exceptions added.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
