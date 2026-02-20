"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Paperclip, FileText, X } from "lucide-react";

interface AdditionalContextSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: string;
  onContextChange: (context: string) => void;
  onGeneratePlan: () => void;
  isGenerating: boolean;
  recipeId: string | null;
  unansweredCount?: number;
  /** Called when attached files change. removedIndex set when user removes file at that index. */
  onAttachmentChange?: (files: File[], removedIndex?: number) => void;
  attachmentUploading?: boolean;
}

function getFileTypeLabel(file: File): string {
  const ext = file.name.split(".").pop()?.toUpperCase() ?? "";
  if (ext) return ext;
  if (file.type) {
    const part = file.type.split("/").pop()?.toUpperCase() ?? "";
    return part || "FILE";
  }
  return "FILE";
}

export default function AdditionalContextSection({
  open,
  onOpenChange,
  context,
  onContextChange,
  onGeneratePlan,
  isGenerating,
  recipeId,
  unansweredCount: _unansweredCount,
  onAttachmentChange,
  attachmentUploading = false,
}: AdditionalContextSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const setAttachedFilesAndNotify = (files: File[], removedIndex?: number) => {
    setAttachedFiles(files);
    onAttachmentChange?.(files, removedIndex);
  };

  // Object URLs for image previews; revoke when files change or unmount
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});
  useEffect(() => {
    const urls: Record<number, string> = {};
    attachedFiles.forEach((file, i) => {
      if (file.type.startsWith("image/")) {
        urls[i] = URL.createObjectURL(file);
      }
    });
    setPreviewUrls((prev) => {
      Object.values(prev).forEach(URL.revokeObjectURL);
      return urls;
    });
    return () => {
      Object.values(urls).forEach(URL.revokeObjectURL);
    };
  }, [attachedFiles]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length) return;
    const newFiles = Array.from(selected);
    setAttachedFilesAndNotify([...attachedFiles, ...newFiles]);
    e.target.value = "";
  };

  return (
    <div className="bg-background border-zinc-100 px-6 py-4">
      <div className="max-w-3xl mx-auto">
        <div className="space-y-3">
          <div>
            <h2 className="text-xs font-bold text-primary-color uppercase tracking-wide mb-1">
              Additional Context
            </h2>
            <p className="text-[10px] text-zinc-400 mb-3">
              Add any extra requirements, constraints, or notes
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
            aria-label="Attach files"
          />

          {/* Single input box: textarea + attachments + Attach button inside one bordered area */}
          <div className="rounded-lg border border-zinc-200 focus-within:border-zinc-300 focus-within:ring-1 focus-within:ring-zinc-200 transition-colors bg-[#FBFBFB]">
            <Textarea
              value={context}
              onChange={(e) => onContextChange(e.target.value)}
              placeholder="Example: Use TypeScript for type safety, follow RESTful API conventions..."
              className="min-h-[100px] text-xs resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-t-lg rounded-b-none leading-relaxed px-4 pt-4 pb-2 bg-[#FBFBFB] placeholder:text-zinc-400"
            />
            {/* Attached files row - inside the box */}
            <div
              className="overflow-hidden transition-[max-height] duration-200 ease-out border-t border-zinc-100"
              style={{ maxHeight: attachedFiles.length > 0 ? 88 : 0 }}
              aria-hidden={attachedFiles.length === 0}
            >
              <div className="flex flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden px-3 py-2">
                {attachedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    className="relative flex flex-shrink-0 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 pr-8"
                  >
                    {previewUrls[index] ? (
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                        <img
                          src={previewUrls[index]}
                          alt={file.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100">
                        <FileText className="h-6 w-6 text-zinc-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#333333]">
                        {file.name}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                        {getFileTypeLabel(file)}
                        {attachmentUploading && " · Uploading..."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachedFilesAndNotify(
                          attachedFiles.filter((_, i) => i !== index),
                          index
                        )
                      }
                      disabled={isGenerating}
                      className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 hover:bg-zinc-300 disabled:opacity-50"
                      aria-label="Remove attachment"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            {/* Bottom bar: Attach button inside the box - same bg as textarea */}
            <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-zinc-100 rounded-b-lg bg-[#FBFBFB]">
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-500 focus:outline-none disabled:opacity-50"
                disabled={isGenerating}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach file"
              >
                <Paperclip className="h-4 w-4" />
                Attach
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button
              onClick={onGeneratePlan}
              disabled={isGenerating || !recipeId}
              className="shrink-0 px-6 py-2 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  GENERATING...
                </>
              ) : (
                "GENERATE IMPLEMENTATION PLAN"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
