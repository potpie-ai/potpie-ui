"use client";

// Top-level orchestrator for the events screen. Owns filter / search / selection
// state and stitches together the data hooks with the presentational pieces.
// Everything heavier-weight (rendering, payload formatting, agent activity)
// lives in ./events/* so this file stays a thin coordinator.

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
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
  const [filtersExpanded, setFiltersExpanded] = useState(false);

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
  // user can see now and is enough signal for the "Queued: N ⚡" CTA.
  const queuedCount = useMemo(
    () =>
      allEvents.filter((ev) =>
        ACTIVE_STATUSES.has(getEffectiveStatus(ev)),
      ).length,
    [allEvents],
  );

  // Events the agent is actively working right now — drives the pipeline
  // "Processing" phase + the graph pulse animation.
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

  // Connection affordance: steady green when live, amber only after a
  // sustained drop (the by-design idle-timeout reconnect stays green),
  // red when retries keep failing.
  const connMeta =
    liveSync.connectionStatus === "connected"
      ? {
          wrap: "bg-green-500/15 text-green-700",
          dot: "bg-green-500 animate-pulse",
          label: "Live",
        }
      : liveSync.connectionStatus === "reconnecting"
        ? {
            wrap: "bg-amber-500/15 text-amber-700",
            dot: "bg-amber-500 animate-pulse",
            label: "Reconnecting…",
          }
        : {
            wrap: "bg-red-500/15 text-red-700",
            dot: "bg-red-500",
            label: "Disconnected",
          };

  return (
    <Card>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Ingestion events</CardTitle>
            {ingestionConfig?.mode === "windowed" ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {ingestionConfig.window_minutes}-min batches
              </span>
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                connMeta.wrap,
              )}
              title={
                liveSync.connectionStatus === "offline"
                  ? "Live updates unavailable — retrying. The list still refreshes periodically."
                  : liveSync.lastSyncAt
                    ? `Last synced ${new Date(liveSync.lastSyncAt).toLocaleTimeString()}`
                    : "Syncing…"
              }
            >
              <span
                className={cn("h-1.5 w-1.5 rounded-full", connMeta.dot)}
              />
              {connMeta.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {queuedCount > 0 ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void handleForceFlush()}
                disabled={flushMutation.isPending}
                className="h-7 gap-1.5 px-2 text-xs"
                title="Process all queued events now"
              >
                <Zap
                  className={cn(
                    "h-3.5 w-3.5 text-amber-500",
                    flushMutation.isPending && "animate-pulse",
                  )}
                />
                <span>Queued: {queuedCount}</span>
              </Button>
            ) : null}
            <EventIngestionSettings potId={potId} />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => eventsQuery.refetch()}
              disabled={refreshing}
              aria-label="Refresh"
            >
              <RefreshCcw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        <EventFilters
          search={searchInput}
          onSearchChange={setSearchInput}
          filters={filters}
          onFiltersChange={(f) => {
            setFilters(f);
            // Filter change can change what's selected. Drop selection rather
            // than carrying stale IDs forward.
            setSelectedIds(new Set());
          }}
          expanded={filtersExpanded}
          onExpandedChange={setFiltersExpanded}
        />

        <EventBulkActionBar
          selectedCount={selectedIds.size}
          reprocessing={batchRetryMutation.isPending}
          onReprocess={handleBulkReprocess}
          onClear={handleClearSelection}
        />
      </CardHeader>

      <CardContent className="space-y-4">
        <IngestionPipeline
          potId={potId}
          queuedCount={queuedCount}
          processingCount={processingCount}
          onForceFlush={() => void handleForceFlush()}
          flushing={flushMutation.isPending}
        />
        {eventsQuery.isError ? (
          <div className="rounded-md border border-red-300/40 bg-red-50/40 px-3 py-2 text-sm text-red-700 dark:bg-red-950/20">
            {eventsQuery.error?.message ?? "Failed to load events"}
            <Button
              size="sm"
              variant="link"
              className="ml-2 h-auto p-0 text-xs"
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
          />
        )}
      </CardContent>

      <EventDetailSheet
        eventId={openEventId}
        fallbackEvent={openEvent}
        open={!!openEventId}
        onOpenChange={(open) => !open && setOpenEventId(null)}
        onRetry={handleRetry}
        retrying={retryMutation.isPending && retryMutation.variables === openEventId}
      />
    </Card>
  );
}
