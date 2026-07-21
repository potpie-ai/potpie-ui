"use client";

// Bottom-left floating legend: one dot+label chip per ontology category, plus
// the grey "unloaded frontier" affordance hint.

import React from "react";
import { GlassPanel } from "@/app/(main)/pots/components/kit";
import { cn } from "@/lib/utils";
import { CATEGORY_META, CATEGORY_ORDER } from "./ontology";

export default function GraphLegend({ className }: { className?: string }) {
  return (
    <GlassPanel className={cn("max-w-[340px] px-3.5 py-2.5", className)}>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5">
        {CATEGORY_ORDER.map((c) => {
          const meta = CATEGORY_META[c];
          return (
            <span
              key={c}
              title={meta.blurb}
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <span
                aria-hidden
                className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)}
              />
              {meta.label}
            </span>
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
