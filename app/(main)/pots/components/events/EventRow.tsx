"use client";

import { MoreHorizontal, RotateCcw, Copy } from "lucide-react";
import type { PotEvent } from "@/services/PotService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EventStatusBadge } from "./EventStatusBadge";
import {
  formatRelative,
  getEffectiveStatus,
  getEventTitle,
  getKindLabel,
  getProgressPercent,
  getSourceLabel,
} from "./format";
import { ACTIVE_STATUSES } from "./constants";

type Props = {
  event: PotEvent;
  selected: boolean;
  onSelectChange: (selected: boolean) => void;
  onOpen: () => void;
  onCopyId: () => void;
  onRetry: () => void;
  retrying: boolean;
  highlighted?: boolean; // For the currently-open detail
};

// One row. Owns no data — caller controls selection, retry state, and open state.
// The kebab menu collects per-row actions so the row stays visually quiet.
export function EventRow({
  event,
  selected,
  onSelectChange,
  onOpen,
  onCopyId,
  onRetry,
  retrying,
  highlighted,
}: Props) {
  const status = getEffectiveStatus(event);
  const title = getEventTitle(event);
  const source = getSourceLabel(event);
  const ts = event.received_at || event.submitted_at;
  const progress = getProgressPercent(event);
  const isActive = ACTIVE_STATUSES.has(status);
  const repoVisible =
    event.repo_name &&
    event.source_channel !== "ui_raw_ingest" &&
    event.source_system !== "manual";

  return (
    <div
      className={cn(
        "group rounded-lg border transition-colors",
        highlighted
          ? "border-primary/60 bg-primary/5"
          : selected
            ? "border-primary/40 bg-muted/30"
            : "border-border/60 hover:bg-muted/30",
      )}
    >
      <div className="flex w-full items-start gap-3 px-3 py-2.5">
        <div
          className="mt-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onSelectChange(v === true)}
            aria-label={`Select event ${event.event_id ?? event.id}`}
          />
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isActive && (
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 animate-pulse"
                />
              )}
              <span className="block truncate text-sm font-medium">{title}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-[11px] text-muted-foreground">
                {getKindLabel(event.ingestion_kind)}
              </span>
              <span className="text-[11px] text-muted-foreground">·</span>
              <span className="text-[11px] text-muted-foreground">{source}</span>
              {repoVisible ? (
                <>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {event.repo_name}
                  </span>
                </>
              ) : null}
              {ts ? (
                <>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelative(ts)}
                  </span>
                </>
              ) : null}
            </div>
            {event.event_id ? (
              <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                {event.event_id}
              </div>
            ) : null}
            {event.error ? (
              <div className="mt-1.5 truncate text-[11px] text-red-600">
                {event.error}
              </div>
            ) : null}
            {progress != null ? (
              <div className="mt-1.5 flex items-center gap-2">
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {event.step_done}/{event.step_total}
                </span>
              </div>
            ) : null}
          </div>
        </button>

        <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
          <EventStatusBadge status={status} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground opacity-60 hover:opacity-100"
                aria-label="Row actions"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={onRetry}
                disabled={retrying}
                className="gap-2 text-xs"
              >
                <RotateCcw className={cn("h-3.5 w-3.5", retrying && "animate-spin")} />
                {retrying
                  ? "Re-queuing…"
                  : status === "error"
                    ? "Retry ingestion"
                    : "Reprocess"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopyId} className="gap-2 text-xs">
                <Copy className="h-3.5 w-3.5" />
                Copy event ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// Re-export Badge so consumers don't need to import twice.
export { Badge };
