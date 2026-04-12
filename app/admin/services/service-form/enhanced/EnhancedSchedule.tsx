"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
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
import { CalendarClock, CalendarRange, Clock3, Globe2, Sparkles } from "lucide-react";
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
  "mb-2 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-disabled)]";
const fieldInput =
  "h-11 rounded-[0.8rem] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.03)] text-white placeholder:text-[var(--text-disabled)] focus-visible:border-[var(--accent-primary)] focus-visible:bg-[var(--bg-elevated)] focus-visible:ring-1 focus-visible:ring-[rgba(122,213,221,0.35)] transition-colors";
const selectTrigger =
  "h-11 rounded-[0.8rem] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.03)] text-white focus-visible:border-[var(--accent-primary)] focus-visible:bg-[var(--bg-elevated)] focus-visible:ring-1 focus-visible:ring-[rgba(122,213,221,0.35)]";
const selectContent =
  "rounded-[0.9rem] border border-[rgba(240,238,235,0.12)] bg-[rgba(28,27,27,0.98)] text-white backdrop-blur-xl shadow-[0_24px_48px_rgba(0,0,0,0.45)]";
const selectItem =
  "seva-select-item min-h-10 rounded-[0.6rem] text-white data-[highlighted]:!bg-[rgba(255,255,255,0.06)] data-[highlighted]:!text-white data-[state=checked]:!bg-[rgba(122,213,221,0.18)] data-[state=checked]:!text-white [&_svg]:text-white";
const panelShell =
  "rounded-[1rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-[0_18px_40px_rgba(0,0,0,0.24)]";
const insetShell =
  "rounded-[0.9rem] border border-white/6 bg-[var(--bg-inset)]";
const ghostAction =
  "inline-flex items-center rounded-[0.65rem] border border-[rgba(255,183,133,0.22)] bg-[rgba(255,183,133,0.08)] px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#ffb785] transition hover:border-[rgba(255,183,133,0.34)] hover:bg-[rgba(255,183,133,0.12)]";

function SectionHeader({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(122,213,221,0.12)] text-[var(--accent-primary)]">
        {icon}
      </span>
      <div className="space-y-1">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent-primary)]">
          {eyebrow}
        </p>
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function ScheduleRow({
  title,
  subtitle,
  onRemove,
}: {
  title: string;
  subtitle: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-[0.8rem] border border-white/6 bg-[rgba(255,255,255,0.03)] px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-disabled)]">{subtitle}</p>
      </div>
      <button type="button" onClick={onRemove} className={ghostAction}>
        Remove
      </button>
    </div>
  );
}

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
      return `${day?.label ?? "Weekday"} · weekly cadence`;
    }
    if (rule.rule_type === "monthly_day") {
      return `Day ${rule.month_day ?? "--"} · monthly cadence`;
    }
    const nthLabel = nthOptions.find((opt) => opt.value === rule.nth)?.label;
    const day = weekdays.find((d) => d.value === rule.weekday);
    return `${nthLabel ?? rule.nth} ${day?.label ?? "weekday"} · monthly cadence`;
  };

  const ruleSubtitle = (rule: OperatingRuleDraft) =>
    `${rule.start_time || "--"} - ${rule.end_time || "--"}`;

  const exceptionSubtitle = (exception: OperatingExceptionDraft) =>
    `${exception.start_time || "--"} - ${exception.end_time || "--"}${
      exception.reason ? ` · ${exception.reason}` : ""
    }`;

  return (
    <div className="space-y-6">
      <div className={`${panelShell} p-5`}>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent-primary)]">
              Operating Schedule
            </p>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Define when this service can be booked
            </h3>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              Set the default window first, then add recurring rules and one-off
              exceptions only if you need more control.
            </p>
          </div>
          <div className={`${insetShell} flex items-center gap-3 px-4 py-3`}>
            <div className="text-right">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-disabled)]">
                Schedule
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                {scheduleEnabled ? "Enabled" : "Optional"}
              </p>
            </div>
            <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
          </div>
        </div>
      </div>

      {!scheduleEnabled ? (
        <div className={`${insetShell} px-5 py-4`}>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            Leave this off if the team will configure availability later. The
            service can still be created now and refined from the edit screen.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className={`${panelShell} p-5`}>
            <SectionHeader
              icon={<Globe2 className="h-4 w-4" />}
              eyebrow="Baseline Window"
              title="Default availability"
              description="Choose the timezone, cadence, and opening window customers should see first."
            />

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className={fieldLabel}>Service Timezone</label>
                <Input
                  value={scheduleForm.timezone}
                  onChange={(e) =>
                    setScheduleForm((p) => ({ ...p, timezone: e.target.value }))
                  }
                  placeholder="Asia/Phnom_Penh"
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
                  <SelectTrigger className={selectTrigger}>
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

            <div className={`mt-5 ${insetShell} flex items-center justify-between gap-4 px-4 py-4`}>
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-disabled)]">
                  Schedule Status
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {scheduleForm.is_active ? "Live for booking" : "Temporarily closed"}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Turn this off if the service should remain hidden from booking even
                  when rules exist.
                </p>
              </div>
              <Switch
                checked={scheduleForm.is_active}
                onCheckedChange={(checked) =>
                  setScheduleForm((p) => ({ ...p, is_active: checked }))
                }
              />
            </div>
          </section>

          <section className={`${panelShell} p-5`}>
            <SectionHeader
              icon={<CalendarClock className="h-4 w-4" />}
              eyebrow="Recurring Rules"
              title="Fine-tune weekly or monthly patterns"
              description="Use this only when the default window above is not enough."
            />

            {scheduleForm.rule_type === "daily" ? (
              <div className={`mt-5 ${insetShell} px-4 py-4`}>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  Daily mode is active, so no recurring rules are needed. Customers
                  will book within the default opening hours above.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className={`${insetShell} p-4`}>
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
                        <SelectTrigger className={selectTrigger}>
                          <SelectValue placeholder="Monthly rule" />
                        </SelectTrigger>
                        <SelectContent className={selectContent}>
                          <SelectItem value="monthly_day" className={selectItem}>
                            Monthly by day
                          </SelectItem>
                          <SelectItem
                            value="monthly_nth_weekday"
                            className={selectItem}
                          >
                            Monthly by nth weekday
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
                        <SelectTrigger className={selectTrigger}>
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
                            <SelectTrigger className={selectTrigger}>
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
                            <SelectTrigger className={selectTrigger}>
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

                  <div className="mt-4">
                    <Button
                      type="button"
                      onClick={() =>
                        setScheduleRules((p) => [
                          ...p,
                          { ...ruleDraft, id: crypto.randomUUID() },
                        ])
                      }
                      className="sevacam-secondary-button h-10 rounded-[0.35rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.16em]"
                    >
                      Add Rule
                    </Button>
                  </div>
                </div>

                {scheduleRules.length > 0 ? (
                  <div className="space-y-2">
                    {scheduleRules.map((rule) => (
                      <ScheduleRow
                        key={rule.id}
                        title={formatRuleSummary(rule)}
                        subtitle={ruleSubtitle(rule)}
                        onRemove={() =>
                          setScheduleRules((p) => p.filter((r) => r.id !== rule.id))
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className={`${insetShell} px-4 py-4`}>
                    <p className="text-sm text-[var(--text-secondary)]">
                      No recurring rules added yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className={`${panelShell} p-5`}>
            <SectionHeader
              icon={<CalendarRange className="h-4 w-4" />}
              eyebrow="Exceptions"
              title="Override one-off dates"
              description="Close the service for holidays or create special open windows outside the normal rhythm."
            />

            <div className={`mt-5 ${insetShell} p-4`}>
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

              <div className={`mt-4 ${insetShell} flex items-center justify-between gap-4 px-4 py-4`}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,183,133,0.12)] text-[#ffb785]">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      Open on this date
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                      Turn this on for a special opening. Leave it off to mark the
                      date as closed.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={exceptionDraft.is_open}
                  onCheckedChange={(checked) =>
                    setExceptionDraft((p) => ({ ...p, is_open: checked }))
                  }
                />
              </div>

              <div className="mt-4">
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
                  className="sevacam-secondary-button h-10 rounded-[0.35rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.16em]"
                >
                  Add Exception
                </Button>
              </div>
            </div>

            <div className="mt-4">
              {scheduleExceptions.length > 0 ? (
                <div className="space-y-2">
                  {scheduleExceptions.map((ex) => (
                    <ScheduleRow
                      key={ex.id}
                      title={`${ex.date} · ${ex.is_open ? "Open" : "Closed"}`}
                      subtitle={exceptionSubtitle(ex)}
                      onRemove={() =>
                        setScheduleExceptions((p) => p.filter((e) => e.id !== ex.id))
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className={`${insetShell} px-4 py-4`}>
                  <p className="text-sm text-[var(--text-secondary)]">
                    No one-off exceptions added yet.
                  </p>
                </div>
              )}
            </div>
          </section>

          <div className={`${insetShell} flex items-start gap-3 px-4 py-4`}>
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(122,213,221,0.12)] text-[var(--accent-primary)]">
              <Clock3 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Scheduling tip
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Keep the default window broad, then add only the recurring rules and
                exceptions the team actually needs. That keeps future edits faster
                and easier to audit.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
