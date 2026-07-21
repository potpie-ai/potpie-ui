"use client";

// Filters popover for the graph workspace, in two clearly separated halves:
//
// - "On canvas" — instant client-side visibility: node types (grouped by
//   ontology category) and relationship types. Hiding a node type removes
//   those discs and their edges; hiding a relationship type removes just
//   those edges. Nothing refetches.
// - "Load scope" — what the backend query fetches: include groups, repo,
//   PR number and node limit (the pre-existing server-side knobs).
//
// Pure presentation — all state lives in PotGraphExplorer.

import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PROJECT_GRAPH_INCLUDE_GROUPS, categoryDisplay } from "./ontology";

export type LabelFacet = { label: string; count: number };

export type NodeTypeGroup = {
  category: string;
  total: number;
  labels: LabelFacet[];
};

export type EdgeTypeFacet = {
  type: string;
  count: number;
  /** Relationship colour from the shared edge colour map. */
  color: string;
};

export type GraphFiltersProps = {
  nodeTypeGroups: NodeTypeGroup[];
  hiddenLabels: Set<string>;
  onToggleLabel: (label: string) => void;
  onToggleCategory: (category: string) => void;
  /** Show only this label (alt-click); called again on the solo, restores all. */
  onSoloLabel: (label: string) => void;
  /** Show only this category (alt-click); called again on the solo, restores all. */
  onSoloCategory: (category: string) => void;
  onShowAllLabels: () => void;
  onHideAllLabels: () => void;
  edgeTypeFacets: EdgeTypeFacet[];
  hiddenEdgeTypes: Set<string>;
  onToggleEdgeType: (type: string) => void;
  onSoloEdgeType: (type: string) => void;
  onShowAllEdgeTypes: () => void;
  onHideAllEdgeTypes: () => void;
  // Load scope (server-side)
  include: Set<string>;
  onToggleInclude: (key: string) => void;
  onIncludeAll: () => void;
  onIncludeNone: () => void;
  repoName: string;
  onRepoNameChange: (value: string) => void;
  prNumber: string;
  onPrNumberChange: (value: string) => void;
  limit: number;
  onLimitChange: (value: number) => void;
  /** Everything-active filter count shown on the trigger badge. */
  badgeCount: number;
  onResetFilters: () => void;
};

/** Quiet when visible; dashed + struck when hidden. Shared with the timeline
 * screen's filters so facet chips read identically across workspaces. */
export function FacetChip({
  active,
  onClick,
  dot,
  label,
  count,
  title,
}: {
  active: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  dot?: React.ReactNode;
  label: React.ReactNode;
  count: number;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        title ??
        `${active ? "Click to hide" : "Click to show"} · ⌥-click to show only this`
      }
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors",
        active
          ? "border-border text-foreground hover:border-foreground/40"
          : "border-dashed border-border/70 text-muted-foreground/60 line-through decoration-muted-foreground/40 hover:text-muted-foreground",
      )}
    >
      {dot}
      <span className="truncate">{label}</span>
      <span className="font-mono text-[10px] text-muted-foreground/80">
        {count}
      </span>
    </button>
  );
}

export default function GraphFilters({
  nodeTypeGroups,
  hiddenLabels,
  onToggleLabel,
  onToggleCategory,
  onSoloLabel,
  onSoloCategory,
  onShowAllLabels,
  onHideAllLabels,
  edgeTypeFacets,
  hiddenEdgeTypes,
  onToggleEdgeType,
  onSoloEdgeType,
  onShowAllEdgeTypes,
  onHideAllEdgeTypes,
  include,
  onToggleInclude,
  onIncludeAll,
  onIncludeNone,
  repoName,
  onRepoNameChange,
  prNumber,
  onPrNumberChange,
  limit,
  onLimitChange,
  badgeCount,
  onResetFilters,
}: GraphFiltersProps) {
  const totalLabelCount = nodeTypeGroups.reduce(
    (s, g) => s + g.labels.length,
    0,
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-[13px] font-medium"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {badgeCount > 0 ? (
            <span className="rounded-md bg-primary/10 px-1.5 font-mono text-[11px] text-primary">
              {badgeCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        // The shared PopoverContent defaults to bg-primary/text-black —
        // repaint with the pot-theme popover tokens (white / dark pine).
        className="pot-theme w-[26rem] max-w-[calc(100vw-2rem)] bg-popover p-0 text-popover-foreground"
      >
        <div className="max-h-[min(70vh,560px)] space-y-6 overflow-y-auto p-4">
          <section>
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Node types</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Click a type to hide or show it; ⌥-click to show only that
                  type. Category names toggle whole groups.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[13px] text-muted-foreground hover:text-foreground"
                  onClick={onHideAllLabels}
                  disabled={hiddenLabels.size >= totalLabelCount}
                >
                  Hide all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[13px] text-muted-foreground hover:text-foreground"
                  onClick={onShowAllLabels}
                  disabled={hiddenLabels.size === 0}
                >
                  Show all
                </Button>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {nodeTypeGroups.map((group) => {
                const meta = categoryDisplay(group.category);
                const allHidden =
                  group.labels.length > 0 &&
                  group.labels.every((l) => hiddenLabels.has(l.label));
                return (
                  <div key={group.category}>
                    <button
                      type="button"
                      onClick={(e) =>
                        e.altKey
                          ? onSoloCategory(group.category)
                          : onToggleCategory(group.category)
                      }
                      title={
                        (allHidden
                          ? "Show every type in this category"
                          : "Hide every type in this category") +
                        " · ⌥-click to show only this category"
                      }
                      className={cn(
                        "flex items-center gap-2 text-[13px] font-medium transition-colors hover:text-foreground",
                        allHidden
                          ? "text-muted-foreground/60 line-through decoration-muted-foreground/40"
                          : "text-foreground",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          meta.dot,
                          allHidden && "opacity-40",
                        )}
                      />
                      {meta.label}
                      <span className="font-mono text-[11px] font-normal text-muted-foreground">
                        {group.total}
                      </span>
                    </button>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {group.labels.map((l) => (
                        <FacetChip
                          key={l.label}
                          active={!hiddenLabels.has(l.label)}
                          onClick={(e) =>
                            e.altKey
                              ? onSoloLabel(l.label)
                              : onToggleLabel(l.label)
                          }
                          label={l.label}
                          count={l.count}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {nodeTypeGroups.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  Nothing loaded yet.
                </p>
              ) : null}
            </div>
          </section>

          <section className="border-t border-border/60 pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Relationships</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Hide a relationship type to drop those edges; ⌥-click to show
                  only that type.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[13px] text-muted-foreground hover:text-foreground"
                  onClick={onHideAllEdgeTypes}
                  disabled={hiddenEdgeTypes.size >= edgeTypeFacets.length}
                >
                  Hide all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[13px] text-muted-foreground hover:text-foreground"
                  onClick={onShowAllEdgeTypes}
                  disabled={hiddenEdgeTypes.size === 0}
                >
                  Show all
                </Button>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1">
              {edgeTypeFacets.map((f) => (
                <FacetChip
                  key={f.type}
                  active={!hiddenEdgeTypes.has(f.type)}
                  onClick={(e) =>
                    e.altKey ? onSoloEdgeType(f.type) : onToggleEdgeType(f.type)
                  }
                  dot={
                    <span
                      aria-hidden
                      className="h-1.5 w-4 shrink-0 rounded-full"
                      style={{
                        backgroundColor: f.color,
                        opacity: hiddenEdgeTypes.has(f.type) ? 0.35 : 1,
                      }}
                    />
                  }
                  label={
                    <span className="font-mono text-[11px]">
                      {f.type.replaceAll("_", " ").toLowerCase()}
                    </span>
                  }
                  count={f.count}
                />
              ))}
              {edgeTypeFacets.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  No edges loaded yet.
                </p>
              ) : null}
            </div>
          </section>

          <section className="border-t border-border/60 pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Load scope</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  What gets fetched from the graph backend.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[13px] text-muted-foreground hover:text-foreground"
                  onClick={onIncludeNone}
                  disabled={include.size === 0}
                >
                  None
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[13px] text-muted-foreground hover:text-foreground"
                  onClick={onIncludeAll}
                  disabled={include.size >= PROJECT_GRAPH_INCLUDE_GROUPS.length}
                >
                  All
                </Button>
              </div>
            </div>
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
            <div className="mt-3 flex items-end gap-3">
              <label className="min-w-0 flex-1">
                <span className="text-[13px] text-muted-foreground">
                  Repository
                </span>
                <Input
                  value={repoName}
                  onChange={(e) => onRepoNameChange(e.target.value)}
                  placeholder="Filter by repo"
                  className="mt-1 h-8 text-[13px] placeholder:text-muted-foreground/70"
                />
              </label>
              <label className="w-24">
                <span className="text-[13px] text-muted-foreground">PR</span>
                <Input
                  value={prNumber}
                  onChange={(e) =>
                    onPrNumberChange(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="142"
                  className="mt-1 h-8 font-mono text-xs placeholder:text-muted-foreground/70"
                />
              </label>
              <label className="w-20">
                <span className="text-[13px] text-muted-foreground">Limit</span>
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
          </section>

          <div className="flex justify-end border-t border-border/60 pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[13px] text-muted-foreground hover:text-foreground"
              onClick={onResetFilters}
            >
              Reset everything
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
