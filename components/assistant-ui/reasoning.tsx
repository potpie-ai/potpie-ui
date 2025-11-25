"use client";

import { type FC, type PropsWithChildren, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReasoningMessagePart } from "@assistant-ui/react";

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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-2 rounded-lg border border-muted bg-muted/30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-3 text-sm font-medium transition-colors hover:bg-muted/50"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Hide reasoning" : "Show reasoning"}
      >
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">🤔</span>
          <span>Reasoning</span>
        </span>
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && <div className="space-y-2 px-3 pb-3">{children}</div>}
    </div>
  );
};

