"use client";

// Filters popover for the activity timeline, mirroring the graph screen's
// two-halves layout:
//
// - "In view" — instant client-side visibility: event kinds (grouped by
//   ontology category), repositories and people. Nothing refetches.
// - "Load scope" — the lookback window, the one server-side knob the
//   timeline read takes from this screen.
//
// Pure presentation — all state lives in PotTimelineExplorer.

import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { categoryDisplay } from "../graph/ontology";
import { FacetChip } from "../graph/GraphFilters";
import { TIMELINE_WINDOWS, type TimelineWindow } from "./ontology";

export type VerbFacet = { verb: string; label: string; count: number };

export type VerbGroup = {
  category: string;
  total: number;
  verbs: VerbFacet[];
};

export type RepoFacet = { repo: string; count: number };

export type ActorFacet = { key: string; name: string; count: number };

export type TimelineFiltersProps = {
  verbGroups: VerbGroup[];
  hiddenVerbs: Set<string>;
  onToggleVerb: (verb: string) => void;
  onSoloVerb: (verb: string) => void;
  onToggleCategory: (category: string) => void;
  onSoloCategory: (category: string) => void;
  onShowAllVerbs: () => void;
  onHideAllVerbs: () => void;
  repoFacets: RepoFacet[];
  hiddenRepos: Set<string>;
  onToggleRepo: (repo: string) => void;
  onSoloRepo: (repo: string) => void;
  actorFacets: ActorFacet[];
  hiddenActors: Set<string>;
  onToggleActor: (key: string) => void;
  onSoloActor: (key: string) => void;
  window: TimelineWindow;
  onWindowChange: (w: TimelineWindow) => void;
  badgeCount: number;
  onResetFilters: () => void;
};

export default function TimelineFilters({
  verbGroups,
  hiddenVerbs,
  onToggleVerb,
  onSoloVerb,
  onToggleCategory,
  onSoloCategory,
  onShowAllVerbs,
  onHideAllVerbs,
  repoFacets,
  hiddenRepos,
  onToggleRepo,
  onSoloRepo,
  actorFacets,
  hiddenActors,
  onToggleActor,
  onSoloActor,
  window,
  onWindowChange,
  badgeCount,
  onResetFilters,
}: TimelineFiltersProps) {
  const totalVerbCount = verbGroups.reduce((s, g) => s + g.verbs.length, 0);
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
                <p className="text-sm font-semibold">Event kinds</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Click a kind to hide or show it; ⌥-click to show only that
                  kind. Category names toggle whole groups.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[13px] text-muted-foreground hover:text-foreground"
                  onClick={onHideAllVerbs}
                  disabled={hiddenVerbs.size >= totalVerbCount}
                >
                  Hide all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[13px] text-muted-foreground hover:text-foreground"
                  onClick={onShowAllVerbs}
                  disabled={hiddenVerbs.size === 0}
                >
                  Show all
                </Button>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {verbGroups.map((group) => {
                const meta = categoryDisplay(group.category);
                const allHidden =
                  group.verbs.length > 0 &&
                  group.verbs.every((v) => hiddenVerbs.has(v.verb));
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
                          ? "Show every kind in this category"
                          : "Hide every kind in this category") +
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
                      {group.verbs.map((v) => (
                        <FacetChip
                          key={v.verb}
                          active={!hiddenVerbs.has(v.verb)}
                          onClick={(e) =>
                            e.altKey ? onSoloVerb(v.verb) : onToggleVerb(v.verb)
                          }
                          label={v.label}
                          count={v.count}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {verbGroups.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  Nothing loaded yet.
                </p>
              ) : null}
            </div>
          </section>

          {repoFacets.length > 0 ? (
            <section className="border-t border-border/60 pt-4">
              <p className="text-sm font-semibold">Repositories</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {repoFacets.map((f) => (
                  <FacetChip
                    key={f.repo}
                    active={!hiddenRepos.has(f.repo)}
                    onClick={(e) =>
                      e.altKey ? onSoloRepo(f.repo) : onToggleRepo(f.repo)
                    }
                    label={<span className="font-mono text-[11px]">{f.repo}</span>}
                    count={f.count}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {actorFacets.length > 0 ? (
            <section className="border-t border-border/60 pt-4">
              <p className="text-sm font-semibold">People</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {actorFacets.map((f) => (
                  <FacetChip
                    key={f.key}
                    active={!hiddenActors.has(f.key)}
                    onClick={(e) =>
                      e.altKey ? onSoloActor(f.key) : onToggleActor(f.key)
                    }
                    label={f.name}
                    count={f.count}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="border-t border-border/60 pt-4">
            <p className="text-sm font-semibold">Load scope</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              How far back the timeline read looks.
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {TIMELINE_WINDOWS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => onWindowChange(w.value)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    window === w.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {w.value === "all" ? "All time" : `Last ${w.label}`}
                </button>
              ))}
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
