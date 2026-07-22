"use client";

// Docked timeline companion for the graph explorer. Shares the timeline query
// (and react-query cache) with the Timeline tab, but reads as a narrow feed:
// lookback chips and the density strip up top, compact day-grouped rows below.
// The bridge to the canvas runs both ways — selecting a node scopes the feed
// to events involving it, and clicking an event flies the canvas to the best
// matching node.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarClock,
  Crosshair,
  RefreshCw,
  X,
} from "lucide-react";

import PotService, {
  PotTimeline,
  TimelineActivity,
} from "@/services/PotService";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, MonoChip } from "@/app/(main)/pots/components/kit";
import { cn } from "@/lib/utils";

import {
  DEFAULT_TIMELINE_WINDOW,
  TIMELINE_FETCH_LIMIT,
  TIMELINE_WINDOWS,
  categoryTint,
  verbMeta,
  type TimelineWindow,
} from "./ontology";
import {
  formatDayHeading,
  formatTimeOfDay,
  groupByDay,
  shortRepo,
} from "./format";
import { eventInvolves, focusTargetFor } from "./relations";
import ActivityDensityStrip from "./ActivityDensityStrip";

export type TimelineSidePanelProps = {
  potId: string;
  dark: boolean;
  /** Currently selected canvas node — the panel scopes its feed to it. */
  scopeKey: string | null;
  scopeName: string | null;
  /** Every node id in the loaded graph model — focus targets must exist. */
  knownKeys: ReadonlySet<string>;
  /** Fly the canvas to a node (reveal + select + animate). */
  onFocusEvent: (entityKey: string) => void;
  onClose: () => void;
};

export default function TimelineSidePanel({
  potId,
  dark,
  scopeKey,
  scopeName,
  knownKeys,
  onFocusEvent,
  onClose,
}: TimelineSidePanelProps) {
  const params = useParams<{ potId: string }>();
  const potRef = params?.potId ?? potId;

  const [lookback, setLookback] = useState<TimelineWindow>(
    DEFAULT_TIMELINE_WINDOW,
  );

  // Same query key as the Timeline tab, so the two views share one cache.
  const timelineQuery = useQuery<PotTimeline>({
    queryKey: ["pot-timeline", potId, lookback],
    queryFn: () =>
      PotService.getPotTimeline(potId, {
        window: lookback,
        limit: TIMELINE_FETCH_LIMIT,
      }),
    staleTime: 30_000,
  });

  const items = useMemo(
    () => timelineQuery.data?.items ?? [],
    [timelineQuery.data],
  );

  // ---- Scope (canvas selection → feed filter) -------------------------------

  const [scope, setScope] = useState<{ key: string; name: string } | null>(
    null,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Focusing a node *from* the panel echoes back as a selection change; that
  // one change must not re-scope the feed, or clicking any row would filter
  // the list down to just that event.
  const suppressSync = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (suppressSync.current) {
      suppressSync.current = false;
      return;
    }
    setScope(scopeKey ? { key: scopeKey, name: scopeName ?? scopeKey } : null);
  }, [scopeKey, scopeName]);

  const scoped = useMemo(
    () => (scope ? items.filter((it) => eventInvolves(it, scope.key)) : items),
    [items, scope],
  );

  // Selecting an activity node on the canvas lands on its own event — open it.
  useEffect(() => {
    if (!scope) return;
    const hit = items.find((it) => it.activity_key === scope.key);
    if (hit) setExpandedId(hit.id);
  }, [scope, items]);

  useEffect(() => {
    if (!expandedId) return;
    scrollRef.current
      ?.querySelector(`[data-event="${expandedId}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [expandedId]);

  const clearScope = useCallback(() => setScope(null), []);

  const handlePick = useCallback(
    (item: TimelineActivity) => {
      const closing = expandedId === item.id;
      setExpandedId(closing ? null : item.id);
      if (closing) return;
      const target = focusTargetFor(item, knownKeys);
      if (!target) return;
      if (target !== scopeKey) suppressSync.current = true;
      onFocusEvent(target);
    },
    [expandedId, knownKeys, onFocusEvent, scopeKey],
  );

  const jumpToDay = useCallback((day: string) => {
    scrollRef.current
      ?.querySelector<HTMLElement>(`[data-day="${day}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const dayGroups = useMemo(() => groupByDay(scoped), [scoped]);

  const state = timelineQuery.isLoading
    ? "loading"
    : timelineQuery.isError
      ? "error"
      : items.length === 0
        ? "empty"
        : "ready";

  return (
    <aside
      aria-label="Pot activity timeline"
      className="relative z-10 flex w-[min(21.5rem,85vw)] shrink-0 flex-col border-l border-border/70 bg-background"
    >
      {/* Header zone: title row, lookback chips, scope, density strip. */}
      <div className="shrink-0 border-b border-border/70 px-4 pb-3 pt-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold text-foreground">
            Timeline
          </h2>
          <div className="ml-auto flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => timelineQuery.refetch()}
              disabled={timelineQuery.isFetching}
              className="h-7 w-7"
              title="Refresh timeline"
              aria-label="Refresh timeline"
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5",
                  timelineQuery.isFetching && "animate-spin",
                )}
              />
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Open the full timeline"
            >
              <Link
                href={`/pots/${potRef}/timeline`}
                aria-label="Open the full timeline"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7"
              title="Close timeline panel"
              aria-label="Close timeline panel"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1">
          {TIMELINE_WINDOWS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => setLookback(w.value)}
              aria-pressed={lookback === w.value}
              className={cn(
                "rounded-md px-1.5 py-0.5 font-mono text-[11px] transition-colors",
                lookback === w.value
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {w.label}
            </button>
          ))}
          {state === "ready" ? (
            <span className="ml-auto font-mono text-[11px] text-muted-foreground">
              {scoped.length}
              {scope ? ` / ${items.length}` : ""}
            </span>
          ) : null}
        </div>

        {scope ? (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-muted/60 px-2 py-1">
            <Crosshair className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span
              className="min-w-0 truncate text-[11px] text-muted-foreground"
              title={scope.key}
            >
              Involving{" "}
              <span className="font-medium text-foreground">{scope.name}</span>
            </span>
            <button
              type="button"
              onClick={clearScope}
              aria-label="Show all activity"
              title="Show all activity"
              className="ml-auto rounded p-0.5 text-muted-foreground/70 hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : null}

        {state === "ready" && scoped.length > 0 ? (
          <ActivityDensityStrip
            items={scoped}
            dark={dark}
            onJumpToDay={jumpToDay}
            className="mt-3"
          />
        ) : null}
      </div>

      {/* Scrolling feed */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-10"
      >
        {state === "loading" ? (
          <PanelSkeleton />
        ) : state === "error" ? (
          <EmptyState
            className="mt-6"
            icon={CalendarClock}
            title="Couldn't load activity"
            description={
              timelineQuery.error instanceof Error
                ? timelineQuery.error.message
                : "Something went wrong while fetching pot activity."
            }
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => timelineQuery.refetch()}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
            </Button>
          </EmptyState>
        ) : state === "empty" ? (
          <EmptyState
            className="mt-6"
            icon={CalendarClock}
            title="No activity in this window"
            description="Nothing happened in the selected lookback — or events haven't been ingested yet."
          >
            {lookback !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLookback("all")}
              >
                Look at all time
              </Button>
            ) : null}
          </EmptyState>
        ) : scoped.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={Crosshair}
            title="No related activity"
            description={`Nothing in the loaded window involves ${
              scope?.name ?? "this entity"
            }.`}
          >
            <Button variant="outline" size="sm" onClick={clearScope}>
              Show all activity
            </Button>
            {lookback !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLookback("all")}
              >
                Look at all time
              </Button>
            ) : null}
          </EmptyState>
        ) : (
          dayGroups.map((group) => (
            <section
              key={group.day}
              data-day={group.day}
              className="scroll-mt-1"
            >
              <header className="sticky top-0 z-20 flex items-baseline gap-2 bg-background/95 px-2 pb-1 pt-2.5 backdrop-blur-sm">
                <h3 className="text-xs font-semibold text-foreground">
                  {formatDayHeading(group.day)}
                </h3>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {group.items.length}
                </span>
                <span
                  aria-hidden
                  className="h-px flex-1 self-center bg-border/60"
                />
              </header>
              {/* Hairline time rail runs behind the icon discs. */}
              <ol className="relative before:absolute before:bottom-1 before:left-[19px] before:top-1 before:w-px before:bg-border/60">
                {group.items.map((item) => (
                  <PanelRow
                    key={item.id}
                    item={item}
                    expanded={expandedId === item.id}
                    focusable={focusTargetFor(item, knownKeys) !== null}
                    onPick={() => handlePick(item)}
                  />
                ))}
              </ol>
            </section>
          ))
        )}
      </div>
    </aside>
  );
}

// ---- Rows -------------------------------------------------------------------

function PanelRow({
  item,
  expanded,
  focusable,
  onPick,
}: {
  item: TimelineActivity;
  expanded: boolean;
  focusable: boolean;
  onPick: () => void;
}) {
  const meta = verbMeta(item.verb_class);
  const tint = categoryTint(meta.category);
  const Icon = meta.icon;
  const touched = (item.touched ?? []).slice(0, 4);

  return (
    <li className="relative" data-event={item.id}>
      <button
        type="button"
        onClick={onPick}
        aria-expanded={expanded}
        title={focusable ? "Show details and focus in the graph" : undefined}
        className={cn(
          "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
          expanded ? "bg-muted/50" : "hover:bg-muted/60",
        )}
      >
        {/* Icon disc sits on the day rail; solid bg masks the line under it. */}
        <span
          className={cn(
            "relative z-10 mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background",
            tint.disc,
          )}
        >
          <Icon className={cn("h-3 w-3", tint.icon)} strokeWidth={1.75} />
        </span>

        <span className="min-w-0 flex-1">
          <span
            className="block truncate text-[12.5px] font-medium leading-5 text-foreground"
            title={item.title ?? undefined}
          >
            {item.title ?? item.activity_key}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {item.actor ? (
              <span className="font-medium text-foreground/80">
                {item.actor.name}{" "}
              </span>
            ) : null}
            {meta.label}
            {item.repo_name
              ? ` · ${shortRepo(item.repo_name)}${
                  item.number ? `#${item.number}` : ""
                }`
              : ""}
          </span>
        </span>

        {item.timestamp ? (
          <time
            dateTime={item.timestamp}
            className="shrink-0 pt-0.5 font-mono text-[10px] text-muted-foreground"
          >
            {formatTimeOfDay(item.timestamp)}
          </time>
        ) : null}
      </button>

      {expanded ? (
        <div className="space-y-2 pb-2.5 pl-10 pr-2 pt-0.5">
          {item.summary ? (
            <p className="line-clamp-4 text-xs leading-relaxed text-muted-foreground">
              {item.summary}
            </p>
          ) : null}
          {touched.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {touched.map((r) => (
                <span key={r.key} title={r.key} className="max-w-full">
                  <MonoChip className="max-w-[14rem]">{r.name}</MonoChip>
                </span>
              ))}
            </div>
          ) : null}
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              {item.url.includes("github.com")
                ? "Open on GitHub"
                : "Open source link"}
              <ArrowUpRight className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

// ---- Loading state ----------------------------------------------------------

function PanelSkeleton() {
  return (
    <div className="space-y-3 px-2 pt-4" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((r) => (
        <div key={r} className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 shrink-0 rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-1">
            <Skeleton className="h-3 w-4/5 bg-muted" />
            <Skeleton className="h-2.5 w-1/2 bg-muted" />
          </div>
          <Skeleton className="h-2.5 w-8 shrink-0 bg-muted" />
        </div>
      ))}
    </div>
  );
}
