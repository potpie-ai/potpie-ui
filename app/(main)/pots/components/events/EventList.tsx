"use client";

// Renders the list of events. Owns no data — gets events + selection state
// and handlers from the parent (which holds the React Query results).

import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { PotEvent } from "@/services/PotService";
import { EventRow } from "./EventRow";

type Props = {
  events: PotEvent[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  selectedIds: ReadonlySet<string>;
  onToggleSelected: (id: string, selected: boolean) => void;
  onSelectAllVisible: (selected: boolean) => void;
  onOpenEvent: (id: string) => void;
  onCopyEventId: (id: string) => void;
  onRetryEvent: (id: string) => void;
  retryingId: string | null;
  highlightedId: string | null;
  hasSearchOrFilters: boolean;
};

export function EventList({
  events,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  selectedIds,
  onToggleSelected,
  onSelectAllVisible,
  onOpenEvent,
  onCopyEventId,
  onRetryEvent,
  retryingId,
  highlightedId,
  hasSearchOrFilters,
}: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border/40 px-3 py-3 animate-pulse"
          >
            <div className="flex justify-between">
              <div className="h-3.5 w-1/3 rounded bg-muted" />
              <div className="h-5 w-16 rounded-full bg-muted" />
            </div>
            <div className="h-2.5 w-1/2 rounded bg-muted/60 mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-12 text-center">
        <Inbox className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {hasSearchOrFilters
            ? "No events match your filters."
            : "No ingestion events yet."}
        </p>
      </div>
    );
  }

  // "Select all visible" tri-state: empty → all → none again.
  const selectedVisible = events.filter((e) => {
    const id = e.event_id || e.id;
    return id && selectedIds.has(id);
  }).length;
  const allSelected = selectedVisible === events.length && events.length > 0;
  const someSelected = selectedVisible > 0 && !allSelected;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1 pb-1 pt-2">
        <Checkbox
          aria-label="Select all visible"
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(v) => onSelectAllVisible(v === true)}
        />
        <span className="text-[11px] text-muted-foreground">
          {events.length} event{events.length === 1 ? "" : "s"}
          {hasMore ? " (more available)" : ""}
        </span>
      </div>
      <div className="space-y-1.5">
        {events.map((ev, idx) => {
          const id = ev.event_id || ev.id;
          const key = `${id ?? "noid"}-${idx}`;
          return (
            <EventRow
              key={key}
              event={ev}
              selected={!!id && selectedIds.has(id)}
              onSelectChange={(s) => id && onToggleSelected(id, s)}
              onOpen={() => id && onOpenEvent(id)}
              onCopyId={() => id && onCopyEventId(id)}
              onRetry={() => id && onRetryEvent(id)}
              retrying={retryingId === id}
              highlighted={highlightedId === id}
            />
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-xs"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
