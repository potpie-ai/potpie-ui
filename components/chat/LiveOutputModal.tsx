"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SharedMarkdown } from "@/components/chat/SharedMarkdown";
import { normalizeMarkdownForPreview } from "@/lib/utils";

export interface LiveOutputSegment {
  label: string;
  content: string;
}

interface LiveOutputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Single full content (used when segments not provided) */
  content: string;
  /** When provided, show each segment in its own section instead of one block */
  segments?: LiveOutputSegment[];
  title?: string;
}

export function LiveOutputModal({
  open,
  onOpenChange,
  content,
  segments,
  title = "Live output",
}: LiveOutputModalProps) {
  const hasSegments = segments && segments.length > 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl w-[95vw] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden"
        showX={true}
      >
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0 border-b border-[#E5E7EB]">
          <DialogTitle className="text-base font-semibold text-[#022019]">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto px-6 py-4 space-y-4">
          {hasSegments ? (
            segments!.map((seg, idx) => (
              <div key={idx} className="rounded-lg border border-[#E5E7EB] bg-[#FAF8F7] p-4">
                <p className="text-xs font-semibold text-[#022D2C] uppercase tracking-wide mb-2">
                  {seg.label}
                </p>
                <div
                  className="prose prose-sm prose-zinc max-w-none text-sm break-words [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_code]:break-all [&_table]:block [&_table]:overflow-x-auto [&_a]:break-all"
                  style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                >
                  <SharedMarkdown content={normalizeMarkdownForPreview(seg.content)} />
                </div>
              </div>
            ))
          ) : (
            <div
              className="prose prose-sm prose-zinc max-w-none text-sm break-words [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_code]:break-all [&_table]:block [&_table]:overflow-x-auto [&_a]:break-all"
              style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
            >
              <SharedMarkdown content={normalizeMarkdownForPreview(content)} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
