"use client";

// Appears only when at least one row is selected: a floating glass panel
// pinned bottom-center over the console. Wires to bulk handlers supplied by
// the parent; the only wired action is reprocess.

import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GlassPanel } from "../kit";

type Props = {
  selectedCount: number;
  onReprocess: () => void;
  onClear: () => void;
  reprocessing: boolean;
  className?: string;
};

export function EventBulkActionBar({
  selectedCount,
  onReprocess,
  onClear,
  reprocessing,
  className,
}: Props) {
  if (selectedCount <= 0) return null;
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-6",
        className,
      )}
      role="region"
      aria-label="Bulk actions"
    >
      <GlassPanel className="pointer-events-auto flex items-center gap-1.5 py-1.5 pl-4 pr-1.5">
        <span className="text-sm font-medium tabular-nums text-foreground">
          {selectedCount} selected
        </span>
        <span aria-hidden className="mx-2 h-4 w-px bg-border" />
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 px-2.5 text-[13px]"
          onClick={onReprocess}
          disabled={reprocessing}
        >
          <RotateCcw
            className={cn("h-3.5 w-3.5", reprocessing && "animate-spin")}
          />
          {reprocessing ? "Re-queuing…" : "Reprocess"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={onClear}
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </Button>
      </GlassPanel>
    </div>
  );
}
