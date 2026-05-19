"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2, Wrench } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ToolResultContent } from "@/components/stream/ToolResultContent";
import { cn } from "@/lib/utils";

export type StreamEvent = {
  id: string;
  type: string;
  label: string;
  call_id?: string;
};

export type StreamSegment = {
  id: string;
  label: string;
  content: string;
  call_id?: string;
};

export type StreamBlock =
  | { key: string; kind: "event"; event: StreamEvent }
  | { key: string; kind: "segment"; segment: StreamSegment };

type ToolCallsPanelProps = {
  blocks: StreamBlock[];
  className?: string;
  /** Default open for outer panel */
  defaultOpen?: boolean;
};

export function ToolCallsPanel({
  blocks,
  className,
  defaultOpen = true,
}: ToolCallsPanelProps) {
  const outerValue = defaultOpen ? "tool-calls" : undefined;

  return (
    <div className={cn("mb-3 min-w-0 overflow-hidden", className)}>
      <Accordion
        type="single"
        collapsible
        defaultValue={outerValue}
        className="rounded-xl border border-zinc-200/90 bg-white shadow-sm"
      >
        <AccordionItem value="tool-calls" className="border-none">
          <AccordionTrigger
            className={cn(
              "px-4 py-3 hover:no-underline hover:bg-zinc-50/80",
              "rounded-t-xl [&[data-state=open]]:rounded-b-none",
              "[&[data-state=open]>svg]:rotate-180"
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-600">
                <Wrench className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="text-sm font-medium text-zinc-800">
                Tool calls ({blocks.length})
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent
            className={cn(
              "overflow-hidden text-sm transition-all",
              "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
              "duration-200 ease-out"
            )}
          >
            <div className="border-t border-zinc-100 bg-zinc-50/50 px-2 pb-2 pt-2">
              <Accordion type="multiple" className="w-full space-y-1.5">
                {blocks.map((block) =>
                  block.kind === "event" ? (
                    block.event.type === "tool_start" ? (
                      <div
                        key={block.key}
                        className="flex items-center gap-3 rounded-lg border border-zinc-200/80 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                      >
                        <Loader2
                          className="h-4 w-4 shrink-0 text-amber-600 animate-spin"
                          aria-hidden
                        />
                        <span className="font-mono text-xs font-medium text-zinc-700 truncate">
                          {block.event.label.replace(/^Running\s+/, "")}
                        </span>
                        <span className="ml-auto rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          Running
                        </span>
                      </div>
                    ) : block.event.type === "tool_end" ? (
                      <span key={block.key} className="hidden" aria-hidden />
                    ) : (
                      <div
                        key={block.key}
                        className="flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-white px-3 py-2 text-xs text-zinc-600"
                      >
                        {block.event.type === "subagent_start" ? (
                          <span className="text-zinc-400">▶</span>
                        ) : (
                          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        )}
                        <span className="break-words">
                          {block.event.label}
                        </span>
                      </div>
                    )
                  ) : (
                    <AccordionItem
                      key={block.key}
                      value={block.key}
                      className="rounded-lg border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] [&>div]:rounded-lg"
                    >
                      <AccordionTrigger
                        className={cn(
                          "py-2.5 pr-3 pl-3 hover:no-underline hover:bg-zinc-50/80",
                          "[&[data-state=open]>svg]:rotate-180"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50">
                            <Check
                              className="h-3.5 w-3.5 text-emerald-600"
                              aria-hidden
                            />
                          </span>
                          <span className="font-mono text-xs font-medium text-zinc-800 truncate">
                            {block.segment.label}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent
                        className={cn(
                          "overflow-hidden transition-all",
                          "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
                          "duration-200 ease-out"
                        )}
                      >
                        <div
                          ref={(el) => {
                            if (el) el.scrollTop = el.scrollHeight;
                          }}
                          className="max-h-48 overflow-y-auto overflow-x-hidden border-t border-zinc-100 bg-zinc-50/80 p-3 text-xs text-zinc-700 [scrollbar-width:thin]"
                        >
                          <ToolResultContent result={block.segment.content} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                )}
              </Accordion>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
