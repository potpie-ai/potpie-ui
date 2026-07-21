"use client";

// Top-level orchestrator for the events screen. Owns filter / search / selection
// state and stitches together the data hooks with the presentational pieces.
// Everything heavier-weight (rendering, payload formatting, agent activity)
// lives in ./events/* so this file stays a thin coordinator.
//
// Layout is an activity console: page header → inline filter toolbar with a
// live-stream indicator → the ingestion pipeline stage flow → a dense
// hairline-divided event list. Selection raises a floating glass action bar.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { MonoChip, PageHeader, StatusDot, type StatusTone } from "./kit";
import {
  EventBulkActionBar,
  EventDetailSheet,
  EventFilters,
  EventIngestionSettings,
  EventList,
  IngestionPipeline,
  defaultFilters,
  flattenPages,
  getEffectiveStatus,
  isFiltersActive,
  useBatchRetryEvents,
  useEventsList,
  useForceFlushPot,
  useIngestionConfig,
  usePotEventsLiveSync,
  useRetryEvent,
  type EventsFilters,
} from "./events";
import { ACTIVE_STATUSES } from "./events/constants";

type Props = { potId: string };

export default function PotEventsPanel({ potId }: Props) {
  // Filter + search state lives here so it can drive the React Query key.
  const [filters, setFilters] = useState<EventsFilters>(defaultFilters);
  // Local search input is debounced into the filters key so we don't
  // refetch on every keystroke. Server-side search since Phase 6.
  const [searchInput, setSearchInput] = useState("");

  // Debounce 250ms — matches the typical typing cadence and stays under
  // the request latency budget so the user sees results "while" typing.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput }));
    }, 250);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  // Selection is local — survives only while the user is in the screen.
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());

  // Open event for the side panel. Keeps the row reference for header fallback.
  const [openEventId, setOpenEventId] = useState<string | null>(null);

  const eventsQuery = useEventsList(potId, filters);
  const retryMutation = useRetryEvent(potId);
  const batchRetryMutation = useBatchRetryEvents(potId);
  const flushMutation = useForceFlushPot(potId);
  const { data: ingestionConfig } = useIngestionConfig(potId);

  // Live updates + self-healing reconciliation, all in one module: patches
  // the list/detail cache from the status stream, and resyncs against the
  // server on reconnect / refocus / online / an adaptive heartbeat so a
  // lost delta can never strand a stale row.
  const liveSync = usePotEventsLiveSync(potId, /* enabled */ true);

  const allEvents = useMemo(() => flattenPages(eventsQuery.data), [eventsQuery.data]);
  // Phase 6: search is server-side — no client filtering pass. We still
  // keep the alias so the rest of this component reads naturally.
  const displayed = allEvents;

  const openEvent = useMemo(
    () => allEvents.find((e) => (e.event_id || e.id) === openEventId),
    [allEvents, openEventId],
  );

  const toggleSelected = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAllVisible = useCallback(
    (selected: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const ev of displayed) {
          const id = ev.event_id || ev.id;
          if (!id) continue;
          if (selected) next.add(id);
          else next.delete(id);
        }
        return next;
      });
    },
    [displayed],
  );

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleFiltersChange = useCallback((f: EventsFilters) => {
    setFilters(f);
    // Filter change can change what's selected. Drop selection rather
    // than carrying stale IDs forward.
    setSelectedIds(new Set());
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    handleFiltersChange(defaultFilters());
  }, [handleFiltersChange]);

  const handleRetry = useCallback(
    (id: string) => {
      retryMutation.mutate(id, {
        onSuccess: () => toast.success("Ingestion re-queued"),
        onError: (e: Error) =>
          toast.error(e?.message ?? "Failed to retry ingestion"),
      });
    },
    [retryMutation],
  );

  // One backend call coalesces all selections into a single open batch
  // and enqueues once — much cheaper than N parallel retries.
  const handleBulkReprocess = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      const result = await batchRetryMutation.mutateAsync(ids);
      toast.success(
        `Re-queued ${result.count} event${result.count === 1 ? "" : "s"}`,
      );
      setSelectedIds(new Set());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to re-queue events";
      toast.error(msg);
    }
  }, [selectedIds, batchRetryMutation]);

  const handleCopyId = useCallback((id: string) => {
    void navigator.clipboard
      .writeText(id)
      .then(() => toast.success("Event ID copied"))
      .catch(() => toast.error("Could not copy event ID"));
  }, []);

  // Count queued/processing events in the loaded pages. This is a lower
  // bound (server may have more on later pages), but it reflects what the
  // user can see now and is enough signal for the flush CTA.
  const queuedCount = useMemo(
    () =>
      allEvents.filter((ev) =>
        ACTIVE_STATUSES.has(getEffectiveStatus(ev)),
      ).length,
    [allEvents],
  );

  // Events the agent is actively working right now — drives the pipeline
  // "Processing" stage pulse.
  const processingCount = useMemo(
    () =>
      allEvents.filter((ev) => getEffectiveStatus(ev) === "processing").length,
    [allEvents],
  );

  const handleForceFlush = useCallback(async () => {
    try {
      const res = await flushMutation.mutateAsync();
      if (res.batch_id) {
        toast.success("Open batch queued for ingestion");
      } else {
        toast.info("No pending batch to flush");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to flush";
      toast.error(msg);
    }
  }, [flushMutation]);

  const refreshing = eventsQuery.isFetching && !eventsQuery.isFetchingNextPage;

  // Connection affordance: pulsing accent dot when live, amber only after a
  // sustained drop (the by-design idle-timeout reconnect stays live),
  // rose when retries keep failing.
  const liveMeta: { tone: StatusTone; pulse: boolean; label: string } =
    liveSync.connectionStatus === "connected"
      ? { tone: "busy", pulse: true, label: "Live" }
      : liveSync.connectionStatus === "reconnecting"
        ? { tone: "warn", pulse: true, label: "Reconnecting…" }
        : { tone: "error", pulse: false, label: "Offline" };

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Events"
          description="Everything this pot ingests — notes, webhooks, and agent runs — with live status."
          actions={
            <>
              {queuedCount > 0 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleForceFlush()}
                  disabled={flushMutation.isPending}
                  className="h-9 gap-1.5 px-2.5 text-[13px]"
                  title="Process all queued events now"
                >
                  <Zap
                    className={cn(
                      "h-4 w-4 text-amber-500",
                      flushMutation.isPending && "animate-pulse",
                    )}
                  />
                  Process queued
                  <span className="font-mono text-xs text-muted-foreground">
                    {queuedCount}
                  </span>
                </Button>
              ) : null}
              <EventIngestionSettings potId={potId} />
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => eventsQuery.refetch()}
                disabled={refreshing}
                aria-label="Refresh events"
              >
                <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
            </>
          }
        />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border/70 pb-4">
          <EventFilters
            search={searchInput}
            onSearchChange={setSearchInput}
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
          <div className="ml-auto flex items-center gap-3">
            {ingestionConfig?.mode === "windowed" ? (
              <MonoChip>{ingestionConfig.window_minutes}-min batches</MonoChip>
            ) : null}
            <span
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground"
              title={
                liveSync.connectionStatus === "offline"
                  ? "Live updates unavailable — retrying. The list still refreshes periodically."
                  : liveSync.lastSyncAt
                    ? `Last synced ${new Date(liveSync.lastSyncAt).toLocaleTimeString()}`
                    : "Syncing…"
              }
            >
              <StatusDot tone={liveMeta.tone} pulse={liveMeta.pulse} />
              {liveMeta.label}
            </span>
          </div>
        </div>

        <IngestionPipeline
          potId={potId}
          queuedCount={queuedCount}
          processingCount={processingCount}
          onForceFlush={() => void handleForceFlush()}
          flushing={flushMutation.isPending}
        />

        {eventsQuery.isError ? (
          <div className="flex items-baseline gap-2 border-l-2 border-rose-400 py-1 pl-3">
            <p className="text-sm text-rose-600 dark:text-rose-400">
              {eventsQuery.error?.message ?? "Failed to load events"}
            </p>
            <Button
              size="sm"
              variant="link"
              className="h-auto p-0 text-[13px]"
              onClick={() => eventsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <EventList
            events={displayed}
            loading={eventsQuery.isPending}
            loadingMore={eventsQuery.isFetchingNextPage}
            hasMore={!!eventsQuery.hasNextPage}
            onLoadMore={() => eventsQuery.fetchNextPage()}
            selectedIds={selectedIds}
            onToggleSelected={toggleSelected}
            onSelectAllVisible={handleSelectAllVisible}
            onOpenEvent={setOpenEventId}
            onCopyEventId={handleCopyId}
            onRetryEvent={handleRetry}
            retryingId={retryMutation.isPending ? (retryMutation.variables ?? null) : null}
            highlightedId={openEventId}
            hasSearchOrFilters={!!filters.search.trim() || isFiltersActive(filters)}
            onClearFilters={handleClearFilters}
            emptyAction={
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link href={`/pots/${potId}/add-context`}>
                  <Plus className="h-4 w-4" />
                  Add context
                </Link>
              </Button>
            }
          />
        )}
      </div>

      <EventBulkActionBar
        selectedCount={selectedIds.size}
        reprocessing={batchRetryMutation.isPending}
        onReprocess={handleBulkReprocess}
        onClear={handleClearSelection}
      />

      <EventDetailSheet
        eventId={openEventId}
        fallbackEvent={openEvent}
        open={!!openEventId}
        onOpenChange={(open) => !open && setOpenEventId(null)}
        onRetry={handleRetry}
        retrying={retryMutation.isPending && retryMutation.variables === openEventId}
      />
    </>
  );
}
