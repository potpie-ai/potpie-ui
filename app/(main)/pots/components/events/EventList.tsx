"use client";

// Renders the list of events as dense hairline-divided rows. Owns no data —
// gets events + selection state and handlers from the parent (which holds
// the React Query results).

import { Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { PotEvent } from "@/services/PotService";
import { EmptyState } from "../kit";
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
  /** Optional: shown as the action on the filtered empty state. */
  onClearFilters?: () => void;
  /** Optional: action node for the no-events-at-all empty state. */
  emptyAction?: React.ReactNode;
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
  onClearFilters,
  emptyAction,
}: Props) {
  if (loading) {
    return (
      <div className="divide-y divide-border/60">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3.5">
            <Skeleton className="h-4 w-4 rounded bg-muted" />
            <Skeleton className="h-2 w-2 rounded-full bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-3.5 w-1/3 rounded bg-muted" />
                <Skeleton className="h-3 w-24 rounded bg-muted" />
              </div>
              <Skeleton className="h-2.5 w-1/2 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return hasSearchOrFilters ? (
      <EmptyState
        icon={Inbox}
        title="No matching events"
        description="Nothing in this pot matches the current search and filters."
      >
        {onClearFilters ? (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : null}
      </EmptyState>
    ) : (
      <EmptyState
        icon={Inbox}
        title="No events yet"
        description="Events land here as sources sync and notes are added — each one shows its journey through the ingestion pipeline."
      >
        {emptyAction}
      </EmptyState>
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
    <div>
      <div className="flex items-center gap-3 px-3 pb-2.5">
        <Checkbox
          aria-label="Select all visible"
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(v) => onSelectAllVisible(v === true)}
        />
        <span className="font-mono text-xs text-muted-foreground">
          {events.length} event{events.length === 1 ? "" : "s"}
          {hasMore ? " · more available" : ""}
        </span>
      </div>

      <div className="divide-y divide-border/60 border-t border-border/70">
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
        <div className="flex justify-center border-t border-border/60 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
          >
            {loadingMore ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
