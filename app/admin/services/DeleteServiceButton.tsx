"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
        size="sm"
        variant="outline"
        aria-label="Archive service"
        disabled={isDeleting}
        className="h-9 rounded-[0.45rem] border border-(--border-subtle) bg-(--bg-inset) px-3 text-(--text-secondary) motion-standard motion-press hover:border-[#ffb785]/35 hover:bg-[#ffb785]/10 hover:text-[#ffb785] motion-reduce:transition-none"
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
        className="w-[min(92vw,28rem)] rounded-[1.1rem] border border-(--border-subtle) bg-(--bg-elevated) p-6 shadow-[0_20px_60px_rgba(0,0,0,0.48)]"
        overlayClassName="bg-black/78 backdrop-blur-sm"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{titleText}</AlertDialogTitle>
          <AlertDialogDescription className="leading-6">
            Customers will no longer see this service in the booking flow. You
            can restore it later by editing it.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {errorMessage ? (
          <p className="mt-3 rounded-[0.7rem] border border-[#ffb785]/25 bg-[#ffb785]/10 px-3 py-2 text-sm text-[#ffcfaf]">
            {errorMessage}
          </p>
        ) : null}

        <AlertDialogFooter className="mt-5 gap-2">
          <AlertDialogCancel
            disabled={isDeleting}
            className="!mt-0 !h-10 !rounded-[0.55rem] !border-[var(--border-subtle)] !bg-[var(--bg-inset)] !px-4 !text-[0.62rem] !font-semibold !uppercase !tracking-[0.16em] !text-[var(--text-primary)] hover:!border-[rgba(122,213,221,0.3)] hover:!text-[var(--accent-primary)]"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="!h-10 !rounded-[0.55rem] !border !border-[#ffb785]/30 !bg-[#ffb785]/12 !px-4 !text-[0.62rem] !font-semibold !uppercase !tracking-[0.16em] !text-[#ffcfaf] hover:!bg-[#ffb785]/18"
          >
            {isDeleting ? "Archiving..." : "Archive Service"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
