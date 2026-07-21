"use client";

// Compact stacked histogram of activity volume over the loaded window.
// Buckets are daily for short spans and weekly beyond ~5 weeks; segments are
// stacked in the fixed TIMELINE_CATEGORY_ORDER with the validated strip
// palette. Hover shows a per-bucket breakdown; clicking jumps the list to
// that bucket's most recent day.

import React, { useMemo, useState } from "react";
import type { TimelineActivity } from "@/services/PotService";
import { categoryMeta, type CategoryKey } from "../graph/ontology";
import {
  TIMELINE_CATEGORY_ORDER,
  stripFill,
  verbMeta,
} from "./ontology";
import { dayKey } from "./format";
import { cn } from "@/lib/utils";

type Bucket = {
  /** Inclusive local-day span of the bucket. */
  startDay: string;
  endDay: string;
  /** Newest day inside the bucket that actually has events (jump target). */
  jumpDay: string | null;
  counts: Map<CategoryKey, number>;
  total: number;
};

const MS_PER_DAY = 86_400_000;

function localDayStart(iso: string): number {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayKeyFromMs(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fmtDay(key: string): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function bucketLabel(b: Bucket, bucketDays: number): string {
  return bucketDays === 1
    ? fmtDay(b.startDay)
    : `${fmtDay(b.startDay)} – ${fmtDay(b.endDay)}`;
}

export type ActivityDensityStripProps = {
  items: TimelineActivity[];
  dark: boolean;
  onJumpToDay: (day: string) => void;
  className?: string;
};

export default function ActivityDensityStrip({
  items,
  dark,
  onJumpToDay,
  className,
}: ActivityDensityStripProps) {
  const { buckets, bucketDays, maxTotal } = useMemo(() => {
    const stamps = items
      .filter((i) => i.timestamp)
      .map((i) => localDayStart(i.timestamp as string));
    if (stamps.length < 2) {
      return { buckets: [] as Bucket[], bucketDays: 1, maxTotal: 0 };
    }
    const min = Math.min(...stamps);
    const max = Math.max(...stamps);
    const spanDays = Math.round((max - min) / MS_PER_DAY) + 1;
    const days = spanDays <= 35 ? 1 : 7;
    const count = Math.ceil(spanDays / days);
    const buckets: Bucket[] = Array.from({ length: count }, (_, i) => {
      const startMs = min + i * days * MS_PER_DAY;
      const endMs = Math.min(startMs + (days - 1) * MS_PER_DAY, max);
      return {
        startDay: dayKeyFromMs(startMs),
        endDay: dayKeyFromMs(endMs),
        jumpDay: null,
        counts: new Map(),
        total: 0,
      };
    });
    for (const item of items) {
      if (!item.timestamp) continue;
      const idx = Math.min(
        Math.floor((localDayStart(item.timestamp) - min) / (days * MS_PER_DAY)),
        count - 1,
      );
      const b = buckets[idx];
      const cat = verbMeta(item.verb_class).category;
      b.counts.set(cat, (b.counts.get(cat) ?? 0) + 1);
      b.total += 1;
      const day = dayKey(item.timestamp);
      // Items arrive newest-first, so the first day seen per bucket is the
      // newest one — the natural jump target for a newest-first list.
      if (!b.jumpDay) b.jumpDay = day;
    }
    const maxTotal = Math.max(...buckets.map((b) => b.total), 1);
    return { buckets, bucketDays: days, maxTotal };
  }, [items]);

  const [hover, setHover] = useState<number | null>(null);

  if (buckets.length < 2) return null;

  const hovered = hover !== null ? buckets[hover] : null;

  return (
    <div className={cn("relative", className)}>
      {/* Tooltip — glass, above the hovered bucket, clamped away from edges. */}
      {hovered && hovered.total > 0 ? (
        <div
          className="pointer-events-none absolute bottom-full z-10 mb-1.5 w-max -translate-x-1/2 rounded-lg border border-border/70 bg-background/95 px-2.5 py-1.5 shadow-sm backdrop-blur-sm"
          style={{
            left: `clamp(4rem, ${(((hover as number) + 0.5) / buckets.length) * 100}%, calc(100% - 4rem))`,
          }}
        >
          <p className="text-[11px] font-medium text-foreground">
            {bucketLabel(hovered, bucketDays)}
            <span className="ml-1.5 font-mono text-muted-foreground">
              {hovered.total}
            </span>
          </p>
          <div className="mt-1 space-y-0.5">
            {TIMELINE_CATEGORY_ORDER.filter((c) => hovered.counts.get(c)).map(
              (c) => (
                <p
                  key={c}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: stripFill(c, dark) }}
                  />
                  {categoryMeta(c).label}
                  <span className="ml-auto pl-3 font-mono">
                    {hovered.counts.get(c)}
                  </span>
                </p>
              ),
            )}
          </div>
        </div>
      ) : null}

      <div
        className="flex h-11 items-end gap-0.5"
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Activity volume over the loaded window"
      >
        {buckets.map((b, i) => (
          <button
            key={b.startDay}
            type="button"
            tabIndex={-1}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onClick={() => b.jumpDay && onJumpToDay(b.jumpDay)}
            disabled={b.total === 0}
            aria-label={`${bucketLabel(b, bucketDays)} — ${b.total} events`}
            title={b.total > 0 ? "Jump to these events" : undefined}
            className={cn(
              "group flex h-full min-w-0 flex-1 flex-col-reverse justify-start rounded-t-[2px]",
              b.total > 0 ? "cursor-pointer" : "cursor-default",
            )}
          >
            {b.total === 0 ? (
              <span
                aria-hidden
                className="h-px w-full bg-border/60"
              />
            ) : (
              TIMELINE_CATEGORY_ORDER.filter((c) => b.counts.get(c)).map(
                (c, si) => (
                  <span
                    key={c}
                    aria-hidden
                    className={cn(
                      "w-full transition-opacity",
                      // 2px surface gap between stacked segments.
                      si > 0 && "mt-0.5",
                      hover !== null && hover !== i && "opacity-40",
                    )}
                    style={{
                      backgroundColor: stripFill(c, dark),
                      // Distribute the bucket height across segments; tiny
                      // counts keep a 3px floor so they stay visible.
                      height: `max(3px, ${((b.counts.get(c) ?? 0) / maxTotal) * 100}%)`,
                      borderRadius: "2px 2px 0 0",
                    }}
                  />
                ),
              )
            )}
          </button>
        ))}
      </div>

      <div className="mt-1 flex items-baseline justify-between border-t border-border/60 pt-1">
        <span className="font-mono text-[10px] text-muted-foreground/80">
          {fmtDay(buckets[0].startDay)}
        </span>
        <span className="text-[10px] text-muted-foreground/60">
          {bucketDays === 1 ? "per day" : "per week"}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/80">
          {fmtDay(buckets[buckets.length - 1].endDay)}
        </span>
      </div>
    </div>
  );
}
