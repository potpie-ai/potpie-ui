"use client";

// Top-left floating toolbar for the graph workspace: repo search, a filters
// popover (include groups / PR / node limit), label density and collapse
// controls. Pure presentation — all state lives in PotGraphExplorer.

import React from "react";
import { Search, Shrink, SlidersHorizontal, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { GlassPanel } from "@/app/(main)/pots/components/kit";
import { cn } from "@/lib/utils";
import { PROJECT_GRAPH_INCLUDE_GROUPS } from "./ontology";

export type GraphControlsProps = {
  repoName: string;
  onRepoNameChange: (value: string) => void;
  prNumber: string;
  onPrNumberChange: (value: string) => void;
  limit: number;
  onLimitChange: (value: number) => void;
  include: Set<string>;
  onToggleInclude: (key: string) => void;
  labelMode: "auto" | "all";
  onToggleLabelMode: () => void;
  expandedCount: number;
  onCollapseExpanded: () => void;
  onResetFilters: () => void;
  className?: string;
};

export default function GraphControls({
  repoName,
  onRepoNameChange,
  prNumber,
  onPrNumberChange,
  limit,
  onLimitChange,
  include,
  onToggleInclude,
  labelMode,
  onToggleLabelMode,
  expandedCount,
  onCollapseExpanded,
  onResetFilters,
  className,
}: GraphControlsProps) {
  return (
    <GlassPanel className={cn("flex items-center gap-0.5 p-1.5", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          value={repoName}
          onChange={(e) => onRepoNameChange(e.target.value)}
          placeholder="Filter by repo"
          className="h-8 w-40 border-0 bg-transparent pl-8 text-[13px] shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:ring-offset-0 md:w-48"
        />
      </div>

      <span aria-hidden className="mx-1 h-5 w-px bg-border/70" />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-[13px] font-medium"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            <span className="rounded-md bg-muted px-1.5 font-mono text-[11px] text-muted-foreground">
              {include.size}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={8} className="pot-theme w-80 p-4">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">Include groups</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Pick which slices of the project map to load.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {PROJECT_GRAPH_INCLUDE_GROUPS.map((g) => {
                  const active = include.has(g.key);
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => onToggleInclude(g.key)}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-end gap-3 border-t border-border/60 pt-3">
              <label className="min-w-0 flex-1">
                <span className="text-[13px] text-muted-foreground">
                  PR number
                </span>
                <Input
                  value={prNumber}
                  onChange={(e) =>
                    onPrNumberChange(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="e.g. 142"
                  className="mt-1 h-8 font-mono text-xs placeholder:text-muted-foreground/70"
                />
              </label>
              <label className="w-24">
                <span className="text-[13px] text-muted-foreground">
                  Node limit
                </span>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={limit}
                  onChange={(e) =>
                    onLimitChange(
                      Math.max(1, Math.min(50, Number(e.target.value) || 25)),
                    )
                  }
                  className="mt-1 h-8 font-mono text-xs"
                />
              </label>
            </div>

            <div className="flex justify-end border-t border-border/60 pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[13px] text-muted-foreground hover:text-foreground"
                onClick={onResetFilters}
              >
                Reset filters
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleLabelMode}
        className="h-8 gap-1.5 px-2 text-[13px] font-medium"
        title={
          labelMode === "auto"
            ? "Relationship labels appear on hover and zoom — click to show all"
            : "All relationship labels shown — click for automatic density"
        }
      >
        <Tags className="h-3.5 w-3.5" />
        {labelMode === "auto" ? "Auto" : "All"}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onCollapseExpanded}
        disabled={expandedCount === 0}
        className="h-8 w-8"
        title="Collapse all expanded neighbourhoods"
        aria-label="Collapse all expanded neighbourhoods"
      >
        <Shrink className="h-4 w-4" />
      </Button>
    </GlassPanel>
  );
}
