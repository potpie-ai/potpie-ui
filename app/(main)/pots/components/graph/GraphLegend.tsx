"use client";

// Bottom-left floating legend, now doubling as a category filter: one
// dot+label chip per ontology category present in the loaded data. Clicking a
// chip hides/shows every node type in that category ("partial" when only some
// of its types are hidden via the Filters popover). The grey "unloaded
// frontier" affordance hint stays.

import React from "react";
import { GlassPanel } from "@/app/(main)/pots/components/kit";
import { cn } from "@/lib/utils";
import { categoryDisplay } from "./ontology";

export type LegendCategory = {
  key: string;
  count: number;
  state: "on" | "partial" | "off";
};

export default function GraphLegend({
  categories,
  onToggleCategory,
  onSoloCategory,
  className,
}: {
  categories: LegendCategory[];
  onToggleCategory: (category: string) => void;
  /** Show only this category (alt-click); on the solo itself, restores all. */
  onSoloCategory: (category: string) => void;
  className?: string;
}) {
  return (
    <GlassPanel className={cn("max-w-[340px] px-3.5 py-2.5", className)}>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {categories.map((c) => {
          const meta = categoryDisplay(c.key);
          const base =
            c.state === "off"
              ? `${meta.blurb || meta.label} — hidden, click to show`
              : c.state === "partial"
                ? `${meta.blurb || meta.label} — some types hidden, click to hide all`
                : `${meta.blurb || meta.label} — click to hide`;
          const title = `${base} · ⌥-click to show only this category`;
          return (
            <button
              key={c.key}
              type="button"
              onClick={(e) =>
                e.altKey ? onSoloCategory(c.key) : onToggleCategory(c.key)
              }
              title={title}
              className={cn(
                "inline-flex items-center gap-1.5 rounded text-[11px] transition-colors",
                c.state === "off"
                  ? "text-muted-foreground/50 line-through decoration-muted-foreground/40 hover:text-muted-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  meta.dot,
                  c.state === "off" && "opacity-30",
                  c.state === "partial" && "opacity-60",
                )}
              />
              {meta.label}
              <span className="font-mono text-[10px] text-muted-foreground/70">
                {c.count}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex items-center gap-1.5 border-t border-border/60 pt-2 text-[11px] text-muted-foreground/80">
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600"
        />
        Grey nodes are unloaded — double-click to pull them in
      </p>
      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
        <span
          aria-hidden
          className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border border-border bg-background font-mono text-[8px] font-bold leading-none text-muted-foreground"
        >
          +
        </span>
        +N counts hidden neighbours — double-click to reveal them
      </p>
    </GlassPanel>
  );
}
