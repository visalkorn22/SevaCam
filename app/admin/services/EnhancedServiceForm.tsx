"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Camera,
  DollarSign,
  FileText,
  Settings,
  Calendar,
  Users,
} from "lucide-react";
import type {
  OperatingExceptionDraft,
  OperatingRuleDraft,
  OperatingScheduleDraft,
} from "./service-form/types";
import type {
  ServiceFormData,
  UpdateServiceField,
} from "./service-form/enhanced/types";
import EnhancedBasicInformation from "./service-form/enhanced/EnhancedBasicInformation";
import EnhancedPricingDuration from "./service-form/enhanced/EnhancedPricingDuration";
import EnhancedServiceMedia from "./service-form/enhanced/EnhancedServiceMedia";
import EnhancedPromotion from "./service-form/enhanced/EnhancedPromotion";
import EnhancedSchedule from "./service-form/enhanced/EnhancedSchedule";
import EnhancedStaffAssignments from "./service-form/enhanced/EnhancedStaffAssignments";

type EnhancedServiceFormProps = {
  mode: "create" | "edit";
  serviceId?: string;
  initialValues?: any;
  onPreviewUpdate?: (data: any) => void;
  staffOptions?: Array<{
    id: string;
    full_name: string | null;
    role: "staff" | "admin" | "superadmin" | "customer";
    is_active: boolean;
  }>;
  assignedStaff?: Array<{
    id: string;
    full_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    role: string;
    assignment_id: string;
  }>;
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

export default function EnhancedServiceForm({
  mode,
  serviceId,
  initialValues,
  onPreviewUpdate,
  staffOptions = [],
  assignedStaff = [],
}: EnhancedServiceFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const initialTags = Array.isArray(initialValues?.tags)
    ? initialValues.tags.join(", ")
    : (initialValues?.tags ?? "");
  const initialImages = Array.isArray(initialValues?.image_urls)
    ? initialValues.image_urls
    : [];

  const [formData, setFormData] = useState<ServiceFormData>({
    name: initialValues?.name || "",
    description: initialValues?.description || "",
    category: initialValues?.category || "WELLNESS",
    duration_minutes: initialValues?.duration_minutes || 60,
    price: initialValues?.price || 149,
    deposit_amount: initialValues?.deposit_amount || 0,
    max_capacity: initialValues?.max_capacity || 1,
    buffer_minutes: initialValues?.buffer_minutes || 15,
    image_url: initialValues?.image_url || "",
    image_urls: initialImages,
    is_active: initialValues?.is_active ?? true,
    tags: typeof initialTags === "string" ? initialTags : "",
    inclusions: initialValues?.inclusions || "",
    prep_notes: initialValues?.prep_notes || "",
  });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<OperatingScheduleDraft>({
    timezone: "Asia/Phnom_Penh",
    rule_type: "daily",
    open_time: "",
    close_time: "",
    effective_from: "",
    effective_to: "",
    is_active: true,
  });
  const [scheduleRules, setScheduleRules] = useState<OperatingRuleDraft[]>([]);
  const [scheduleExceptions, setScheduleExceptions] = useState<
    OperatingExceptionDraft[]
  >([]);
  const [ruleDraft, setRuleDraft] = useState<OperatingRuleDraft>({
    id: "",
    rule_type: "weekly",
    weekday: 1,
    month_day: 1,
    nth: 1,
    start_time: "",
    end_time: "",
  });
  const [exceptionDraft, setExceptionDraft] = useState<OperatingExceptionDraft>(
    {
      id: "",
      date: "",
      is_open: false,
      start_time: "",
      end_time: "",
      reason: "",
    },
  );
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(
    () => assignedStaff.map((staff) => staff.id).filter(Boolean),
  );
  const uniqueStaffIds = useMemo(
    () => Array.from(new Set(selectedStaffIds)).filter(Boolean),
    [selectedStaffIds],
  );
  const [staffScheduleTimezone, setStaffScheduleTimezone] = useState(
    "Asia/Phnom_Penh",
  );
  const [staffScheduleBlocks, setStaffScheduleBlocks] = useState<
    Record<string, StaffWorkBlockDraft[]>
  >({});
  const [staffScheduleIds, setStaffScheduleIds] = useState<Record<string, string>>({});
  const [existingStaffWorkBlocks, setExistingStaffWorkBlocks] = useState<
    Record<string, StaffWorkBlockExisting[]>
  >({});
  const [removedWorkBlockIds, setRemovedWorkBlockIds] = useState<string[]>([]);
  const [loadedStaffSchedules, setLoadedStaffSchedules] = useState<
    Record<string, boolean>
  >({});
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleLoadError, setScheduleLoadError] = useState<string | null>(null);

  // Update preview whenever form data changes
  useEffect(() => {
    if (onPreviewUpdate) {
      onPreviewUpdate({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        duration_minutes: formData.duration_minutes,
        price: formData.price,
        image_url: formData.image_url,
        image_urls: formData.image_urls,
        is_active: formData.is_active,
      });
    }
  }, [formData, onPreviewUpdate]);

  useEffect(() => {
    if (
      scheduleForm.rule_type === "weekly" &&
      ruleDraft.rule_type !== "weekly"
    ) {
      setRuleDraft((prev) => ({ ...prev, rule_type: "weekly" }));
    }
    if (
      scheduleForm.rule_type === "monthly" &&
      ruleDraft.rule_type === "weekly"
    ) {
      setRuleDraft((prev) => ({ ...prev, rule_type: "monthly_day" }));
    }
  }, [ruleDraft.rule_type, scheduleForm.rule_type]);

  useEffect(() => {
    if (mode !== "edit") return;

    const staffIdsToLoad = uniqueStaffIds.filter(
      (staffId) => !loadedStaffSchedules[staffId],
    );
    if (staffIdsToLoad.length === 0) return;

    let cancelled = false;

    const loadSchedules = async () => {
      setScheduleLoading(true);
      setScheduleLoadError(null);

      const scheduleIdUpdates: Record<string, string> = {};
      const workBlockUpdates: Record<string, StaffWorkBlockExisting[]> = {};

      try {
        for (const staffId of staffIdsToLoad) {
          const scheduleRes = await fetch(
            `/api/availability/weekly-schedules/${staffId}`,
            { credentials: "include" },
          );
          if (!scheduleRes.ok) {
            continue;
          }

          const schedules = (await scheduleRes.json()) as Array<{
            id: string;
            is_default?: boolean;
          }>;
          const schedule =
            schedules.find((item) => item.is_default) || schedules[0];
          if (!schedule?.id) continue;

          scheduleIdUpdates[staffId] = schedule.id;

          const blocksRes = await fetch(
            `/api/availability/weekly-schedules/${schedule.id}/blocks`,
            { credentials: "include" },
          );
          if (!blocksRes.ok) continue;
          const blocksPayload = (await blocksRes.json()) as {
            work_blocks?: StaffWorkBlockExisting[];
          };
          const blocks = Array.isArray(blocksPayload?.work_blocks)
            ? blocksPayload.work_blocks
            : [];
          workBlockUpdates[staffId] = blocks;
        }
      } catch (err) {
        if (!cancelled) {
          setScheduleLoadError(
            err instanceof Error
              ? err.message
              : "Unable to load staff time blocks",
          );
        }
      } finally {
        if (!cancelled) {
          if (Object.keys(scheduleIdUpdates).length > 0) {
            setStaffScheduleIds((prev) => ({ ...prev, ...scheduleIdUpdates }));
          }
          if (Object.keys(workBlockUpdates).length > 0) {
            setExistingStaffWorkBlocks((prev) => ({
              ...prev,
              ...workBlockUpdates,
            }));
          }
          setLoadedStaffSchedules((prev) => {
            const next = { ...prev };
            staffIdsToLoad.forEach((staffId) => {
              next[staffId] = true;
            });
            return next;
          });
          setScheduleLoading(false);
        }
      }
    };

    loadSchedules();
    return () => {
      cancelled = true;
    };
  }, [mode, uniqueStaffIds, loadedStaffSchedules]);

  const updateField: UpdateServiceField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addImageUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setFormData((prev) => {
      const nextUrls = prev.image_urls.includes(trimmed)
        ? prev.image_urls
        : [...prev.image_urls, trimmed];
      return { ...prev, image_url: trimmed, image_urls: nextUrls };
    });
  };

  const removeImageUrl = (url: string) => {
    setFormData((prev) => {
      const nextUrls = prev.image_urls.filter((img) => img !== url);
      const nextPrimary =
        prev.image_url === url ? (nextUrls[0] ?? "") : prev.image_url;
      return { ...prev, image_urls: nextUrls, image_url: nextPrimary };
    });
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/services/upload-image", {
        method: "POST",
        body: form,
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || "Upload failed");
      }

      if (data?.image_url) {
        addImageUrl(data.image_url as string);
      } else {
        throw new Error("Upload failed to return image URL");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveExistingBlock = (staffId: string, blockId: string) => {
    setExistingStaffWorkBlocks((prev) => ({
      ...prev,
      [staffId]: (prev[staffId] || []).filter((block) => block.id !== blockId),
    }));
    setRemovedWorkBlockIds((prev) =>
      prev.includes(blockId) ? prev : [...prev, blockId],
    );
  };

  const ensureStaffScheduleId = async (staffId: string) => {
    if (staffScheduleIds[staffId]) return staffScheduleIds[staffId];

    let scheduleId: string | null = null;

    const scheduleRes = await fetch(
      `/api/availability/weekly-schedules/${staffId}`,
      { credentials: "include" },
    );
    if (scheduleRes.ok) {
      const schedules = (await scheduleRes.json()) as Array<{
        id: string;
        is_default?: boolean;
      }>;
      const schedule =
        schedules.find((item) => item.is_default) || schedules[0];
      scheduleId = schedule?.id ?? null;
    }

    if (!scheduleId) {
      const createScheduleRes = await fetch(
        "/api/availability/weekly-schedules",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            staff_id: staffId,
            timezone: staffScheduleTimezone || "Asia/Phnom_Penh",
            is_default: true,
          }),
        },
      );
      if (!createScheduleRes.ok) {
        const data = await createScheduleRes.json().catch(() => ({}));
        throw new Error(
          data?.detail ||
            data?.message ||
            "Failed to create staff schedule",
        );
      }
      const createdSchedule = await createScheduleRes
        .json()
        .catch(() => ({}));
      scheduleId = createdSchedule?.id ?? null;
    }

    if (scheduleId) {
      setStaffScheduleIds((prev) => ({ ...prev, [staffId]: scheduleId! }));
    }

    return scheduleId;
  };

  const steps = [
    {
      id: "staff",
      title: "Assign Staff",
      icon: Users,
      description: "Staff availability",
    },
    {
      id: "basic",
      title: "Basic Information",
      icon: FileText,
      description: "Service name, description, and category",
    },
    {
      id: "pricing",
      title: "Pricing & Duration",
      icon: DollarSign,
      description: "Set pricing, duration, and capacity",
    },
    {
      id: "media",
      title: "Service Media",
      icon: Camera,
      description: "Upload images and media",
    },
    ...(mode === "edit"
      ? [
          {
            id: "promotion",
            title: "Promotion",
            icon: Settings,
            description: "Visibility and promotional settings",
          },
        ]
      : []),
    ...(mode === "create"
      ? [
          {
            id: "schedule",
            title: "Operating Schedule",
            icon: Calendar,
            description: "Optional availability and exceptions",
          },
        ]
      : []),
  ];

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);

    try {
      if (uniqueStaffIds.length === 0) {
        const staffIndex = steps.findIndex((step) => step.id === "staff");
        if (staffIndex >= 0) {
          setCurrentStep(staffIndex);
        }
        throw new Error("Select at least 1 staff member before saving.");
      }

      const endpoint =
        mode === "create" ? "/api/services" : `/api/services/${serviceId}`;

      const method = mode === "create" ? "POST" : "PUT";
      const normalizedImages = formData.image_urls.filter(Boolean);
      const normalizedTags = (
        typeof formData.tags === "string" ? formData.tags : ""
      )
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category || null,
        duration_minutes: Number(formData.duration_minutes) || 0,
        price: Number(formData.price) || 0,
        deposit_amount: Number(formData.deposit_amount) || 0,
        max_capacity: Number(formData.max_capacity) || 1,
        buffer_minutes: Number(formData.buffer_minutes) || 0,
        image_urls: normalizedImages.length > 0 ? normalizedImages : null,
        image_url: (normalizedImages[0] ?? formData.image_url.trim()) || null,
        is_active: formData.is_active,
        tags: normalizedTags.length > 0 ? normalizedTags : null,
        inclusions: formData.inclusions.trim() || null,
        prep_notes: formData.prep_notes.trim() || null,
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          responseData?.detail ||
            responseData?.message ||
            "Failed to save service",
        );
      }

      const createdServiceId = responseData?.id ?? serviceId;

      if (mode === "create" && scheduleEnabled && createdServiceId) {
        const scheduleRes = await fetch(
          `/api/services/${createdServiceId}/operating-schedule`,
          {
            method: "POST",
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
          },
        );

        if (!scheduleRes.ok) {
          const scheduleData = await scheduleRes.json().catch(() => ({}));
          throw new Error(
            scheduleData?.detail ||
              scheduleData?.message ||
              "Failed to save schedule",
          );
        }

        const rulesToSave =
          scheduleForm.rule_type === "daily" ? [] : scheduleRules;

        for (const rule of rulesToSave) {
          const ruleRes = await fetch(
            `/api/services/${createdServiceId}/operating-schedule/rules`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                rule_type: rule.rule_type,
                weekday: rule.rule_type === "weekly" ? rule.weekday : null,
                month_day:
                  rule.rule_type === "monthly_day" ? rule.month_day : null,
                nth: rule.rule_type === "monthly_nth_weekday" ? rule.nth : null,
                start_time: rule.start_time || null,
                end_time: rule.end_time || null,
              }),
            },
          );
          if (!ruleRes.ok) {
            const ruleData = await ruleRes.json().catch(() => ({}));
            throw new Error(
              ruleData?.detail ||
                ruleData?.message ||
                "Failed to save schedule rule",
            );
          }
        }

        for (const ex of scheduleExceptions) {
          const exRes = await fetch(
            `/api/services/${createdServiceId}/operating-schedule/exceptions`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                date: ex.date,
                is_open: ex.is_open,
                start_time: ex.start_time || null,
                end_time: ex.end_time || null,
                reason: ex.reason || null,
              }),
            },
          );
          if (!exRes.ok) {
            const exData = await exRes.json().catch(() => ({}));
            throw new Error(
              exData?.detail ||
                exData?.message ||
                "Failed to save schedule exception",
            );
          }
        }
      }

      if (createdServiceId) {
        if (mode === "create" && uniqueStaffIds.length > 0) {
          const assignments = uniqueStaffIds.map(async (staffId) => {
            const res = await fetch("/api/staff/services", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                staff_id: staffId,
                service_id: createdServiceId,
                is_bookable: true,
                is_temporarily_unavailable: false,
                admin_only: false,
              }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              const message =
                data?.detail || data?.message || "Failed to assign staff";
              if (
                res.status === 400 &&
                typeof message === "string" &&
                message.toLowerCase().includes("already exists")
              ) {
                return;
              }
              throw new Error(message);
            }
          });
          await Promise.all(assignments);

          const staffIdsWithBlocks = uniqueStaffIds.filter(
            (staffId) => (staffScheduleBlocks[staffId] || []).length > 0,
          );

          for (const staffId of staffIdsWithBlocks) {
            const blocks = (staffScheduleBlocks[staffId] || []).filter(
              (block) =>
                block.start_time_local &&
                block.end_time_local &&
                block.start_time_local < block.end_time_local,
            );
            if (blocks.length === 0) continue;

            const scheduleId = await ensureStaffScheduleId(staffId);
            if (!scheduleId) {
              throw new Error("Unable to resolve staff schedule.");
            }

            for (const block of blocks) {
              const blockRes = await fetch(
                "/api/availability/weekly-schedules/work-blocks",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    schedule_id: scheduleId,
                    weekday: block.weekday,
                    start_time_local: block.start_time_local,
                    end_time_local: block.end_time_local,
                  }),
                },
              );
              if (!blockRes.ok) {
                const data = await blockRes.json().catch(() => ({}));
                throw new Error(
                  data?.detail ||
                    data?.message ||
                    "Failed to save staff time block",
                );
              }
            }
          }
        }

        if (mode === "edit") {
          const assignedMap = new Map(
            assignedStaff.map((staff) => [staff.id, staff.assignment_id]),
          );
          const toAdd = uniqueStaffIds.filter((id) => !assignedMap.has(id));
          const toRemove = assignedStaff
            .filter((staff) => !uniqueStaffIds.includes(staff.id))
            .map((staff) => staff.assignment_id);

          const addRequests = toAdd.map(async (staffId) => {
            const res = await fetch("/api/staff/services", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                staff_id: staffId,
                service_id: createdServiceId,
                is_bookable: true,
                is_temporarily_unavailable: false,
                admin_only: false,
              }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              const message =
                data?.detail || data?.message || "Failed to assign staff";
              if (
                res.status === 400 &&
                typeof message === "string" &&
                message.toLowerCase().includes("already exists")
              ) {
                return;
              }
              throw new Error(message);
            }
          });

          const removeRequests = toRemove.map(async (assignmentId) => {
            const res = await fetch(`/api/staff/services/${assignmentId}`, {
              method: "DELETE",
              credentials: "include",
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(
                data?.detail || data?.message || "Failed to remove staff",
              );
            }
          });

          await Promise.all([...addRequests, ...removeRequests]);

          if (removedWorkBlockIds.length > 0) {
            const uniqueRemoved = Array.from(new Set(removedWorkBlockIds));
            const deleteRequests = uniqueRemoved.map(async (blockId) => {
              const res = await fetch(
                `/api/availability/weekly-schedules/work-blocks/${blockId}`,
                { method: "DELETE", credentials: "include" },
              );
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(
                  data?.detail ||
                    data?.message ||
                    "Failed to remove time block",
                );
              }
            });
            await Promise.all(deleteRequests);
          }

          const staffIdsWithBlocks = uniqueStaffIds.filter(
            (staffId) => (staffScheduleBlocks[staffId] || []).length > 0,
          );

          for (const staffId of staffIdsWithBlocks) {
            const blocks = (staffScheduleBlocks[staffId] || []).filter(
              (block) =>
                block.start_time_local &&
                block.end_time_local &&
                block.start_time_local < block.end_time_local,
            );
            if (blocks.length === 0) continue;

            const scheduleId = await ensureStaffScheduleId(staffId);
            if (!scheduleId) {
              throw new Error("Unable to resolve staff schedule.");
            }

            for (const block of blocks) {
              const blockRes = await fetch(
                "/api/availability/weekly-schedules/work-blocks",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    schedule_id: scheduleId,
                    weekday: block.weekday,
                    start_time_local: block.start_time_local,
                    end_time_local: block.end_time_local,
                  }),
                },
              );
              if (!blockRes.ok) {
                const data = await blockRes.json().catch(() => ({}));
                throw new Error(
                  data?.detail ||
                    data?.message ||
                    "Failed to save staff time block",
                );
              }
            }
          }
        }
      }

      router.push("/admin/services");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="sevacam-rail overflow-hidden">
      {/* Step navigator */}
      <div className="border-b border-(--border-subtle) bg-(--bg-base) px-6 py-5 sm:px-8">
        <nav aria-label="Progress">
          <ol className="flex flex-wrap items-center gap-1">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <li key={step.id} className="flex items-center">
                  {index > 0 && (
                    <div className={`mx-1 h-px w-6 transition-colors ${isCompleted ? "bg-(--accent-primary)" : "bg-(--border-subtle)"}`} />
                  )}
                  <button
                    type="button"
                    onClick={() => setCurrentStep(index)}
                    className={`group relative flex items-center gap-2.5 rounded-full px-3.5 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] transition-all duration-200 ${
                      isActive
                        ? "bg-(--accent-primary) text-(--text-on-accent) shadow-[0_4px_16px_rgba(122,213,221,0.25)]"
                        : isCompleted
                          ? "bg-(--accent-primary)/15 text-(--accent-primary)"
                          : "bg-(--bg-elevated) text-(--text-secondary) hover:text-(--text-primary)"
                    }`}
                    aria-label={step.title}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">{step.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Current step info */}
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--accent-primary)">
            Step {currentStep + 1} of {steps.length}
          </p>
          <p className="mt-1 text-[0.82rem] text-(--text-secondary)">
            {steps[currentStep]?.description}
          </p>
        </div>
      </div>

      {/* Form Content */}
      <div className="min-h-96 px-6 py-7 sm:px-8">
        {steps[currentStep]?.id === "basic" && (
          <EnhancedBasicInformation
            formData={formData}
            updateField={updateField}
          />
        )}
        {steps[currentStep]?.id === "pricing" && (
          <EnhancedPricingDuration
            formData={formData}
            updateField={updateField}
          />
        )}
        {steps[currentStep]?.id === "media" && (
          <EnhancedServiceMedia
            formData={formData}
            updateField={updateField}
            addImageUrl={addImageUrl}
            removeImageUrl={removeImageUrl}
            handleFileUpload={handleFileUpload}
            isUploading={isUploading}
            uploadError={uploadError}
          />
        )}
        {steps[currentStep]?.id === "promotion" && mode === "edit" && (
          <EnhancedPromotion formData={formData} updateField={updateField} />
        )}
        {steps[currentStep]?.id === "staff" && (
          <EnhancedStaffAssignments
            staffOptions={staffOptions}
            selectedStaffIds={selectedStaffIds}
            setSelectedStaffIds={setSelectedStaffIds}
            enableScheduleAssignment
            scheduleMode={mode}
            scheduleTimezone={staffScheduleTimezone}
            setScheduleTimezone={setStaffScheduleTimezone}
            scheduleBlocksByStaff={staffScheduleBlocks}
            setScheduleBlocksByStaff={setStaffScheduleBlocks}
            existingScheduleBlocksByStaff={existingStaffWorkBlocks}
            onRemoveExistingBlock={handleRemoveExistingBlock}
            scheduleLoading={scheduleLoading}
            scheduleError={scheduleLoadError}
          />
        )}
        {steps[currentStep]?.id === "schedule" && (
          <EnhancedSchedule
            scheduleEnabled={scheduleEnabled}
            setScheduleEnabled={setScheduleEnabled}
            scheduleForm={scheduleForm}
            setScheduleForm={setScheduleForm}
            scheduleRules={scheduleRules}
            setScheduleRules={setScheduleRules}
            scheduleExceptions={scheduleExceptions}
            setScheduleExceptions={setScheduleExceptions}
            ruleDraft={ruleDraft}
            setRuleDraft={setRuleDraft}
            exceptionDraft={exceptionDraft}
            setExceptionDraft={setExceptionDraft}
          />
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mb-2 rounded-[0.75rem] border border-(--state-warning)/20 bg-(--state-warning-subtle) px-4 py-4 sm:mx-8">
          <p className="text-sm text-(--state-warning)">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-(--border-subtle) px-6 py-5 sm:px-8">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="sevacam-secondary-button h-10 rounded-[0.22rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] disabled:opacity-30"
        >
          Previous
        </Button>

        <div className="flex gap-3">
          {mode === "edit" && (
            <Button
              onClick={handleSubmit}
              disabled={isSaving || uniqueStaffIds.length === 0}
              className="sevacam-primary-button h-10 rounded-[0.22rem] px-6 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
            >
              {isSaving ? "Saving..." : "Update Service"}
            </Button>
          )}

          {currentStep < steps.length - 1 ? (
            <Button
              type="button"
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              className="sevacam-primary-button h-10 rounded-[0.22rem] px-6 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
            >
              Next Step
            </Button>
          ) : mode === "create" ? (
            <Button
              onClick={handleSubmit}
              disabled={isSaving || uniqueStaffIds.length === 0}
              className="sevacam-primary-button h-10 rounded-[0.22rem] px-6 text-[0.62rem] font-semibold uppercase tracking-[0.18em] disabled:opacity-40"
            >
              {isSaving ? "Creating..." : "Create Service"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
