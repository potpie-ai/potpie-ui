"use client";

import { type FC, type PropsWithChildren, useState, useEffect } from "react";
import { ChevronDownIcon, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReasoningMessagePart } from "@assistant-ui/react";
import { useThreadRuntime, useMessage } from "@assistant-ui/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Reasoning: FC<ReasoningMessagePart> = ({ text }) => {
  return (
    <div className="whitespace-pre-wrap text-sm text-muted-foreground italic leading-relaxed">
      {text}
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
    <div className="my-2 rounded-lg border border-muted bg-muted/30">
      <Accordion
        type="single"
        collapsible
        value={isStreaming ? "reasoning" : accordionValue}
        onValueChange={handleValueChange}
      >
        <AccordionItem value="reasoning" className="border-0">
          <AccordionTrigger className="px-3 py-2 hover:no-underline">
            <span className="flex items-center gap-2 text-sm font-medium">
              {isStreaming ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Reasoning in progress...</span>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground">🤔</span>
                  <span>Reasoning completed</span>
                </>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            <div className="space-y-2">{children}</div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
