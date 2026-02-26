"use client";

import { type FC, type PropsWithChildren, useState, useEffect } from "react";
import { Loader } from "lucide-react";
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
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  return (
    <ol className="mt-1 space-y-1 text-xs text-muted-foreground">
      {lines.map((line, idx) => (
        <li key={idx} className="flex items-start gap-1.5">
          <span className="mt-[2px] text-[10px] font-medium text-muted-foreground/70">
            {idx + 1}.
          </span>
          <span className="leading-snug">{line}</span>
        </li>
      ))}
    </ol>
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
    <div className="my-2 rounded-lg border border-muted bg-muted/40">
      <Accordion
        type="single"
        collapsible
        value={isStreaming ? "reasoning" : accordionValue}
        onValueChange={handleValueChange}
      >
        <AccordionItem value="reasoning" className="border-0">
          <AccordionTrigger className="px-3 py-2 hover:no-underline">
            <div className="flex flex-col items-start gap-0.5 text-left">
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {isStreaming ? (
                  <>
                    <Loader className="h-3 w-3 animate-spin" />
                    <span>Thinking (not part of answer)</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs">🤔</span>
                    <span>Thinking log (not part of answer)</span>
                  </>
                )}
              </span>
              <span className="text-[11px] text-muted-foreground/80">
                Internal steps the agent is taking to solve your request.
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            <div className="space-y-2">{children}</div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
