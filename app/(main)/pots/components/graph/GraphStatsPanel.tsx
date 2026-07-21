"use client";

// Top-right floating panel: what's on the canvas right now (node/edge counts),
// a refresh action, and the entry point to the full details sheet.

import React from "react";
import { Loader2, PanelRightOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/app/(main)/pots/components/kit";
import { cn } from "@/lib/utils";

export type GraphStatsPanelProps = {
  nodeCount: number;
  edgeCount: number;
  /** Everything loaded, including nodes not rendered by the focus view. */
  totalNodeCount: number;
  totalEdgeCount: number;
  /** Whether the graph is dense enough for the focus view to trim anything. */
  trimmable: boolean;
  showingAll: boolean;
  onToggleShowAll: () => void;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenDetails: () => void;
  className?: string;
};

export default function GraphStatsPanel({
  nodeCount,
  edgeCount,
  totalNodeCount,
  totalEdgeCount,
  trimmable,
  showingAll,
  onToggleShowAll,
  refreshing,
  onRefresh,
  onOpenDetails,
  className,
}: GraphStatsPanelProps) {
  const trimmed = nodeCount < totalNodeCount || edgeCount < totalEdgeCount;
  return (
    <GlassPanel className={cn("flex items-center gap-0.5 p-1.5", className)}>
      <span
        className="px-2 font-mono text-[11px] text-muted-foreground"
        title={
          trimmed
            ? "Rendered / loaded — the canvas starts from the most-connected core; double-click nodes to reveal more"
            : "Nodes and edges currently on the canvas"
        }
      >
        {trimmed
          ? `${nodeCount}/${totalNodeCount} nodes · ${edgeCount}/${totalEdgeCount} edges`
          : `${nodeCount.toLocaleString()} nodes · ${edgeCount.toLocaleString()} edges`}
      </span>

      {trimmable ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-[13px] font-medium"
          onClick={onToggleShowAll}
          title={
            showingAll
              ? "Trim to the most-connected core — double-click nodes to reveal the rest"
              : "Render every loaded node"
          }
        >
          {showingAll ? "Focus" : "Show all"}
        </Button>
      ) : null}

      <span aria-hidden className="mx-0.5 h-5 w-px bg-border/70" />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onRefresh}
        disabled={refreshing}
        title="Refresh graph data"
        aria-label="Refresh graph data"
      >
        {refreshing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 px-2 text-[13px] font-medium"
        onClick={onOpenDetails}
      >
        <PanelRightOpen className="h-3.5 w-3.5" />
        Details
      </Button>
    </GlassPanel>
  );
}
