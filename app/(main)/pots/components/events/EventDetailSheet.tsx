"use client";

// Side-panel detail view for a single event. Holds three tabs (Summary,
// Activity, Payload); the Activity tab is the live-streaming surface.
// Metadata renders as a DefList, payloads as mono blocks with copy buttons.

import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PotEvent } from "@/services/PotService";
import { DefItem, DefList, MonoChip, StatusDot } from "../kit";
import { useEventDetail } from "./useEventsQuery";
import { useEventActivityStream } from "./useEventStream";
import { EventStatusBadge } from "./EventStatusBadge";
import { EventPayloadView } from "./EventPayloadView";
import { AgentActivityTimeline } from "./AgentActivityTimeline";
import { LiveActivityTimeline } from "./LiveActivityTimeline";
import {
  formatDate,
  getEffectiveStatus,
  getEventTitle,
  getKindLabel,
  getSourceLabel,
  getTotalWorkCount,
} from "./format";
import { ACTIVE_STATUSES } from "./constants";

type Props = {
  eventId: string | null;
  // Optimisation: pass the row's stub so the header can render before the
  // detail finishes loading. Detail eventually replaces this for tab content.
  fallbackEvent?: PotEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: (eventId: string) => void;
  retrying: boolean;
};

export function EventDetailSheet({
  eventId,
  fallbackEvent,
  open,
  onOpenChange,
  onRetry,
  retrying,
}: Props) {
  const { data: detail, isLoading, isError, error } = useEventDetail(eventId);
  const event = detail ?? fallbackEvent;

  const title = useMemo(() => (event ? getEventTitle(event) : "Event"), [event]);
  const persistedStatus = event ? getEffectiveStatus(event) : "";
  const persistedWorkCount = event ? getTotalWorkCount(event) : 0;

  // Live activity feed for this event. Only active while the panel is open
  // and we have a stable event_id. Auto-reconnects on event change.
  const activity = useEventActivityStream(open ? eventId : null, open);

  // Live tool-call count from the stream — shown in the header so the user
  // sees progress at a glance. Falls back to persisted count for
  // post-mortem viewing of completed events.
  const liveToolCount = useMemo(
    () => activity.entries.filter((e) => e.kind === "tool_call").length,
    [activity.entries],
  );
  const workCount = liveToolCount > 0 ? liveToolCount : persistedWorkCount;

  // Use the live status when the stream has surfaced one, otherwise fall
  // back to the persisted status. Reconnects on opening keep this fresh.
  const status = activity.latestStatus ?? persistedStatus;
  const liveActive = open && !!eventId && !activity.ended && ACTIVE_STATUSES.has(status);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="pot-theme flex h-full w-full flex-col overflow-hidden bg-background p-0 text-foreground sm:max-w-xl"
      >
        <SheetHeader className="space-y-2.5 border-b border-border/70 px-6 py-5 text-left">
          <div className="min-w-0">
            <SheetTitle className="truncate pr-8 text-base font-semibold">
              {title}
            </SheetTitle>
            <SheetDescription className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">
              {event ? getKindLabel(event.ingestion_kind) : ""}
              {event ? ` · ${getSourceLabel(event)}` : ""}
            </SheetDescription>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {status ? <EventStatusBadge status={status} /> : null}
            {liveActive ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                <StatusDot tone="busy" pulse />
                Live
              </span>
            ) : null}
            {event?.received_at ? (
              <span className="text-[13px] text-muted-foreground">
                Received {formatDate(event.received_at)}
              </span>
            ) : null}
            {workCount > 0 ? (
              <span className="font-mono text-xs text-muted-foreground">
                {workCount} tool{workCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-[13px]"
              disabled={!eventId || retrying}
              onClick={() => eventId && onRetry(eventId)}
            >
              <RotateCcw className={cn("h-3.5 w-3.5", retrying && "animate-spin")} />
              {retrying ? "Re-queuing…" : "Reprocess"}
            </Button>
            {event?.event_id ? (
              <MonoChip className="max-w-[260px]">{event.event_id}</MonoChip>
            ) : null}
          </div>
        </SheetHeader>

        {isError ? (
          <p className="px-6 py-4 text-sm text-rose-600 dark:text-rose-400">
            {error?.message ?? "Failed to load event"}
          </p>
        ) : (
          <Tabs defaultValue="activity" className="flex flex-1 flex-col overflow-hidden">
            <div className="px-6 pt-3">
              <TabsList className="h-8">
                <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
                <TabsTrigger value="activity" className="text-xs">
                  Activity {workCount > 0 ? `· ${workCount}` : null}
                </TabsTrigger>
                <TabsTrigger value="payload" className="text-xs">Payload</TabsTrigger>
              </TabsList>
            </div>
            <Separator className="mt-3" />

            <TabsContent value="summary" className="flex-1 overflow-y-auto px-6 py-5">
              <SummaryTab event={event} loading={isLoading && !event} />
            </TabsContent>
            <TabsContent
              value="activity"
              className="flex-1 space-y-6 overflow-y-auto px-6 py-5"
            >
              {/* Live entries come first — this is the surface the user
                  cares about while the agent is running. Persisted runs
                  show below as a permanent record. */}
              {activity.entries.length > 0 || liveActive ? (
                <LiveActivityTimeline state={activity} live={liveActive} />
              ) : null}
              <AgentActivityTimeline event={event} loading={isLoading && !event} />
            </TabsContent>
            <TabsContent value="payload" className="flex-1 overflow-y-auto px-6 py-5">
              {event ? (
                <EventPayloadView event={event} />
              ) : isLoading ? (
                <div className="space-y-2.5">
                  <Skeleton className="h-3.5 w-28 rounded bg-muted" />
                  <Skeleton className="h-24 w-full rounded-lg bg-muted" />
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">No payload.</p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SummaryTab({ event, loading }: { event?: PotEvent; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2.5">
        <Skeleton className="h-3.5 w-32 rounded bg-muted" />
        <Skeleton className="h-3 w-2/3 rounded bg-muted" />
        <Skeleton className="h-3 w-1/2 rounded bg-muted" />
      </div>
    );
  }
  if (!event) {
    return (
      <p className="text-[13px] text-muted-foreground">No event selected.</p>
    );
  }

  return (
    <DefList columns={2}>
      <DefItem label="Kind">{getKindLabel(event.ingestion_kind)}</DefItem>
      <DefItem label="Source">{getSourceLabel(event)}</DefItem>
      {event.repo_name ? (
        <DefItem label="Repository" mono>
          {event.repo_name}
        </DefItem>
      ) : null}
      {event.event_type ? (
        <DefItem label="Event type">{event.event_type}</DefItem>
      ) : null}
      {event.action ? <DefItem label="Action">{event.action}</DefItem> : null}
      {event.received_at ? (
        <DefItem label="Received">{formatDate(event.received_at)}</DefItem>
      ) : null}
      {event.completed_at ? (
        <DefItem label="Completed">{formatDate(event.completed_at)}</DefItem>
      ) : null}
      {event.error ? (
        <DefItem label="Error" className="sm:col-span-2">
          <span className="text-rose-600 dark:text-rose-400">{event.error}</span>
        </DefItem>
      ) : null}
    </DefList>
  );
}

export type { Props as EventDetailSheetProps };
