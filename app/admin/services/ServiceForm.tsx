"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type {
  OperatingExceptionDraft,
  OperatingRuleDraft,
  OperatingScheduleDraft,
  ServiceFormValues,
  ServiceInitialValues,
} from "./service-form/types";
import {
  ghostDangerClass,
  inputClass,
  inputCompactClass,
  labelClass,
  pillButtonClass,
  primaryPillClass,
  sectionCardClass,
  summaryCardClass,
  surfaceCardClass,
  textareaClass,
} from "./service-form/styles";
import { ServiceFormHeader } from "./service-form/ServiceFormHeader";
import { ServiceImageSection } from "./service-form/ServiceImageSection";
import { ServiceDetailsSection } from "./service-form/ServiceDetailsSection";
import { ServicePricingSection } from "./service-form/ServicePricingSection";
import { ServiceScheduleSection } from "./service-form/ServiceScheduleSection";
import { ServiceReviewSection } from "./service-form/ServiceReviewSection";

type ServiceFormProps = {
  mode: "create" | "edit";
  serviceId?: string;
  initialValues?: ServiceInitialValues;
};

export default function ServiceForm({
  mode,
  serviceId,
  initialValues,
}: ServiceFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const defaults: ServiceFormValues = useMemo(() => {
    const tagsValue = Array.isArray(initialValues?.tags)
      ? initialValues?.tags.join(", ")
      : (initialValues?.tags ?? "");
    const initialImages = Array.isArray(initialValues?.image_urls)
      ? initialValues?.image_urls.filter(Boolean)
      : initialValues?.image_url
        ? [initialValues.image_url]
        : [];

    return {
      name: initialValues?.name ?? "",
      public_name: initialValues?.public_name ?? "",
      internal_name: initialValues?.internal_name ?? "",
      category: initialValues?.category ?? "",
      tags: tagsValue,
      description: initialValues?.description ?? "",
      inclusions: initialValues?.inclusions ?? "",
      prep_notes: initialValues?.prep_notes ?? "",
      image_url: initialImages[0] ?? initialValues?.image_url ?? "",
      image_urls: initialImages,
      duration_minutes: initialValues?.duration_minutes ?? 60,
      price: initialValues?.price ?? 0,
      deposit_amount: initialValues?.deposit_amount ?? 0,
      buffer_minutes: initialValues?.buffer_minutes ?? 0,
      max_capacity: initialValues?.max_capacity ?? 1,
      is_active: initialValues?.is_active ?? true,
    };
  }, [initialValues]);
  const [values, setValues] = useState<ServiceFormValues>(defaults);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<"upload" | "url">(() =>
    initialValues?.image_url ||
    (Array.isArray(initialValues?.image_urls) &&
      initialValues.image_urls.length > 0)
      ? "url"
      : "upload",
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");
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
  const reviewTags = useMemo(
    () =>
      values.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [values.tags],
  );
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number.isFinite(amount) ? amount : 0);
  const primaryImage = values.image_urls[0] ?? values.image_url;

  const handleChange = <K extends keyof ServiceFormValues>(
    key: K,
    value: ServiceFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const updateImages = (nextImages: string[]) => {
    const normalized = nextImages.filter(Boolean);
    setValues((prev) => ({
      ...prev,
      image_urls: normalized,
      image_url: normalized[0] ?? "",
    }));
  };

  const addImages = (urls: string[]) => {
    const next = Array.from(
      new Set([...(values.image_urls ?? []), ...urls.filter(Boolean)]),
    );
    updateImages(next);
  };

  const addImageFromInput = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;
    addImages([trimmed]);
    setImageUrlInput("");
    setImageMode("url");
  };

  const removeImageAt = (index: number) => {
    const next = values.image_urls.filter((_, idx) => idx !== index);
    updateImages(next);
  };

  const submit = async () => {
    setError(null);
    setIsSaving(true);

    const payload = {
      name: values.name.trim(),
      public_name: values.public_name.trim() || null,
      internal_name: values.internal_name.trim() || null,
      category: values.category.trim() || null,
      tags: values.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      description: values.description.trim() || null,
      inclusions: values.inclusions.trim() || null,
      prep_notes: values.prep_notes.trim() || null,
      image_urls: values.image_urls,
      image_url: (values.image_urls[0] ?? values.image_url.trim()) || null,
      duration_minutes: Number(values.duration_minutes),
      price: Number(values.price),
      deposit_amount: Number(values.deposit_amount),
      buffer_minutes: Number(values.buffer_minutes),
      max_capacity: Number(values.max_capacity),
      is_active: values.is_active,
    };

    try {
      const endpoint =
        mode === "create" ? "/api/services" : `/api/services/${serviceId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || data?.message || "Save failed");
      }

      const responseData = await res.json().catch(() => ({}));
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
              "Schedule save failed",
          );
        }

        for (const rule of scheduleRules) {
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
              ruleData?.detail || ruleData?.message || "Rule save failed",
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
              exData?.detail || exData?.message || "Exception save failed",
            );
          }
        }
      }

      router.push("/admin/services");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save service");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  const uploadSingleImage = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/services/upload-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || "Upload failed");
      }

      if (!data?.image_url) {
        throw new Error("Upload failed: missing image URL");
      }
      return data.image_url as string;
    } catch (err) {
      throw err instanceof Error ? err : new Error("Upload failed");
    }
  };

  const handleFilesSelect = async (files?: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setIsUploading(true);
    const uploaded: string[] = [];

    try {
      for (const file of Array.from(files)) {
        try {
          const url = await uploadSingleImage(file);
          uploaded.push(url);
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : "Upload failed");
        }
      }
    } finally {
      if (uploaded.length > 0) {
        addImages(uploaded);
        setImageMode("url");
      }
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const headerTitle =
    mode === "create" ? "Design New Offering" : "Update Service Protocol";
  const submitLabel =
    mode === "create" ? "Initialize Service" : "Commit Update";
  return (
    <div className="overflow-hidden rounded-[2.5rem] border border-border bg-card shadow-2xl">
      <ServiceFormHeader
        title={headerTitle}
        subtitle="Configure precision scheduling and settlement parameters."
      />

      <form onSubmit={handleSubmit} className="space-y-8 p-10">
        <ServiceImageSection
          labelClass={labelClass}
          pillButtonClass={pillButtonClass}
          primaryPillClass={primaryPillClass}
          ghostDangerClass={ghostDangerClass}
          imageMode={imageMode}
          setImageMode={setImageMode}
          fileInputRef={fileInputRef}
          handleFilesSelect={handleFilesSelect}
          primaryImage={primaryImage}
          isUploading={isUploading}
          imageUrlInput={imageUrlInput}
          setImageUrlInput={setImageUrlInput}
          addImageFromInput={addImageFromInput}
          uploadError={uploadError}
          imageUrls={values.image_urls}
          removeImageAt={removeImageAt}
          updateImages={updateImages}
        />

        <ServiceDetailsSection
          values={values}
          onChange={handleChange}
          labelClass={labelClass}
          inputClass={inputClass}
          textareaClass={textareaClass}
        />

        <ServicePricingSection
          values={values}
          onChange={handleChange}
          labelClass={labelClass}
          inputClass={inputClass}
        />

        {mode === "create" && (
          <ServiceScheduleSection
            sectionCardClass={sectionCardClass}
            inputCompactClass={inputCompactClass}
            pillButtonClass={pillButtonClass}
            scheduleEnabled={scheduleEnabled}
            setScheduleEnabled={setScheduleEnabled}
            scheduleForm={scheduleForm}
            setScheduleForm={setScheduleForm}
            ruleDraft={ruleDraft}
            setRuleDraft={setRuleDraft}
            scheduleRules={scheduleRules}
            setScheduleRules={setScheduleRules}
            exceptionDraft={exceptionDraft}
            setExceptionDraft={setExceptionDraft}
            scheduleExceptions={scheduleExceptions}
            setScheduleExceptions={setScheduleExceptions}
          />
        )}

        {mode === "create" && (
          <div className={sectionCardClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-bold text-foreground">
                  Service Review
                </h4>
                <p className="text-xs font-medium text-muted-foreground">
                  Confirm the details before creating this service.
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  values.is_active
                    ? "bg-emerald-500/15 text-emerald-200"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {values.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <ServiceReviewSection
              values={values}
              reviewTags={reviewTags}
              formatMoney={formatMoney}
              surfaceCardClass={surfaceCardClass}
              summaryCardClass={summaryCardClass}
            />
          </div>
        )}

        {error && (
          <p className="text-sm font-semibold text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-4 border-t border-border pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-2xl px-8 py-3.5 text-xs font-black uppercase tracking-widest text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          >
            Discard
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-2xl bg-primary px-10 py-3.5 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-2xl shadow-primary/30 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
          >
            <Save size={18} /> {isSaving ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
