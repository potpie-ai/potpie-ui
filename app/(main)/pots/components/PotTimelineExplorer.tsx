"use client";

// Activity timeline workspace for a pot — the temporal companion to the graph
// explorer. One reading column: a toolbar (search, filters, refresh), a
// stacked density strip of activity volume that doubles as navigation, and a
// newest-first list of events grouped by day on a hairline time rail. Rows
// expand inline so the reading flow never leaves the list.
//
// Exploration model mirrors the graph screen:
// - Search ("/"): instant client-side filtering over every loaded event.
// - Filters popover: event kinds (grouped by ontology category), repos and
//   people — client-side visibility, no refetch.
// - Load scope: the lookback window — the server-side knob that decides what
//   gets fetched at all.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import PotService, {
  PotTimeline,
  TimelineActivity,
} from "@/services/PotService";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/app/(main)/pots/components/kit";
import { cn } from "@/lib/utils";

import {
  DEFAULT_TIMELINE_WINDOW,
  TIMELINE_CATEGORY_ORDER,
  TIMELINE_FETCH_LIMIT,
  verbMeta,
  type TimelineWindow,
} from "./timeline/ontology";
import {
  formatDateRange,
  formatDayHeading,
  groupByDay,
} from "./timeline/format";
import ActivityDensityStrip from "./timeline/ActivityDensityStrip";
import ActivityRow from "./timeline/ActivityRow";
import TimelineFilters, {
  type ActorFacet,
  type RepoFacet,
  type VerbGroup,
} from "./timeline/TimelineFilters";

type Props = { potId: string };

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function toggleIn(prev: Set<string>, value: string): Set<string> {
  const next = new Set(prev);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function PotTimelineExplorer({ potId }: Props) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  // ---- Load scope (server-side) --------------------------------------------
  const [window, setWindow] = useState<TimelineWindow>(DEFAULT_TIMELINE_WINDOW);

  const timelineQuery = useQuery<PotTimeline>({
    queryKey: ["pot-timeline", potId, window],
    queryFn: () =>
      PotService.getPotTimeline(potId, {
        window,
        limit: TIMELINE_FETCH_LIMIT,
      }),
    staleTime: 30_000,
  });

  const items = useMemo(
    () => timelineQuery.data?.items ?? [],
    [timelineQuery.data],
  );

  // ---- Client-side exploration state ---------------------------------------
  const [query, setQuery] = useState("");
  const [hiddenVerbs, setHiddenVerbs] = useState<Set<string>>(new Set());
  const [hiddenRepos, setHiddenRepos] = useState<Set<string>>(new Set());
  const [hiddenActors, setHiddenActors] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // "/" focuses search from anywhere on the screen, like the graph toolbar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
      )
        return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ---- Facets for the filter UI --------------------------------------------

  const verbGroups = useMemo<VerbGroup[]>(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      const verb = it.verb_class ?? "activity";
      counts.set(verb, (counts.get(verb) ?? 0) + 1);
    }
    const byCat = new Map<string, VerbGroup>();
    for (const [verb, count] of counts) {
      const meta = verbMeta(verb);
      const group = byCat.get(meta.category) ?? {
        category: meta.category,
        total: 0,
        verbs: [],
      };
      group.total += count;
      group.verbs.push({ verb, label: meta.label, count });
      byCat.set(meta.category, group);
    }
    const orderIdx = (c: string) => {
      const i = TIMELINE_CATEGORY_ORDER.indexOf(
        c as (typeof TIMELINE_CATEGORY_ORDER)[number],
      );
      return i === -1 ? TIMELINE_CATEGORY_ORDER.length : i;
    };
    const groups = Array.from(byCat.values());
    for (const g of groups) {
      g.verbs.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    }
    groups.sort((a, b) => orderIdx(a.category) - orderIdx(b.category));
    return groups;
  }, [items]);

  const repoFacets = useMemo<RepoFacet[]>(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      if (it.repo_name) counts.set(it.repo_name, (counts.get(it.repo_name) ?? 0) + 1);
    }
    return Array.from(counts, ([repo, count]) => ({ repo, count })).sort(
      (a, b) => b.count - a.count || a.repo.localeCompare(b.repo),
    );
  }, [items]);

  const actorFacets = useMemo<ActorFacet[]>(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const it of items) {
      if (!it.actor) continue;
      const entry = counts.get(it.actor.key);
      if (entry) entry.count += 1;
      else counts.set(it.actor.key, { name: it.actor.name, count: 1 });
    }
    return Array.from(counts, ([key, v]) => ({ key, ...v })).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
  }, [items]);

  const allVerbs = useMemo(
    () => verbGroups.flatMap((g) => g.verbs.map((v) => v.verb)),
    [verbGroups],
  );

  // ---- Filtering -----------------------------------------------------------

  const filtered = useMemo<TimelineActivity[]>(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const verb = it.verb_class ?? "activity";
      if (hiddenVerbs.has(verb)) return false;
      if (it.repo_name && hiddenRepos.has(it.repo_name)) return false;
      if (it.actor && hiddenActors.has(it.actor.key)) return false;
      if (!q) return true;
      const haystack = [
        it.title,
        it.summary,
        it.actor?.name,
        it.repo_name,
        verbMeta(it.verb_class).label,
        it.activity_key,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query, hiddenVerbs, hiddenRepos, hiddenActors]);

  const dayGroups = useMemo(() => groupByDay(filtered), [filtered]);

  // ---- Filter actions ------------------------------------------------------

  const toggleVerb = useCallback(
    (verb: string) => setHiddenVerbs((p) => toggleIn(p, verb)),
    [],
  );
  const soloVerb = useCallback(
    (verb: string) => {
      setHiddenVerbs((prev) => {
        const target = new Set(allVerbs.filter((v) => v !== verb));
        return setsEqual(prev, target) ? new Set() : target;
      });
    },
    [allVerbs],
  );
  const toggleCategory = useCallback(
    (category: string) => {
      const group = verbGroups.find((g) => g.category === category);
      if (!group) return;
      setHiddenVerbs((prev) => {
        const next = new Set(prev);
        const allHidden = group.verbs.every((v) => next.has(v.verb));
        for (const v of group.verbs) {
          if (allHidden) next.delete(v.verb);
          else next.add(v.verb);
        }
        return next;
      });
    },
    [verbGroups],
  );
  const soloCategory = useCallback(
    (category: string) => {
      const group = verbGroups.find((g) => g.category === category);
      if (!group) return;
      const keep = new Set(group.verbs.map((v) => v.verb));
      setHiddenVerbs((prev) => {
        const target = new Set(allVerbs.filter((v) => !keep.has(v)));
        return setsEqual(prev, target) ? new Set() : target;
      });
    },
    [allVerbs, verbGroups],
  );
  const toggleRepo = useCallback(
    (repo: string) => setHiddenRepos((p) => toggleIn(p, repo)),
    [],
  );
  const soloRepo = useCallback(
    (repo: string) => {
      setHiddenRepos((prev) => {
        const target = new Set(
          repoFacets.map((f) => f.repo).filter((r) => r !== repo),
        );
        return setsEqual(prev, target) ? new Set() : target;
      });
    },
    [repoFacets],
  );
  const toggleActor = useCallback(
    (key: string) => setHiddenActors((p) => toggleIn(p, key)),
    [],
  );
  const soloActor = useCallback(
    (key: string) => {
      setHiddenActors((prev) => {
        const target = new Set(
          actorFacets.map((f) => f.key).filter((k) => k !== key),
        );
        return setsEqual(prev, target) ? new Set() : target;
      });
    },
    [actorFacets],
  );

  const clientFilterCount =
    hiddenVerbs.size + hiddenRepos.size + hiddenActors.size;
  const badgeCount =
    clientFilterCount + (window !== DEFAULT_TIMELINE_WINDOW ? 1 : 0);

  const resetFilters = useCallback(() => {
    setHiddenVerbs(new Set());
    setHiddenRepos(new Set());
    setHiddenActors(new Set());
    setWindow(DEFAULT_TIMELINE_WINDOW);
    setQuery("");
  }, []);

  const clearClientFilters = useCallback(() => {
    setHiddenVerbs(new Set());
    setHiddenRepos(new Set());
    setHiddenActors(new Set());
    setQuery("");
  }, []);

  // ---- Density-strip navigation --------------------------------------------

  const jumpToDay = useCallback((day: string) => {
    const el = scrollRef.current?.querySelector<HTMLElement>(
      `[data-day="${day}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // ---- Header summary line -------------------------------------------------

  const rangeLabel = useMemo(() => {
    if (filtered.length === 0) return null;
    const newest = filtered[0].timestamp;
    const oldest = filtered[filtered.length - 1].timestamp;
    if (!newest || !oldest) return null;
    return formatDateRange(oldest, newest);
  }, [filtered]);

  const state = timelineQuery.isLoading
    ? "loading"
    : timelineQuery.isError
      ? "error"
      : items.length === 0
        ? "empty"
        : "ready";

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* Header zone: toolbar + density strip, fixed above the scrolling list. */}
      <div className="shrink-0 border-b border-border/70">
        <div className="mx-auto w-full max-w-3xl px-6 md:px-8">
          <div className="flex items-center gap-1.5 py-2.5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setQuery("");
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Search activity…  ( / )"
                aria-label="Search activity"
                className="h-8 w-full rounded-lg bg-transparent pl-8 pr-8 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 hover:bg-muted/50 focus:bg-muted/50"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground/70 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <span aria-hidden className="mx-0.5 h-5 w-px bg-border/70" />

            <TimelineFilters
              verbGroups={verbGroups}
              hiddenVerbs={hiddenVerbs}
              onToggleVerb={toggleVerb}
              onSoloVerb={soloVerb}
              onToggleCategory={toggleCategory}
              onSoloCategory={soloCategory}
              onShowAllVerbs={() => setHiddenVerbs(new Set())}
              onHideAllVerbs={() => setHiddenVerbs(new Set(allVerbs))}
              repoFacets={repoFacets}
              hiddenRepos={hiddenRepos}
              onToggleRepo={toggleRepo}
              onSoloRepo={soloRepo}
              actorFacets={actorFacets}
              hiddenActors={hiddenActors}
              onToggleActor={toggleActor}
              onSoloActor={soloActor}
              window={window}
              onWindowChange={setWindow}
              badgeCount={badgeCount}
              onResetFilters={resetFilters}
            />

            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {state === "ready" ? (
                <p className="hidden text-[11px] text-muted-foreground sm:block">
                  <span className="font-mono">{filtered.length}</span>
                  {filtered.length !== items.length ? (
                    <>
                      {" of "}
                      <span className="font-mono">{items.length}</span>
                    </>
                  ) : null}{" "}
                  events
                  {rangeLabel ? ` · ${rangeLabel}` : ""}
                </p>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => timelineQuery.refetch()}
                disabled={timelineQuery.isFetching}
                className="h-8 w-8"
                title="Refresh timeline"
                aria-label="Refresh timeline"
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4",
                    timelineQuery.isFetching && "animate-spin",
                  )}
                />
              </Button>
            </div>
          </div>

          {state === "ready" ? (
            <ActivityDensityStrip
              items={filtered}
              dark={dark}
              onJumpToDay={jumpToDay}
              className="pb-3"
            />
          ) : null}
        </div>
      </div>

      {/* Scrolling list */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-2 md:px-8">
          {state === "loading" ? (
            <TimelineSkeleton />
          ) : state === "error" ? (
            <EmptyState
              icon={CalendarClock}
              title="Couldn't load the timeline"
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
              icon={CalendarClock}
              title="No activity in this window"
              description="Nothing happened in the selected lookback — or events haven't been ingested yet. PRs, deploys, alerts and discussions appear here as sources sync."
            >
              {window !== "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWindow("all")}
                >
                  Look at all time
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => timelineQuery.refetch()}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
              </Button>
            </EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nothing matches"
              description={
                query.trim()
                  ? "No events match the search and the current filters."
                  : "Every loaded event is hidden by the current filters."
              }
            >
              <Button variant="outline" size="sm" onClick={clearClientFilters}>
                Clear search & filters
              </Button>
            </EmptyState>
          ) : (
            dayGroups.map((group) => (
              <section
                key={group.day}
                data-day={group.day}
                className="scroll-mt-2"
              >
                <header className="sticky top-0 z-20 -mx-3 flex items-baseline gap-2.5 bg-background/95 px-3 pb-1.5 pt-3 backdrop-blur-sm">
                  <h2 className="text-[13px] font-semibold text-foreground">
                    {formatDayHeading(group.day)}
                  </h2>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {group.items.length}
                  </span>
                  <span
                    aria-hidden
                    className="h-px flex-1 self-center bg-border/60"
                  />
                </header>
                {/* Hairline time rail runs behind the icon discs. */}
                <ol className="relative before:absolute before:bottom-1 before:left-[13px] before:top-1 before:w-px before:bg-border/60">
                  {group.items.map((item) => (
                    <ActivityRow
                      key={item.id}
                      item={item}
                      expanded={expandedId === item.id}
                      onToggle={() =>
                        setExpandedId((cur) =>
                          cur === item.id ? null : item.id,
                        )
                      }
                    />
                  ))}
                </ol>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Loading state ----------------------------------------------------------

function TimelineSkeleton() {
  return (
    <div className="pt-4" aria-hidden>
      <Skeleton className="mb-6 h-11 w-full bg-muted" />
      {[0, 1, 2].map((g) => (
        <div key={g} className="mb-8">
          <Skeleton className="mb-4 h-4 w-28 bg-muted" />
          <div className="space-y-5">
            {[0, 1, 2].map((r) => (
              <div key={r} className="flex items-center gap-3">
                <Skeleton className="h-7 w-7 shrink-0 rounded-full bg-muted" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4 bg-muted" />
                  <Skeleton className="h-3 w-1/2 bg-muted" />
                </div>
                <Skeleton className="h-3 w-10 shrink-0 bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
