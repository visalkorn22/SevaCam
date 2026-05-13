"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  serviceId: string;
  serviceName?: string;
  variant?: "card" | "list";
  onDeleted?: (serviceId: string) => void;
};

export default function DeleteServiceButton({
  serviceId,
  serviceName,
  variant = "card",
  onDeleted,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!serviceId) return;

    setIsDeleting(true);
    setErrorMessage(null);
    setOpen(true);

    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || data?.message || "Delete failed");
      }

      onDeleted?.(serviceId);
      router.refresh();
      setOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to archive service";
      setErrorMessage(message);
      setOpen(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const trigger =
    variant === "list" ? (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label="Archive service"
        disabled={isDeleting}
        className="h-8 w-8 rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) p-0 text-(--text-secondary) motion-standard motion-press hover:border-[#ffb785]/35 hover:bg-[#ffb785]/10 hover:text-[#ffb785] motion-reduce:transition-none"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    ) : (
      <Button
        type="button"
        variant="outline"
        aria-label="Archive service"
        disabled={isDeleting}
        className="h-10 w-10 shrink-0 rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-inset) p-0 text-(--text-secondary) motion-standard motion-press hover:border-[#ffb785]/35 hover:bg-[#ffb785]/10 hover:text-[#ffb785] motion-reduce:transition-none"
      >
        <Trash2 className="size-4" />
      </Button>
    );

  const titleText = serviceName
    ? `Archive "${serviceName}"?`
    : "Archive this service?";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isDeleting) {
          setOpen(nextOpen);
          if (nextOpen) {
            setErrorMessage(null);
          }
        }
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent
        className="w-[min(92vw,31rem)] rounded-[1.15rem] border border-(--seva-border-subtle) bg-(--seva-surface) p-0 text-(--seva-text) shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
        overlayClassName="bg-black/70 backdrop-blur-md"
      >
        <AlertDialogHeader className="border-b border-(--seva-border-subtle) px-6 pb-5 pt-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] border border-[#ffb785]/20 bg-[#ffb785]/10 text-[#ffb785]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <span className="inline-flex rounded-full border border-[#ffb785]/20 bg-[#ffb785]/8 px-2.5 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-[#ffcfaf]">
                Archive Service
              </span>
              <AlertDialogTitle className="text-[1.1rem] font-semibold tracking-[-0.03em] text-(--seva-text)">
                {titleText}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-6 text-(--seva-text-soft)">
                Customers will no longer see this service in the booking flow.
                You can restore it later by editing it.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-[0.9rem] border border-(--seva-border-subtle) bg-(--seva-elevated) p-4">
            <p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-(--seva-text-muted)">
              Impact
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-(--seva-text-soft)">
                Service:
                <span className="ml-2 font-medium text-(--seva-text)">
                  {serviceName || "Untitled service"}
                </span>
              </p>
              <p className="text-(--seva-text-soft)">
                Archive hides this service from customers immediately.
              </p>
              <p className="text-(--seva-text-soft)">
                Existing records stay intact and the service can be restored later.
              </p>
            </div>
          </div>

          {errorMessage ? (
            <p className="rounded-[0.8rem] border border-[#ffb785]/25 bg-[#ffb785]/8 px-4 py-3 text-sm text-[#ffcfaf]">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <AlertDialogFooter className="border-t border-(--seva-border-subtle) px-6 pb-6 pt-5 sm:justify-between">
          <AlertDialogCancel
            disabled={isDeleting}
            className="mt-0 h-10 rounded-[0.55rem] border border-(--seva-border-subtle) bg-(--seva-elevated) px-4 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--seva-text)! transition-colors hover:border-(--seva-border-interactive) hover:text-(--seva-accent)!"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-10 rounded-[0.55rem] border border-[#ffb785]/28 bg-[#ffb785]/12 px-4 text-[0.62rem] font-semibold uppercase tracking-[0.16em] !text-[#ffe2cf] transition-colors hover:bg-[#ffb785]/18 hover:!text-[#fff0e5]"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? "Archiving..." : "Archive Service"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
