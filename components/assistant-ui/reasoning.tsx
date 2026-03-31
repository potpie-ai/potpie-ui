"use client";

import { type FC, type PropsWithChildren, useState, useEffect } from "react";
import { ChevronsUpDown, Loader } from "lucide-react";
import type { ReasoningMessagePart } from "@assistant-ui/react";
import { useThreadRuntime, useMessage } from "@assistant-ui/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Reasoning: FC<ReasoningMessagePart> = ({ text }) => {
  const raw = text ?? "";
  const normalized = raw
    .replace(/<\/?think>/gi, "\n")
    .replace(/^\s*thinking[\s:-]*/i, "")
    .trim();

  if (!normalized) {
    return null;
  }

  return (
    <div className="whitespace-pre-wrap rounded-md bg-white/45 px-3 py-2 text-xs leading-relaxed text-zinc-700 backdrop-blur-sm">
      {normalized}
    </div>
  );
};

export const ReasoningGroup: FC<
  PropsWithChildren<{ startIndex: number; endIndex: number }>
> = ({ children }) => {
  const [accordionValue, setAccordionValue] = useState("reasoning");
  const [hasAutoClosedOnce, setHasAutoClosedOnce] = useState(false);
  const threadRuntime = useThreadRuntime();
  const message = useMessage();

  // Track if this message is currently streaming
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    // Only track streaming for the last message
    if (!message.isLast) {
      setIsStreaming(false);
      return;
    }

    const unsubscribe = threadRuntime.subscribe(() => {
      const state = threadRuntime.getState();
      const lastMessage = state.messages.at(-1);
      const running = lastMessage?.id === message.id && state.isRunning;
      setIsStreaming(running);
    });

    // Set initial state
    const initialState = threadRuntime.getState();
    const lastMessage = initialState.messages.at(-1);
    const running = lastMessage?.id === message.id && initialState.isRunning;
    setIsStreaming(running);

    return unsubscribe;
  }, [message.isLast, message.id, threadRuntime]);

  // Keep accordion open during streaming, auto-close when streaming stops
  useEffect(() => {
    if (isStreaming) {
      // Keep open during streaming
      setAccordionValue("reasoning");
    } else if (!hasAutoClosedOnce && message.isLast) {
      // Auto-close after streaming completes (only once)
      const timer = setTimeout(() => {
        setAccordionValue("");
        setHasAutoClosedOnce(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, hasAutoClosedOnce, message.isLast]);

  const handleValueChange = (value: string) => {
    // Only allow manual control when not streaming
    if (!isStreaming) {
      setAccordionValue(value);
    }
  };

  return (
    <Accordion
      type="single"
      collapsible
      value={isStreaming ? "reasoning" : accordionValue}
      onValueChange={handleValueChange}
      className="my-2"
    >
      <AccordionItem value="reasoning" className="rounded-xl border border-transparent py-2 data-[state=open]:border-white/35 data-[state=open]:bg-white/45 data-[state=open]:backdrop-blur-sm">
        <AccordionTrigger className="w-fit px-0 py-0 text-sm text-zinc-700 hover:no-underline [&>svg]:hidden">
          <span className="flex items-center gap-1.5 font-semibold">
            {isStreaming && <Loader className="h-3.5 w-3.5 animate-spin" />}
            <span>Thinking</span>
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-70" />
          </span>
        </AccordionTrigger>
        <AccordionContent className="pt-2 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-zinc-300/70 bg-white/70 px-3 pr-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] [scrollbar-width:thin] [scrollbar-color:rgba(113,113,122,0.5)_rgba(244,244,245,0.8)]">
            {children}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
