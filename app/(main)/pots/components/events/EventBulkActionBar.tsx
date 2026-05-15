"use client";

// Appears only when at least one row is selected. Wires to bulk handlers
// supplied by the parent; in Phase 0 the only wired action is reprocess.

import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        "flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs",
        className,
      )}
      role="region"
      aria-label="Bulk actions"
    >
      <span className="font-medium">
        {selectedCount} selected
      </span>
      <span className="text-muted-foreground">·</span>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 gap-1.5 text-xs"
        onClick={onReprocess}
        disabled={reprocessing}
      >
        <RotateCcw className={cn("h-3 w-3", reprocessing && "animate-spin")} />
        {reprocessing ? "Re-queuing…" : "Reprocess"}
      </Button>
      <div className="flex-1" />
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={onClear}
        aria-label="Clear selection"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
