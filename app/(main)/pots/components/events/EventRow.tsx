"use client";

// One dense console row. Owns no data — caller controls selection, retry
// state, and open state. Status is a StatusDot (pulsing while processing);
// per-row actions live in a quiet kebab menu.

import { Copy, MoreHorizontal, RotateCcw } from "lucide-react";
import type { PotEvent } from "@/services/PotService";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { StatusDot, type StatusTone } from "../kit";
import {
  formatRelative,
  getEffectiveStatus,
  getEventTitle,
  getKindLabel,
  getPayloadPreview,
  getProgressPercent,
  getSourceLabel,
  getStatusLabel,
} from "./format";

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

const STATUS_TONES: Record<string, StatusTone> = {
  done: "ok",
  reconciled: "ok",
  queued: "warn",
  received: "warn",
  processing: "busy",
  error: "error",
  failed: "error",
};

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
  const statusLabel = getStatusLabel(status);
  const tone = STATUS_TONES[status] ?? "idle";
  const title = getEventTitle(event);
  const kind = getKindLabel(event.ingestion_kind);
  const source = getSourceLabel(event);
  const ts = event.received_at || event.submitted_at;
  const preview = getPayloadPreview(event);
  const progress = getProgressPercent(event);
  const repoVisible =
    event.repo_name &&
    event.source_channel !== "ui_raw_ingest" &&
    event.source_system !== "manual";

  // Meta reads "kind · source · time"; kind is dropped when the title
  // already is the kind label (no payload name) to avoid repeating it.
  const meta = [kind !== title ? kind : null, source, ts ? formatRelative(ts) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={cn(
        "group flex items-start gap-3 px-3 py-3 transition-colors",
        highlighted
          ? "bg-primary/5"
          : selected
            ? "bg-muted/50"
            : "hover:bg-muted/40",
      )}
    >
      <div
        className="flex h-5 shrink-0 items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelectChange(v === true)}
          aria-label={`Select event ${event.event_id ?? event.id}`}
        />
      </div>

      <span
        className="flex h-5 shrink-0 items-center"
        title={statusLabel}
      >
        <StatusDot tone={tone} pulse={status === "processing"} />
        <span className="sr-only">{statusLabel}</span>
      </span>

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-sm font-medium text-foreground">
            {title}
          </span>
          {meta ? (
            <span className="shrink-0 whitespace-nowrap text-[13px] text-muted-foreground">
              {meta}
            </span>
          ) : null}
        </div>

        {repoVisible || preview ? (
          <div className="mt-0.5 flex min-w-0 items-center gap-2">
            {repoVisible ? (
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {event.repo_name}
              </span>
            ) : null}
            {preview ? (
              <span
                className="min-w-0 truncate font-mono text-xs text-muted-foreground/70"
                title={preview}
              >
                {preview}
              </span>
            ) : null}
          </div>
        ) : null}

        {event.error ? (
          <div
            className="mt-1 truncate text-[13px] text-rose-600 dark:text-rose-400"
            title={event.error}
          >
            {event.error}
          </div>
        ) : null}

        {progress != null ? (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-1 max-w-56 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </span>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
              {event.step_done}/{event.step_total}
            </span>
          </div>
        ) : null}
      </button>

      <div className="flex h-5 shrink-0 items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground opacity-60 transition-opacity hover:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
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
  );
}
