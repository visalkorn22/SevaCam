"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon, Link, Loader2, Plus, Upload, X } from "lucide-react";
import type { ServiceFormData, UpdateServiceField } from "./types";

type EnhancedServiceMediaProps = {
  formData: ServiceFormData;
  updateField: UpdateServiceField;
  addImageUrl: (url: string) => void;
  removeImageUrl: (url: string) => void;
  handleFileUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  uploadError: string | null;
};

export default function EnhancedServiceMedia({
  formData,
  updateField,
  addImageUrl,
  removeImageUrl,
  handleFileUpload,
  isUploading,
  uploadError,
}: EnhancedServiceMediaProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) =>
      f.type.startsWith("image/"),
    );
    if (file) handleFileUpload(file);
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center gap-4 rounded-[0.85rem] border-2 border-dashed px-6 py-10 text-center transition-colors duration-200 ${
          isDragOver
            ? "border-(--accent-primary) bg-[rgba(122,213,221,0.06)]"
            : "border-(--border-subtle) bg-(--bg-inset) hover:border-[rgba(122,213,221,0.3)]"
        }`}
      >
        <div className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${isDragOver ? "bg-[rgba(122,213,221,0.15)]" : "bg-(--bg-elevated)"}`}>
          {isUploading
            ? <Loader2 className="h-6 w-6 animate-spin text-(--accent-primary)" />
            : <Upload className={`h-6 w-6 ${isDragOver ? "text-(--accent-primary)" : "text-(--text-disabled)"}`} />
          }
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-(--text-primary)">
            {isDragOver ? "Drop to upload" : isUploading ? "Uploading…" : "Drag & drop or browse"}
          </p>
          <p className="text-[0.72rem] text-(--text-disabled)">
            JPG, PNG, GIF — max 10 MB
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="sevacam-primary-button h-9 rounded-[0.22rem] px-5 text-[0.6rem] font-semibold uppercase tracking-[0.16em]"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Choose file
          </Button>
          <Button
            type="button"
            onClick={() => setShowUrlInput((v) => !v)}
            className="sevacam-secondary-button h-9 rounded-[0.22rem] px-5 text-[0.6rem] font-semibold uppercase tracking-[0.16em]"
          >
            <Link className="mr-1.5 h-3.5 w-3.5" />
            Add URL
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={isUploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.currentTarget.value = "";
          }}
        />
      </div>

      {/* URL input */}
      {showUrlInput && (
        <div className="rounded-[0.75rem] border border-(--border-subtle) bg-(--bg-inset) p-4">
          <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)">
            Add Image URL
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/image.jpg"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              className="h-10 flex-1 rounded-[0.55rem] border border-(--border-subtle) bg-(--bg-elevated) text-(--text-primary) placeholder:text-(--text-disabled) focus-visible:ring-1 focus-visible:ring-(--accent-primary)"
            />
            <Button
              type="button"
              onClick={() => {
                if (urlDraft.trim()) {
                  addImageUrl(urlDraft.trim());
                  setUrlDraft("");
                  setShowUrlInput(false);
                }
              }}
              disabled={!urlDraft.trim()}
              className="sevacam-primary-button h-10 rounded-[0.22rem] px-4 text-[0.6rem] font-semibold uppercase tracking-[0.16em]"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="rounded-[0.7rem] border border-(--state-warning)/20 bg-(--state-warning-subtle) px-4 py-3">
          <p className="text-sm text-(--state-warning)">{uploadError}</p>
        </div>
      )}

      {/* Image grid */}
      {formData.image_urls.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-disabled)">
            {formData.image_urls.length} image{formData.image_urls.length !== 1 ? "s" : ""} · first is primary
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {formData.image_urls.map((url, index) => (
              <div
                key={url}
                className="group relative aspect-square overflow-hidden rounded-[0.65rem] border border-(--border-subtle) bg-(--bg-inset)"
              >
                <img
                  src={url}
                  alt={`Service image ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Gradient */}
                <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                {/* Primary badge */}
                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-[rgba(122,213,221,0.18)] px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-(--accent-primary) backdrop-blur-sm">
                    Primary
                  </span>
                )}

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeImageUrl(url)}
                  aria-label="Remove image"
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white/80 opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !isUploading && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <ImageIcon className="h-9 w-9 text-(--text-disabled)" />
            <p className="text-sm text-(--text-secondary)">No images yet</p>
            <p className="text-[0.72rem] text-(--text-disabled)">
              Upload at least one image to make the service more appealing
            </p>
          </div>
        )
      )}
    </div>
  );
}
