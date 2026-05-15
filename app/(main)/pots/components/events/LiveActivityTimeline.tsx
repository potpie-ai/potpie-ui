"use client";

// Live activity feed for one event. Polished surface (Phase 2):
//   - Per-kind cards: plan, tool_call (with paired tool_result), model_messages, error, status
//   - Running tools show shimmer + live elapsed timer
//   - Completed tools show duration + result preview
//   - Sticky "follow latest" auto-scroll that releases on user scroll-up
//   - Empty / loading / error states
//
// The timeline is presentational only — its inputs are the ActivityStreamState
// from `useEventActivityStream` and a `live` flag.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Layers,
  Loader2,
  MessageSquare,
  Network,
  Play,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatDuration,
  formatRelative,
  getToolLabel,
  pickThinkingLabel,
  stringifyPayload,
} from "./format";
import type { ActivityEntry, ActivityStreamState } from "./useEventStream";

type Props = {
  state: ActivityStreamState;
  live: boolean;
};

// One row of the merged timeline. A tool_call gets its tool_result attached;
// any other kind stands alone.
type TimelineRow = {
  id: string;
  kind: string;
  entry: ActivityEntry;
  // For tool_call rows, the paired tool_result (if landed).
  result?: ActivityEntry;
};

const KIND_META: Record<
  string,
  {
    icon: typeof Wrench;
    label: string;
    border: string;
    iconColor: string;
  }
> = {
  prompt: {
    icon: ClipboardList,
    label: "Prompt",
    border: "border-border/40",
    iconColor: "text-muted-foreground",
  },
  plan_output: {
    icon: Sparkles,
    label: "Plan",
    border: "border-emerald-300/60",
    iconColor: "text-emerald-700",
  },
  model_messages: {
    icon: MessageSquare,
    label: "Thinking",
    border: "border-violet-300/60",
    iconColor: "text-violet-700",
  },
  thinking: {
    icon: Brain,
    label: "Thinking",
    border: "border-violet-300/60",
    iconColor: "text-violet-700",
  },
  text: {
    icon: Sparkles,
    label: "Response",
    border: "border-violet-300/60",
    iconColor: "text-violet-700",
  },
  run_started: {
    icon: Play,
    label: "Run started",
    border: "border-border/40",
    iconColor: "text-muted-foreground",
  },
  chunk_marker: {
    icon: Layers,
    label: "Chunk",
    border: "border-border/40",
    iconColor: "text-muted-foreground",
  },
  mutation_applied: {
    icon: Network,
    label: "Graph updated",
    border: "border-emerald-300/60",
    iconColor: "text-emerald-700",
  },
  event_processed: {
    icon: CheckCircle2,
    label: "Event reconciled",
    border: "border-emerald-300/60",
    iconColor: "text-emerald-700",
  },
  tool_call: {
    icon: Wrench,
    label: "Tool",
    border: "border-blue-300/60",
    iconColor: "text-blue-700",
  },
  tool_result: {
    icon: Wrench,
    label: "Tool result",
    border: "border-blue-300/60",
    iconColor: "text-blue-700",
  },
  status: {
    icon: Loader2,
    label: "Status",
    border: "border-amber-300/60",
    iconColor: "text-amber-700",
  },
  error: {
    icon: AlertCircle,
    label: "Error",
    border: "border-red-300/60",
    iconColor: "text-red-700",
  },
};

function metaFor(kind: string) {
  return (
    KIND_META[kind] ?? {
      icon: ClipboardList,
      label: kind,
      border: "border-border/40",
      iconColor: "text-muted-foreground",
    }
  );
}

function toolNameFromEntry(entry: ActivityEntry): string | null {
  // The backend stream handler puts ``tool_name`` in the payload for both
  // tool_call and tool_result records (see pydantic_deep_agent.py).
  if (entry.payload && typeof entry.payload === "object") {
    const name = (entry.payload as Record<string, unknown>)["tool_name"];
    if (typeof name === "string" && name) return name;
  }
  return entry.title;
}

function toolCallIdFromEntry(entry: ActivityEntry): string | null {
  // pydantic-ai assigns a unique ``tool_call_id`` to every call and echoes
  // it on the matching result — the only reliable pairing key. The agent
  // emits several calls in one model turn and the results land afterwards
  // interleaved, so positional / tool-name pairing mis-attributes them
  // (that's the "event done but a tool still spinning" bug).
  if (entry.payload && typeof entry.payload === "object") {
    const id = (entry.payload as Record<string, unknown>)["tool_call_id"];
    if (typeof id === "string" && id) return id;
  }
  return null;
}

// Build the rendered timeline. Every entry keeps its chronological slot —
// nothing is skipped or reordered — and each tool_call has its tool_result
// folded into it (matched by tool_call_id, with a name-FIFO fallback for
// id-less payloads). A result no call claimed renders standalone so it is
// never silently dropped; a call whose result hasn't landed renders as
// "running" (or, once the run ended, as resolved-without-result).
function buildTimeline(entries: ActivityEntry[]): TimelineRow[] {
  const results = entries.filter((e) => e.kind === "tool_result");
  const resultByCallId = new Map<string, ActivityEntry>();
  for (const r of results) {
    const cid = toolCallIdFromEntry(r);
    if (cid && !resultByCallId.has(cid)) resultByCallId.set(cid, r);
  }
  // FIFO fallback queues, only consulted when a call carries no id.
  const resultsByName = new Map<string, ActivityEntry[]>();
  for (const r of results) {
    const name = toolNameFromEntry(r) ?? "";
    const q = resultsByName.get(name);
    if (q) q.push(r);
    else resultsByName.set(name, [r]);
  }

  const resultForCall = new Map<string, ActivityEntry>(); // call.id -> result
  const claimed = new Set<string>(); // result.id consumed by some call
  for (const e of entries) {
    if (e.kind !== "tool_call") continue;
    const cid = toolCallIdFromEntry(e);
    let result: ActivityEntry | undefined;
    if (cid) {
      result = resultByCallId.get(cid);
    } else {
      const q = resultsByName.get(toolNameFromEntry(e) ?? "");
      if (q) {
        while (q.length && claimed.has(q[0].id)) q.shift();
        result = q.shift();
      }
    }
    if (result && !claimed.has(result.id)) {
      claimed.add(result.id);
      resultForCall.set(e.id, result);
    }
  }

  const rows: TimelineRow[] = [];
  for (const e of entries) {
    if (e.kind === "tool_call") {
      rows.push({
        id: e.id,
        kind: "tool_call",
        entry: e,
        result: resultForCall.get(e.id),
      });
      continue;
    }
    // A result folded into its call row isn't repeated; an unclaimed one
    // (genuine orphan) still shows so nothing is lost. Every other kind
    // (thinking / text / mutation_applied / status / …) keeps its place.
    if (e.kind === "tool_result" && claimed.has(e.id)) continue;
    rows.push({ id: e.id, kind: e.kind, entry: e });
  }
  return rows;
}

export function LiveActivityTimeline({ state, live }: Props) {
  const rows = useMemo(() => buildTimeline(state.entries), [state.entries]);
  const toolCount = useMemo(
    () => rows.filter((r) => r.kind === "tool_call").length,
    [rows],
  );
  // Only "running" while the run is actually in flight. Once it ends, an
  // unpaired call is resolved-without-result, not perpetually spinning.
  const runningCount = useMemo(
    () =>
      state.ended
        ? 0
        : rows.filter((r) => r.kind === "tool_call" && !r.result).length,
    [rows, state.ended],
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [stickyFollow, setStickyFollow] = useState(true);

  // Detach follow when the user scrolls up; re-attach when they scroll
  // back near the bottom. Less surprising than a hard toggle.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setStickyFollow(nearBottom);
  }, []);

  useEffect(() => {
    if (!stickyFollow) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [rows.length, stickyFollow, live]);

  if (rows.length === 0 && !live) return null;

  return (
    <div className="rounded-md border border-border/50 bg-muted/15">
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Activity
          </p>
          {live ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-1.5 py-0 text-[10px] font-medium text-blue-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
              live
            </span>
          ) : state.ended ? (
            <span className="text-[10px] text-muted-foreground">ended</span>
          ) : null}
          {toolCount > 0 ? (
            <span className="text-[10px] text-muted-foreground">
              · {toolCount} tool{toolCount === 1 ? "" : "s"}
              {runningCount > 0 ? ` (${runningCount} running)` : ""}
            </span>
          ) : null}
        </div>
        {!stickyFollow && rows.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setStickyFollow(true);
              const el = scrollRef.current;
              if (el) el.scrollTop = el.scrollHeight;
            }}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 hover:text-blue-900"
          >
            <ChevronDown className="h-3 w-3" />
            Jump to latest
          </button>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-[460px] space-y-1.5 overflow-y-auto px-3 py-3"
      >
        {rows.map((row) => (
          <TimelineRowView key={row.id} row={row} ended={state.ended} />
        ))}
        {state.error && !live ? (
          <div className="rounded-md border border-red-300/40 bg-red-50/40 px-2 py-1.5 text-[11px] text-red-700">
            {state.error}
          </div>
        ) : null}
        {rows.length === 0 && live ? (
          <div className="rounded-md border border-dashed border-border/60 bg-background/40 px-3 py-6 text-center text-[11px] text-muted-foreground">
            Waiting for the agent to start…
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TimelineRowView({
  row,
  ended,
}: {
  row: TimelineRow;
  ended: boolean;
}) {
  if (row.kind === "tool_call") return <ToolCallRow row={row} ended={ended} />;
  return <SimpleRow entry={row.entry} kind={row.kind} />;
}

function ToolCallRow({ row, ended }: { row: TimelineRow; ended: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const meta = metaFor("tool_call");
  // The result landed → resolved. No result yet but the run is still going
  // → running. No result and the run ended → resolved without a recorded
  // result (the agent finished; we just never streamed/persisted the
  // return). Never leave a call spinning forever once the run is over.
  const running = !row.result && !ended;
  const unresolved = !row.result && ended;
  const callTime = row.entry.createdAt;
  const resultTime = row.result?.createdAt;
  const [now, setNow] = useState(() => Date.now());

  // Tick the live elapsed counter for running calls only. Single interval
  // per row so a long batch with many tools doesn't burn CPU.
  useEffect(() => {
    if (!running || !callTime) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [running, callTime]);

  const duration = useMemo(() => {
    if (!callTime) return null;
    const start = new Date(callTime).getTime();
    if (Number.isNaN(start)) return null;
    if (running) return now - start;
    if (!resultTime) return null; // unresolved: end time unknown
    const end = new Date(resultTime).getTime();
    if (Number.isNaN(end)) return null;
    return Math.max(0, end - start);
  }, [callTime, resultTime, running, now]);

  const rawToolName = toolNameFromEntry(row.entry) ?? "tool";
  const toolLabel = getToolLabel(rawToolName);
  const Icon = running ? Loader2 : CheckCircle2;
  const iconColor = running
    ? "text-blue-600"
    : unresolved
      ? "text-muted-foreground"
      : "text-emerald-600";

  return (
    <div className={cn("rounded-md border bg-background/70 px-2.5 py-2", meta.border)}>
      <div className="flex flex-wrap items-center gap-2">
        <Icon
          className={cn("h-3.5 w-3.5 shrink-0", iconColor, running && "animate-spin")}
        />
        <span className="text-xs font-medium">{toolLabel}</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {rawToolName}
        </span>
        {duration != null ? (
          <Badge variant="outline" className="text-[10px]">
            {formatDuration(duration)}
          </Badge>
        ) : null}
        {running ? (
          <Badge
            variant="outline"
            className="border-blue-300/60 bg-blue-50/40 text-[10px] text-blue-700"
          >
            running
          </Badge>
        ) : unresolved ? (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            no result recorded
          </Badge>
        ) : null}
        {row.entry.sequence != null ? (
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            #{row.entry.sequence}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {expanded ? "Hide" : "Show"} call & result
      </button>
      {expanded ? (
        <div className="mt-1.5 space-y-1.5">
          <KvBlock label="Arguments" entry={row.entry} preferBody />
          {row.result ? (
            <KvBlock label="Result" entry={row.result} preferBody />
          ) : (
            <div className="rounded bg-muted/40 px-2 py-1 text-[11px] italic text-muted-foreground">
              {running ? "awaiting result…" : "No result recorded."}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function MutationCounts({ payload }: { payload: Record<string, unknown> | null }) {
  const counts = (payload?.counts ?? {}) as Record<string, number>;
  const nodes = Number(counts.entity_upserts_applied ?? 0) || 0;
  const edges =
    (Number(counts.edge_upserts_applied ?? 0) || 0) +
    (Number(counts.edge_deletes_applied ?? 0) || 0);
  const episodes = Number(counts.episodes_written ?? 0) || 0;
  const chips: Array<[string, number, string]> = [
    ["nodes", nodes, "text-violet-700 bg-violet-500/10 border-violet-300/50"],
    ["edges", edges, "text-blue-700 bg-blue-500/10 border-blue-300/50"],
    ["episodes", episodes, "text-emerald-700 bg-emerald-500/10 border-emerald-300/50"],
  ];
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {chips.map(([label, n, tone]) => (
        <span
          key={label}
          className={cn(
            "rounded border px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
            tone,
          )}
        >
          +{n} {label}
        </span>
      ))}
    </div>
  );
}

function SimpleRow({ entry, kind }: { entry: ActivityEntry; kind: string }) {
  const meta = metaFor(kind);
  const Icon = meta.icon;
  const isStreamingPart =
    (kind === "text" || kind === "thinking") && entry.done === false;
  // The backend flattens every reasoning chunk to one `thinking` record
  // type, so a static "Thinking" badge repeats dozens of times on a
  // reasoning model. Rotate a verb keyed off the part id (stable for the
  // life of the part) so the label is varied but doesn't flicker as the
  // part streams in.
  const label =
    kind === "thinking" || kind === "model_messages"
      ? pickThinkingLabel(entry.partId ?? entry.id)
      : meta.label;
  return (
    <div className={cn("rounded-md border bg-background/70 px-2.5 py-2", meta.border)}>
      <div className="flex flex-wrap items-center gap-2">
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            meta.iconColor,
            isStreamingPart && "animate-pulse",
          )}
        />
        <Badge variant="outline" className="text-[10px]">
          {label}
        </Badge>
        {entry.title ? (
          <span className="min-w-0 flex-1 truncate text-xs font-medium">
            {entry.title}
          </span>
        ) : null}
        {isStreamingPart ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-1.5 text-[10px] font-medium text-violet-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" />
            streaming
          </span>
        ) : null}
        {entry.status ? (
          <Badge variant="outline" className="text-[10px] capitalize">
            {entry.status}
          </Badge>
        ) : null}
        {entry.sequence != null ? (
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            #{entry.sequence}
          </span>
        ) : null}
        {entry.createdAt ? (
          <span className="text-[10px] text-muted-foreground">
            {formatRelative(entry.createdAt)}
          </span>
        ) : null}
      </div>
      {kind === "mutation_applied" ? (
        <MutationCounts payload={entry.payload} />
      ) : entry.body ? (
        <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-[11px] leading-4 text-foreground">
          {entry.body}
          {isStreamingPart ? (
            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-violet-500 align-middle" />
          ) : null}
        </pre>
      ) : null}
    </div>
  );
}

function KvBlock({
  label,
  entry,
  preferBody,
}: {
  label: string;
  entry: ActivityEntry;
  preferBody?: boolean;
}) {
  // Prefer body text when present (short summary) — fall back to payload
  // JSON. Long bodies are clipped via max-h on the <pre>.
  if (preferBody && entry.body) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <pre className="mt-0.5 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-[11px] leading-4 text-foreground">
          {entry.body}
        </pre>
      </div>
    );
  }
  const text = stringifyPayload(entry.payload);
  if (!text || text === "{}") return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <pre className="mt-0.5 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-[11px] leading-4 text-foreground">
        {text}
      </pre>
    </div>
  );
}
