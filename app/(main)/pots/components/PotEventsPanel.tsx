"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Inbox,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import PotService, {
  PotEvent,
  PotReconciliationRun,
  PotReconciliationWorkEvent,
} from "@/services/PotService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";

type Props = { potId: string };

const PAGE_SIZE = 25;

const LIFECYCLE_LABELS: Record<string, string> = {
  done: "Processed",
  reconciled: "Processed",
  queued: "Queued",
  processing: "Processing",
  error: "Error",
};

const STATUS_COLORS: Record<string, string> = {
  done: "bg-green-500/15 text-green-700 border-green-400/40",
  reconciled: "bg-green-500/15 text-green-700 border-green-400/40",
  queued: "bg-yellow-500/15 text-yellow-700 border-yellow-400/40",
  processing: "bg-blue-500/15 text-blue-700 border-blue-400/40",
  error: "bg-red-500/15 text-red-700 border-red-400/40",
};

const SOURCE_LABELS: Record<string, string> = {
  ui_raw_ingest: "Added from UI",
  manual: "Manual",
  github: "GitHub",
  webhook: "Webhook",
  cli: "CLI",
  http: "API",
  unknown: "Unknown",
};

const KIND_LABELS: Record<string, string> = {
  raw_episode: "Raw note",
  agent_reconciliation: "Agent ingestion",
  github_merged_pr: "Merged PR",
};

const WORK_EVENT_LABELS: Record<string, string> = {
  prompt: "Prompt",
  model_messages: "Messages",
  tool_call: "Tool call",
  tool_result: "Tool result",
  plan_output: "Plan",
  error: "Error",
};

function getEventTitle(ev: PotEvent): string {
  if (ev.payload) {
    const p = ev.payload as Record<string, unknown>;
    if (typeof p.name === "string" && p.name) return p.name;
    if (typeof p.title === "string" && p.title) return p.title;
  }
  return KIND_LABELS[ev.ingestion_kind] ?? ev.ingestion_kind;
}

function getSourceLabel(ev: PotEvent): string {
  if (ev.source_channel && SOURCE_LABELS[ev.source_channel]) {
    return SOURCE_LABELS[ev.source_channel];
  }
  if (ev.source_system && ev.source_system !== "context_engine_raw") {
    return ev.source_system;
  }
  return ev.source_channel ?? ev.source_system ?? "—";
}

function getStatusLabel(status: string): string {
  return LIFECYCLE_LABELS[status] ?? status;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stringifyPayload(value: unknown): string {
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getRunWorkCount(run: PotReconciliationRun): number {
  return Array.isArray(run.work_events) ? run.work_events.length : 0;
}

function getWorkEventTitle(event: PotReconciliationWorkEvent): string {
  return event.title || WORK_EVENT_LABELS[event.event_kind] || event.event_kind;
}

function AgentWorkDetails({
  loading,
  event,
}: {
  loading: boolean;
  event?: PotEvent;
}) {
  if (loading) {
    return (
      <div className="mt-2 rounded-md border border-border/50 bg-muted/20 px-3 py-3">
        <div className="h-3 w-28 rounded bg-muted animate-pulse" />
        <div className="mt-2 h-2.5 w-2/3 rounded bg-muted/70 animate-pulse" />
      </div>
    );
  }

  const runs = event?.reconciliation_runs ?? [];
  const steps = event?.episode_steps ?? [];

  if (!event) return null;

  if (runs.length === 0 && steps.length === 0) {
    return (
      <div className="mt-2 rounded-md border border-border/50 bg-muted/20 px-3 py-3 text-[11px] text-muted-foreground">
        No reconciliation trace is stored for this event.
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-md border border-border/50 bg-muted/15 px-3 py-3">
      {runs.length > 0 ? (
        <div className="space-y-3">
          {runs.map((run) => (
            <div key={run.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  Attempt {run.attempt_number}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] capitalize",
                    run.status === "succeeded"
                      ? "bg-green-500/15 text-green-700 border-green-400/40"
                      : run.status === "failed"
                        ? "bg-red-500/15 text-red-700 border-red-400/40"
                        : "bg-blue-500/15 text-blue-700 border-blue-400/40",
                  )}
                >
                  {run.status}
                </Badge>
                {run.agent_name ? (
                  <span className="text-[11px] text-muted-foreground">
                    {run.agent_name}
                  </span>
                ) : null}
                {run.started_at ? (
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(run.started_at)}
                  </span>
                ) : null}
              </div>

              {run.plan_summary ? (
                <p className="text-xs text-foreground">{run.plan_summary}</p>
              ) : null}

              {run.error ? (
                <p className="text-[11px] text-red-600">{run.error}</p>
              ) : null}

              {Array.isArray(run.work_events) && run.work_events.length > 0 ? (
                <div className="space-y-1.5">
                  {run.work_events.map((workEvent) => (
                    <AgentWorkEventRow key={workEvent.id} event={workEvent} />
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No agent work events captured for this run.
                </p>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {steps.length > 0 ? (
        <div className="border-t border-border/50 pt-2">
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
            Episode steps
          </p>
          <div className="flex flex-wrap gap-1.5">
            {steps.map((step) => (
              <Badge
                key={`${step.sequence}-${step.step_kind}`}
                variant="outline"
                className="max-w-full text-[10px]"
              >
                {step.sequence}. {step.step_kind} · {step.status}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AgentWorkEventRow({ event }: { event: PotReconciliationWorkEvent }) {
  const payloadText = stringifyPayload(event.payload);
  const hasPayload = payloadText.length > 0 && payloadText !== "{}";
  const body = event.body?.trim();

  return (
    <div className="rounded-md border border-border/40 bg-background/70 px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] text-muted-foreground">
          #{event.sequence}
        </span>
        <Badge variant="outline" className="text-[10px]">
          {WORK_EVENT_LABELS[event.event_kind] ?? event.event_kind}
        </Badge>
        <span className="min-w-0 flex-1 truncate text-xs font-medium">
          {getWorkEventTitle(event)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatDate(event.created_at)}
        </span>
      </div>
      {body ? (
        <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-2 text-[11px] leading-4 text-foreground">
          {body}
        </pre>
      ) : null}
      {hasPayload ? (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground">
            Payload
          </summary>
          <pre className="mt-1.5 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-2 text-[11px] leading-4 text-foreground">
            {payloadText}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

export default function PotEventsPanel({ potId }: Props) {
  const [events, setEvents] = useState<PotEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [eventDetails, setEventDetails] = useState<Record<string, PotEvent>>(
    {},
  );
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  // filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const buildOptions = useCallback(
    (cursor?: string) => ({
      limit: PAGE_SIZE,
      cursor,
      status: statusFilter !== "all" ? [statusFilter] : undefined,
      source_system:
        sourceFilter !== "all" && sourceFilter !== "ui_raw_ingest"
          ? [sourceFilter]
          : undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
    }),
    [statusFilter, sourceFilter, fromDate, toDate],
  );

  const load = useCallback(
    async (cursor?: string) => {
      const isFirst = !cursor;
      if (isFirst) setLoading(true);
      else setLoadingMore(true);
      try {
        const opts = buildOptions(cursor);
        // Source channel filter is client-side only (API filters by source_system)
        const page = await PotService.listEvents(potId, opts);
        let items = page.items;
        if (sourceFilter === "ui_raw_ingest") {
          items = items.filter((e) => e.source_channel === "ui_raw_ingest");
        }
        setEvents((prev) => (isFirst ? items : [...prev, ...items]));
        setNextCursor(page.next_cursor);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load events");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [potId, buildOptions, sourceFilter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = () => load();
  const handleLoadMore = () => {
    if (nextCursor) load(nextCursor);
  };

  const toggleDetails = async (eventId: string) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
      return;
    }
    setExpandedEventId(eventId);
    if (eventDetails[eventId]) return;
    setLoadingDetailId(eventId);
    try {
      const detail = await PotService.getEvent(eventId);
      setEventDetails((prev) => ({ ...prev, [eventId]: detail }));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to load event details",
      );
    } finally {
      setLoadingDetailId(null);
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setSourceFilter("all");
    setFromDate("");
    setToDate("");
  };

  const hasActiveFilters =
    statusFilter !== "all" || sourceFilter !== "all" || fromDate || toDate;

  // client-side text search
  const displayed = search.trim()
    ? events.filter((ev) => {
        const q = search.toLowerCase();
        return (
          getEventTitle(ev).toLowerCase().includes(q) ||
          ev.event_id?.toLowerCase().includes(q) ||
          ev.repo_name?.toLowerCase().includes(q) ||
          ev.source_system?.toLowerCase().includes(q) ||
          ev.action?.toLowerCase().includes(q)
        );
      })
    : events;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            Ingestion events
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                "gap-1.5 text-xs",
                (showFilters || hasActiveFilters) && "bg-muted text-foreground",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {hasActiveFilters && (
                <span className="rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0 leading-4">
                  !
                </span>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCcw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Expanded filter row */}
        {showFilters && (
          <div className="mt-2 flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1 min-w-[120px]">
              <span className="text-[11px] text-muted-foreground font-medium">
                Status
              </span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="done">Processed</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1 min-w-[150px]">
              <span className="text-[11px] text-muted-foreground font-medium">
                Source
              </span>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="ui_raw_ingest">Added from UI</SelectItem>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground font-medium">
                From
              </span>
              <Input
                type="datetime-local"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 text-xs w-[175px]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground font-medium">
                To
              </span>
              <Input
                type="datetime-local"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 text-xs w-[175px]"
              />
            </div>

            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearFilters}
                className="h-8 text-xs gap-1 self-end"
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
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
        ) : displayed.length === 0 ? (
          <div className="py-12 text-center">
            <Inbox className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters || search
                ? "No events match your filters."
                : "No ingestion events yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              {displayed.map((ev, idx) => {
                const key = `${ev.id ?? ev.event_id ?? "noid"}-${idx}`;
                const status = ev.lifecycle_status || ev.status;
                const title = getEventTitle(ev);
                const source = getSourceLabel(ev);
                const ts = ev.received_at || ev.submitted_at;
                const eventId = ev.event_id || ev.id;
                const isExpanded = expandedEventId === eventId;
                const detail = eventId ? eventDetails[eventId] : undefined;
                const workEventCount =
                  detail?.reconciliation_runs?.reduce(
                    (sum, run) => sum + getRunWorkCount(run),
                    0,
                  ) ?? 0;

                return (
                  <div
                    key={key}
                    className={cn(
                      "rounded-lg border border-border/60 transition-colors",
                      isExpanded ? "bg-muted/20" : "hover:bg-muted/30",
                    )}
                  >
                    <button
                      type="button"
                      disabled={!eventId}
                      onClick={() => eventId && void toggleDetails(eventId)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-start gap-3 px-3 py-2.5 text-left disabled:cursor-default"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {title}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-[11px] text-muted-foreground">
                            {KIND_LABELS[ev.ingestion_kind] ??
                              ev.ingestion_kind}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            ·
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {source}
                          </span>
                          {ev.repo_name &&
                          ev.source_channel !== "ui_raw_ingest" &&
                          ev.source_system !== "manual" ? (
                            <>
                              <span className="text-[11px] text-muted-foreground">
                                ·
                              </span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {ev.repo_name}
                              </span>
                            </>
                          ) : null}
                          {ts ? (
                            <>
                              <span className="text-[11px] text-muted-foreground">
                                ·
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {formatDate(ts)}
                              </span>
                            </>
                          ) : null}
                          {workEventCount > 0 ? (
                            <>
                              <span className="text-[11px] text-muted-foreground">
                                ·
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {workEventCount} work event
                                {workEventCount !== 1 ? "s" : ""}
                              </span>
                            </>
                          ) : null}
                        </span>
                        {ev.event_id ? (
                          <span className="mt-1 block truncate font-mono text-[10px] text-muted-foreground">
                            {ev.event_id}
                          </span>
                        ) : null}
                        {ev.error ? (
                          <span className="mt-1.5 block truncate text-[11px] text-red-600">
                            {ev.error}
                          </span>
                        ) : null}
                        {ev.step_total != null && ev.step_total > 0 ? (
                          <span className="mt-1.5 flex items-center gap-2">
                            <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                              <span
                                className="block h-full rounded-full bg-primary transition-all"
                                style={{
                                  width: `${Math.round(((ev.step_done ?? 0) / ev.step_total) * 100)}%`,
                                }}
                              />
                            </span>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {ev.step_done}/{ev.step_total}
                            </span>
                          </span>
                        ) : null}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "mt-0.5 shrink-0 text-[10px] capitalize",
                          STATUS_COLORS[status] ??
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {getStatusLabel(status)}
                      </Badge>
                    </button>
                    {isExpanded ? (
                      <div className="border-t border-border/50 px-3 pb-3">
                        <AgentWorkDetails
                          loading={loadingDetailId === eventId}
                          event={detail}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {nextCursor && !search && (
              <div className="mt-3 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="text-xs"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}

            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              {displayed.length} event{displayed.length !== 1 ? "s" : ""}
              {nextCursor && !search ? " (more available)" : ""}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
