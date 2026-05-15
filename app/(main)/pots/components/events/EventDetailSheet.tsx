"use client";

// Side-panel detail view for a single event. Replaces the accordion expansion.
// Holds three tabs (Summary, Activity, Payload). In Phase 1 the Activity tab
// becomes the live-streaming surface; Phase 0 just shows persisted data.

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
import { cn } from "@/lib/utils";
import type { PotEvent } from "@/services/PotService";
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

  // Live tool-call count from the stream — shown as a chip in the header so
  // the user sees progress at a glance. Falls back to persisted count for
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
        className="w-full sm:max-w-xl flex h-full flex-col overflow-hidden p-0"
      >
        <SheetHeader className="space-y-2 border-b border-border/60 px-5 py-4 text-left">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate pr-8 text-base font-semibold">
                {title}
              </SheetTitle>
              <SheetDescription className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {event ? getKindLabel(event.ingestion_kind) : ""}
                {event ? ` · ${getSourceLabel(event)}` : ""}
              </SheetDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {status ? <EventStatusBadge status={status} /> : null}
            {liveActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                Live
              </span>
            ) : null}
            {event?.received_at ? (
              <span className="text-[11px] text-muted-foreground">
                Received {formatDate(event.received_at)}
              </span>
            ) : null}
            {workCount > 0 ? (
              <span className="text-[11px] text-muted-foreground">
                · {workCount} tool{workCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          {event?.event_id ? (
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              {event.event_id}
            </p>
          ) : null}

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs"
              disabled={!eventId || retrying}
              onClick={() => eventId && onRetry(eventId)}
            >
              <RotateCcw className={cn("h-3 w-3", retrying && "animate-spin")} />
              {retrying ? "Re-queuing…" : "Reprocess"}
            </Button>
          </div>
        </SheetHeader>

        {isError ? (
          <div className="px-5 py-4 text-sm text-red-600">
            {error?.message ?? "Failed to load event"}
          </div>
        ) : (
          <Tabs defaultValue="activity" className="flex flex-1 flex-col overflow-hidden">
            <div className="px-5 pt-2">
              <TabsList className="h-8">
                <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
                <TabsTrigger value="activity" className="text-xs">
                  Activity {workCount > 0 ? `· ${workCount}` : null}
                </TabsTrigger>
                <TabsTrigger value="payload" className="text-xs">Payload</TabsTrigger>
              </TabsList>
            </div>
            <Separator />

            <TabsContent value="summary" className="flex-1 overflow-y-auto px-5 py-4">
              <SummaryTab event={event} loading={isLoading && !event} />
            </TabsContent>
            <TabsContent
              value="activity"
              className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
            >
              {/* Live entries come first — this is the surface the user
                  cares about while the agent is running. Persisted runs
                  show below as a permanent record. */}
              {activity.entries.length > 0 || liveActive ? (
                <LiveActivityTimeline state={activity} live={liveActive} />
              ) : null}
              <AgentActivityTimeline event={event} loading={isLoading && !event} />
            </TabsContent>
            <TabsContent value="payload" className="flex-1 overflow-y-auto px-5 py-4">
              {event ? (
                <EventPayloadView event={event} />
              ) : isLoading ? (
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              ) : (
                <p className="text-xs text-muted-foreground">No payload.</p>
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
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
        <div className="h-2.5 w-2/3 rounded bg-muted/70 animate-pulse" />
      </div>
    );
  }
  if (!event) {
    return <p className="text-xs text-muted-foreground">No event selected.</p>;
  }
  const rows: Array<[string, React.ReactNode]> = [
    ["Kind", getKindLabel(event.ingestion_kind)],
    ["Source", getSourceLabel(event)],
  ];
  if (event.repo_name) rows.push(["Repository", <span key="r" className="font-mono">{event.repo_name}</span>]);
  if (event.event_type) rows.push(["Event type", event.event_type]);
  if (event.action) rows.push(["Action", event.action]);
  if (event.received_at) rows.push(["Received", formatDate(event.received_at)]);
  if (event.completed_at) rows.push(["Completed", formatDate(event.completed_at)]);
  if (event.error) rows.push(["Error", <span key="e" className="text-red-600">{event.error}</span>]);

  return (
    <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="col-span-1 text-[11px] uppercase tracking-wide text-muted-foreground">{k}</dt>
          <dd className="col-span-2 min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export type { Props as EventDetailSheetProps };
