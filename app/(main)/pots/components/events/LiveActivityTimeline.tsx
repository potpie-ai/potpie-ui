"use client";

// Live activity feed for one event, drawn as a clean vertical timeline:
// a hairline spine with one dot per entry (accent pulse while running,
// emerald when resolved, rose on error), mono timestamps, mono blocks for
// call/result payloads.
//
// Behavior (unchanged):
//   - tool_call rows fold in their paired tool_result (by tool_call_id,
//     name-FIFO fallback) — running tools show a live elapsed timer
//   - sticky "follow latest" auto-scroll that releases on user scroll-up
//   - empty / loading / error states
//
// The timeline is presentational only — its inputs are the ActivityStreamState
// from `useEventActivityStream` and a `live` flag.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { StatusDot, type StatusTone } from "../kit";
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

const KIND_META: Record<string, { label: string; tone: StatusTone }> = {
  prompt: { label: "Prompt", tone: "idle" },
  plan_output: { label: "Plan", tone: "ok" },
  model_messages: { label: "Thinking", tone: "idle" },
  thinking: { label: "Thinking", tone: "idle" },
  text: { label: "Response", tone: "idle" },
  run_started: { label: "Run started", tone: "idle" },
  chunk_marker: { label: "Chunk", tone: "idle" },
  mutation_applied: { label: "Graph updated", tone: "ok" },
  event_processed: { label: "Event reconciled", tone: "ok" },
  tool_call: { label: "Tool", tone: "busy" },
  tool_result: { label: "Tool result", tone: "idle" },
  status: { label: "Status", tone: "warn" },
  error: { label: "Error", tone: "error" },
};

function metaFor(kind: string) {
  return KIND_META[kind] ?? { label: kind, tone: "idle" as StatusTone };
}

// Marker dot sitting on the timeline spine.
function Marker({
  tone,
  pulse = false,
}: {
  tone: StatusTone;
  pulse?: boolean;
}) {
  return (
    <span aria-hidden className="absolute left-0 top-[5px]">
      <StatusDot tone={tone} pulse={pulse} />
    </span>
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
    <div>
      <div className="flex items-center justify-between gap-2 pb-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h3 className="text-sm font-semibold text-foreground">Activity</h3>
          {live ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <StatusDot tone="busy" pulse />
              live
            </span>
          ) : state.ended ? (
            <span className="text-[13px] text-muted-foreground">ended</span>
          ) : null}
          {toolCount > 0 ? (
            <span className="font-mono text-xs text-muted-foreground">
              {toolCount} tool{toolCount === 1 ? "" : "s"}
              {runningCount > 0 ? ` · ${runningCount} running` : ""}
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
            className="inline-flex items-center gap-1 text-[13px] font-medium text-primary transition-colors hover:text-primary/80"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Jump to latest
          </button>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-[460px] overflow-y-auto"
      >
        {rows.length > 0 ? (
          <div className="relative">
            {/* the spine */}
            <div
              aria-hidden
              className="absolute bottom-2 left-[3.5px] top-2 w-px bg-border/70"
            />
            <div className="space-y-4">
              {rows.map((row) => (
                <TimelineRowView key={row.id} row={row} ended={state.ended} />
              ))}
            </div>
          </div>
        ) : null}
        {state.error && !live ? (
          <p className="mt-3 pl-5 text-[13px] text-rose-600 dark:text-rose-400">
            {state.error}
          </p>
        ) : null}
        {rows.length === 0 && live ? (
          <p className="py-8 text-center text-[13px] text-muted-foreground">
            Waiting for the agent to start…
          </p>
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

  return (
    <div className="relative pl-5">
      <Marker
        tone={running ? "busy" : unresolved ? "idle" : "ok"}
        pulse={running}
      />
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-sm font-medium text-foreground">{toolLabel}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {rawToolName}
        </span>
        {duration != null ? (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {formatDuration(duration)}
          </span>
        ) : null}
        {running ? (
          <span className="text-xs font-medium text-muted-foreground">
            running
          </span>
        ) : unresolved ? (
          <span className="text-xs text-muted-foreground">
            no result recorded
          </span>
        ) : null}
        {row.entry.sequence != null ? (
          <span className="ml-auto font-mono text-xs text-muted-foreground/60">
            #{row.entry.sequence}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {expanded ? "Hide" : "Show"} call & result
      </button>
      {expanded ? (
        <div className="mt-1.5 space-y-2">
          <KvBlock label="Arguments" entry={row.entry} preferBody />
          {row.result ? (
            <KvBlock label="Result" entry={row.result} preferBody />
          ) : (
            <p className="text-xs italic text-muted-foreground">
              {running ? "awaiting result…" : "No result recorded."}
            </p>
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
  return (
    <p className="mt-1 font-mono text-xs text-muted-foreground">
      <span className="text-emerald-700 dark:text-emerald-400">
        +{nodes} nodes
      </span>
      {" · "}
      <span className="text-emerald-700 dark:text-emerald-400">
        +{edges} edges
      </span>
      {" · "}
      <span className="text-emerald-700 dark:text-emerald-400">
        +{episodes} episodes
      </span>
    </p>
  );
}

function SimpleRow({ entry, kind }: { entry: ActivityEntry; kind: string }) {
  const meta = metaFor(kind);
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
    <div className="relative pl-5">
      <Marker tone={meta.tone} pulse={isStreamingPart} />
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {entry.title ? (
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {entry.title}
          </span>
        ) : null}
        {isStreamingPart ? (
          <span className="text-xs text-muted-foreground">streaming</span>
        ) : null}
        {entry.status ? (
          <span className="text-xs capitalize text-muted-foreground">
            {entry.status}
          </span>
        ) : null}
        {entry.sequence != null ? (
          <span className="ml-auto font-mono text-xs text-muted-foreground/60">
            #{entry.sequence}
          </span>
        ) : null}
        {entry.createdAt ? (
          <span className="font-mono text-xs text-muted-foreground">
            {formatRelative(entry.createdAt)}
          </span>
        ) : null}
      </div>
      {kind === "mutation_applied" ? (
        <MutationCounts payload={entry.payload} />
      ) : entry.body ? (
        <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-2.5 font-mono text-xs leading-5 text-foreground">
          {entry.body}
          {isStreamingPart ? (
            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-accent align-middle" />
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
  const text =
    preferBody && entry.body ? entry.body : stringifyPayload(entry.payload);
  if (!text || text === "{}") return null;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">
        {label}
      </p>
      <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-2.5 font-mono text-xs leading-5 text-foreground">
        {text}
      </pre>
    </div>
  );
}
