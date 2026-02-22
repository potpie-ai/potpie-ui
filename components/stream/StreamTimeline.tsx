"use client";

import * as React from "react";
import { Loader2, Wrench } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SharedMarkdown } from "@/components/chat/SharedMarkdown";
import { ToolResultContent } from "@/components/stream/ToolResultContent";
import { cn, normalizeMarkdownForPreview } from "@/lib/utils";

const TOOL_RESULT_PREVIEW_LENGTH = 52;
/** Height of the stream area so it extends down toward the chat input */
const STREAM_TIMELINE_HEIGHT = "min(70vh, 560px)";

function toolResultPreview(result: string | undefined): string {
  if (!result || !result.trim()) return "";
  const oneLine = result.replace(/\s+/g, " ").trim();
  if (oneLine.length <= TOOL_RESULT_PREVIEW_LENGTH) return oneLine;
  return oneLine.slice(0, TOOL_RESULT_PREVIEW_LENGTH) + "…";
}

export type StreamTimelineItem =
  | { type: "chunk"; id: string; content: string }
  | {
      type: "tool";
      id: string;
      label: string;
      phase: "running" | "done";
      result?: string;
    };

type StreamTimelineProps = {
  items: StreamTimelineItem[];
  className?: string;
  /** Ref for scroll-into-view at end */
  endRef?: React.RefObject<HTMLDivElement>;
  /** Show loading dots at the end while agent is still responding */
  loading?: boolean;
};

/** Bouncing dots shown at the end of the stream while the agent is still responding */
function LoadingDots({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-1.5 py-2 min-h-[28px]", className)}
      role="status"
      aria-label="Agent is responding"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-[#102C2C]/70 animate-loading-dot"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </div>
  );
}

function TimelineItemRow({ item }: { item: StreamTimelineItem }) {
  if (item.type === "chunk") {
    return (
      <div
        className="rounded-lg bg-[#FAF8F7] p-3 overflow-x-hidden min-w-0 text-sm text-zinc-700"
      >
        <SharedMarkdown
          content={normalizeMarkdownForPreview(item.content)}
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-200/90 bg-white min-w-0 overflow-hidden",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      )}
    >
      {item.phase === "running" ? (
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Loader2
            className="h-4 w-4 shrink-0 text-amber-600 animate-spin"
            aria-hidden
          />
          <span className="font-mono text-xs font-medium text-zinc-700 truncate">
            {item.label}
          </span>
          <span className="ml-auto rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            Running
          </span>
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value={item.id} className="border-none">
            <AccordionTrigger
              className={cn(
                "py-2.5 pr-3 pl-3 hover:no-underline hover:bg-zinc-50/80",
                "[&[data-state=open]>svg]:rotate-180"
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50">
                  <Wrench
                    className="h-3.5 w-3.5 text-emerald-600"
                    aria-hidden
                  />
                </span>
                <span className="font-mono text-xs font-medium text-zinc-800 shrink-0">
                  {item.label}
                </span>
                {item.result && (
                  <span
                    className="text-[10px] italic text-zinc-400 truncate min-w-0"
                    title={item.result.replace(/\s+/g, " ").trim().slice(0, 200)}
                  >
                    {toolResultPreview(item.result)}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="overflow-hidden">
              <div
                className={cn(
                  "max-h-48 overflow-y-auto overflow-x-hidden",
                  "border-t border-zinc-100 bg-zinc-50/80 p-3 text-xs text-zinc-700",
                  "[scrollbar-width:thin]"
                )}
              >
                {item.result ? (
                  <ToolResultContent result={item.result} />
                ) : (
                  <span className="text-zinc-500">No output</span>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

export function StreamTimeline({
  items,
  className,
  endRef,
  loading = false,
}: StreamTimelineProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = React.useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    endRef?.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [endRef]);

  React.useEffect(() => {
    const raf = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(raf);
  }, [items, loading, scrollToBottom]);

  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(scrollToBottom);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollToBottom]);

  if (items.length === 0 && !loading) return null;

  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        "overflow-y-auto overflow-x-hidden space-y-2 min-w-0",
        "[scrollbar-width:thin]",
        className
      )}
      style={{ maxHeight: STREAM_TIMELINE_HEIGHT }}
      data-stream-timeline
    >
      {items.map((item) => (
        <TimelineItemRow key={item.id} item={item} />
      ))}
      {loading && <LoadingDots />}
      {endRef && <div ref={endRef} aria-hidden />}
    </div>
  );
}
