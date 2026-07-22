"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  FileCode,
  Loader2,
  Search,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SharedMarkdown } from "@/components/chat/SharedMarkdown";
import { ToolResultContent } from "@/components/stream/ToolResultContent";
import { cn, normalizeMarkdownForPreview } from "@/lib/utils";

const TOOL_RESULT_PREVIEW_LENGTH = 52;
/** Height of the stream area so it extends down toward the chat input */
export const STREAM_TIMELINE_DEFAULT_MAX_HEIGHT = "min(70vh, 560px)";

function toolResultPreview(result: string | undefined): string {
  if (!result || !result.trim()) return "";
  const oneLine = result.replace(/\s+/g, " ").trim();
  if (oneLine.length <= TOOL_RESULT_PREVIEW_LENGTH) return oneLine;
  return oneLine.slice(0, TOOL_RESULT_PREVIEW_LENGTH) + "…";
}

/** A graph entity referenced by a context-engine query result. */
export type StreamGraphNode = {
  /** Entity key in the pot graph, e.g. "component:vector-sets-module". */
  key: string;
  name: string;
  /** Ontology label, e.g. "Component", "Decision", "Issue". */
  label: string;
  /** Deep link into the pot graph explorer (?focus=<key>). */
  href?: string;
  /** Marks the layout hub of the mini graph; defaults to the first node. */
  hub?: boolean;
};

export type StreamGraphEdge = { from: string; type: string; to: string };

/** Structured payload rendered inside a Context Engine accordion. */
export type StreamToolGraph = {
  /** The graph query text, shown verbatim in the query panel. */
  query: string;
  /** Short prose takeaway shown between the query and the subgraph. */
  summary?: string;
  nodes: StreamGraphNode[];
  edges: StreamGraphEdge[];
};

export type StreamTimelineItem =
  | { type: "chunk"; id: string; content: string }
  | {
      type: "tool";
      id: string;
      label: string;
      phase: "running" | "done";
      result?: string;
      graph?: StreamToolGraph;
    };

type ToolItem = Extract<StreamTimelineItem, { type: "tool" }>;

/** Visual family for a tool call, keyed off the tool label the backend streams. */
type ToolKind = "context-engine" | "file" | "terminal" | "search" | "generic";

function toolKind(label: string): ToolKind {
  const l = label.toLowerCase();
  if (
    /knowledge[-_ ]?graph|context[-_ ]?engine|graph[-_ ]?quer|ask_knowledge|semantic|vector|embedding|context[-_ ]?quer/.test(
      l,
    )
  ) {
    return "context-engine";
  }
  if (
    /read[-_ ]?file|view[-_ ]?file|open[-_ ]?file|get[-_ ]?file|fetch[-_ ]?file|list[-_ ]?file|read[-_ ]?code|get[-_ ]?code/.test(
      l,
    )
  ) {
    return "file";
  }
  if (/bash|shell|terminal|command|execute/.test(l)) return "terminal";
  if (/search|grep|glob|find/.test(l)) return "search";
  return "generic";
}

const TOOL_KIND_STYLES: Record<
  Exclude<ToolKind, "context-engine">,
  { icon: React.ElementType; iconBg: string; iconColor: string }
> = {
  file: { icon: FileCode, iconBg: "bg-sky-50", iconColor: "text-sky-600" },
  terminal: { icon: Terminal, iconBg: "bg-zinc-100", iconColor: "text-zinc-700" },
  search: { icon: Search, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
  generic: { icon: Wrench, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
};

type StreamTimelineProps = {
  items: StreamTimelineItem[];
  className?: string;
  /** Ref for scroll-into-view at end */
  endRef?: React.RefObject<HTMLDivElement>;
  /** Show loading dots at the end while agent is still responding */
  loading?: boolean;
  /** Override scroll container max-height (default: min(70vh, 560px)) */
  maxHeight?: string;
  /** Use a shorter max-height for expanded tool result bodies */
  compactToolResults?: boolean;
};

/** Bouncing dots shown at the end of the stream while the agent is still responding */
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-1.5 py-2 min-h-[28px]", className)}
      role="status"
      aria-label="Agent is responding"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-[#102C2C]/70 animate-loading-dot"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </div>
  );
}

// Node colours mirror the ontology category palette in
// app/(main)/pots/components/graph/ontology.ts so entities read the same here
// as they do on the pot graph canvas.
const GRAPH_LABEL_HEX: Record<string, string> = {
  Pot: "#0ea5e9", Repository: "#0ea5e9", System: "#0ea5e9", Service: "#0ea5e9", Environment: "#0ea5e9",
  Capability: "#8b5cf6", Feature: "#8b5cf6", Component: "#8b5cf6", Interface: "#8b5cf6", DataStore: "#8b5cf6", DataModel: "#8b5cf6",
  PullRequest: "#f59e0b", Commit: "#f59e0b", Issue: "#f59e0b", Decision: "#f59e0b", Constraint: "#f59e0b", Preference: "#f59e0b",
  Deployment: "#10b981", Runbook: "#10b981", Script: "#10b981", Alert: "#10b981", ConfigVariable: "#10b981", Release: "#10b981",
  BugPattern: "#f43f5e", Investigation: "#f43f5e", Fix: "#f43f5e", Incident: "#f43f5e",
  Document: "#6366f1", Conversation: "#6366f1", Episode: "#6366f1", SourceRef: "#6366f1",
  Person: "#14b8a6", Team: "#14b8a6", Agent: "#14b8a6",
};

function graphLabelHex(label: string): string {
  return GRAPH_LABEL_HEX[label] ?? "#94a3b8";
}

function clipGraphName(name: string, max: number): string {
  return name.length > max ? `${name.slice(0, max - 1).trimEnd()}…` : name;
}

/** Radial hub-and-spoke rendering of a matched subgraph. Nodes with an href navigate to the pot graph. */
function TraceMiniGraph({ graph }: { graph: StreamToolGraph }) {
  const router = useRouter();
  const hub = graph.nodes.find((n) => n.hub) ?? graph.nodes[0];
  if (!hub) return null;
  const spokes = graph.nodes.filter((n) => n.key !== hub.key);
  const W = 560;
  const H = 224;
  const cx = W / 2;
  const cy = H / 2 - 6;
  const pos = new Map<string, { x: number; y: number }>([
    [hub.key, { x: cx, y: cy }],
  ]);
  spokes.forEach((node, i) => {
    const angle =
      ((-90 + (360 / Math.max(spokes.length, 1)) * i) * Math.PI) / 180;
    pos.set(node.key, {
      x: cx + 200 * Math.cos(angle),
      y: cy + 74 * Math.sin(angle),
    });
  });
  const edges = graph.edges.filter(
    (e) => pos.has(e.from) && pos.has(e.to),
  );
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Matched subgraph"
    >
      {edges.map((edge, i) => {
        const a = pos.get(edge.from)!;
        const b = pos.get(edge.to)!;
        const touchesHub = edge.from === hub.key || edge.to === hub.key;
        let path: string;
        let lx: number;
        let ly: number;
        if (touchesHub) {
          // Straight spoke; label pushed toward the spoke end, clear of the hub name.
          const t = edge.from === hub.key ? 0.62 : 0.38;
          path = `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
          lx = a.x + (b.x - a.x) * t;
          ly = a.y + (b.y - a.y) * t - 4;
        } else {
          // Spoke-to-spoke: bow outward so the edge (and its label) clears the hub.
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          let dx = mx - cx;
          let dy = my - cy;
          const len = Math.hypot(dx, dy);
          if (len < 12) {
            // Opposite spokes — the chord passes through the hub; bow perpendicular.
            const px = -(b.y - a.y);
            const py = b.x - a.x;
            const plen = Math.hypot(px, py) || 1;
            dx = px / plen;
            dy = py / plen;
          } else {
            dx /= len;
            dy /= len;
          }
          const ctrlX = mx + dx * 40;
          const ctrlY = my + dy * 40;
          path = `M ${a.x} ${a.y} Q ${ctrlX} ${ctrlY} ${b.x} ${b.y}`;
          // Label at the bezier midpoint.
          lx = 0.25 * a.x + 0.5 * ctrlX + 0.25 * b.x;
          ly = 0.25 * a.y + 0.5 * ctrlY + 0.25 * b.y - 4;
        }
        return (
          <g key={`${edge.from}-${edge.type}-${edge.to}-${i}`}>
            <path d={path} fill="none" stroke="#B9C6BD" strokeWidth={1.2} />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              fontSize={7.5}
              letterSpacing={0.4}
              fontFamily="var(--font-mono, ui-monospace, monospace)"
              fill="#5B6B60"
              stroke="#fff"
              strokeWidth={3}
              style={{ paintOrder: "stroke" }}
            >
              {edge.type}
            </text>
          </g>
        );
      })}
      {graph.nodes.map((node) => {
        const p = pos.get(node.key);
        if (!p) return null;
        const isHub = node.key === hub.key;
        const hex = graphLabelHex(node.label);
        // Top-half spokes get their name above the dot so vertical edge labels stay clear.
        const nameAbove = !isHub && p.y < cy - 8;
        return (
          <g
            key={node.key}
            className={node.href ? "cursor-pointer" : undefined}
            onClick={node.href ? () => router.push(node.href!) : undefined}
          >
            <title>
              {`${node.label} · ${node.name}${node.href ? " — open in pot graph" : ""}`}
            </title>
            {isHub && <circle cx={p.x} cy={p.y} r={15} fill={hex} opacity={0.15} />}
            <circle
              cx={p.x}
              cy={p.y}
              r={isHub ? 9 : 6.5}
              fill={hex}
              stroke="#fff"
              strokeWidth={2}
            />
            <text
              x={p.x}
              y={p.y + (isHub ? 25 : nameAbove ? -12 : 19)}
              textAnchor="middle"
              fontSize={isHub ? 10 : 9}
              fontWeight={isHub ? 600 : 500}
              fill="#27272a"
              stroke="#fff"
              strokeWidth={3}
              style={{ paintOrder: "stroke" }}
            >
              {clipGraphName(node.name, isHub ? 32 : 26)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Query panel + matched subgraph + entity deep links, shown inside a Context Engine accordion. */
function GraphQueryResult({ graph }: { graph: StreamToolGraph }) {
  const linked = graph.nodes.filter((n) => n.href);
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-[#102C2C] px-3 py-2.5">
        <p className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#B6E343]/70">
          <Sparkles className="h-2.5 w-2.5" aria-hidden />
          Graph query
        </p>
        <pre className="m-0 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[#D9EDBB]">
          {graph.query}
        </pre>
      </div>
      {graph.summary && (
        <p className="m-0 text-xs leading-relaxed text-zinc-600">
          {graph.summary}
        </p>
      )}
      {graph.nodes.length > 0 && (
        <div
          className="rounded-md border border-[#2F4A3E]/10 bg-white"
          style={{
            backgroundImage:
              "radial-gradient(rgba(16,44,44,0.07) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        >
          <TraceMiniGraph graph={graph} />
        </div>
      )}
      {linked.length > 0 && (
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Open in pot graph
          </p>
          <div className="flex flex-wrap gap-1.5">
            {linked.map((node) => (
              <Link
                key={node.key}
                href={node.href!}
                className="group inline-flex min-w-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white py-0.5 pl-2 pr-1.5 transition-colors hover:border-[#2F4A3E]/40 hover:bg-[#F6F9F1]"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: graphLabelHex(node.label) }}
                  aria-hidden
                />
                <span className="max-w-[240px] truncate text-[11px] font-medium text-zinc-700 group-hover:text-[#102C2C]">
                  {node.name}
                </span>
                <ArrowUpRight
                  className="h-3 w-3 shrink-0 text-zinc-300 group-hover:text-[#2F4A3E]"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Light, subtly brand-accented card for context engine (knowledge graph) queries. */
function ContextEngineRow({
  item,
  compactToolResults,
}: {
  item: ToolItem;
  compactToolResults?: boolean;
}) {
  if (item.phase === "running") {
    return (
      <div className="relative overflow-hidden rounded-lg border border-[#2F4A3E]/20 bg-[#F6F9F1]">
        <div className="ce-shimmer absolute inset-0" aria-hidden />
        <div className="relative flex items-center gap-3 px-3 py-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#102C2C]">
            <Sparkles className="h-3.5 w-3.5 text-[#B6E343] animate-pulse" aria-hidden />
          </span>
          <span className="text-xs font-semibold text-[#102C2C] shrink-0">
            Context Engine
          </span>
          <span className="hidden sm:inline font-mono text-[10px] text-[#3E5C50]/70 truncate">
            {item.label}
          </span>
          <span className="ml-auto shrink-0 rounded bg-[#102C2C]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#102C2C]">
            Querying graph…
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-[#2F4A3E]/20 bg-[#F6F9F1] shadow-[0_1px_2px_rgba(16,44,44,0.05)]">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={item.id} className="border-none">
          <AccordionTrigger
            className={cn(
              "py-2.5 pr-3 pl-3 hover:no-underline hover:bg-[#EFF4E6]",
              "[&>svg]:text-[#2F4A3E]/50 [&[data-state=open]>svg]:rotate-180",
            )}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#102C2C]">
                <Sparkles className="h-3.5 w-3.5 text-[#B6E343]" aria-hidden />
              </span>
              <span className="text-xs font-semibold text-[#102C2C] shrink-0">
                Context Engine
              </span>
              <span className="hidden sm:inline font-mono text-[10px] text-[#3E5C50]/70 shrink-0">
                {item.label}
              </span>
              {item.result && (
                <span
                  className="text-[10px] italic text-zinc-500 truncate min-w-0"
                  title={item.result.replace(/\s+/g, " ").trim().slice(0, 200)}
                >
                  {toolResultPreview(item.result)}
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="overflow-hidden">
            <div
              className={cn(
                item.graph
                  ? "max-h-[600px]"
                  : compactToolResults
                    ? "max-h-24"
                    : "max-h-48",
                "overflow-y-auto overflow-x-hidden",
                "border-t border-[#2F4A3E]/10 bg-white/70 p-3 text-xs text-zinc-700",
                "[scrollbar-width:thin]",
              )}
            >
              {item.graph ? (
                <GraphQueryResult graph={item.graph} />
              ) : item.result ? (
                <ToolResultContent result={item.result} />
              ) : (
                <span className="text-zinc-400">No output</span>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function TimelineItemRow({
  item,
  compactToolResults,
}: {
  item: StreamTimelineItem;
  compactToolResults?: boolean;
}) {
  if (item.type === "chunk") {
    return (
      <div
        className="rounded-lg bg-[#FAF8F7] p-3 overflow-x-hidden min-w-0 text-sm text-zinc-700"
      >
        <SharedMarkdown
          content={normalizeMarkdownForPreview(item.content)}
        />
      </div>
    );
  }
  const kind = toolKind(item.label);
  if (kind === "context-engine") {
    return <ContextEngineRow item={item} compactToolResults={compactToolResults} />;
  }
  const { icon: KindIcon, iconBg, iconColor } = TOOL_KIND_STYLES[kind];
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-200/90 bg-white min-w-0 overflow-hidden",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      )}
    >
      {item.phase === "running" ? (
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Loader2
            className="h-4 w-4 shrink-0 text-amber-600 animate-spin"
            aria-hidden
          />
          <span className="font-mono text-xs font-medium text-zinc-700 truncate">
            {item.label}
          </span>
          <span className="ml-auto rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            Running
          </span>
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value={item.id} className="border-none">
            <AccordionTrigger
              className={cn(
                "py-2.5 pr-3 pl-3 hover:no-underline hover:bg-zinc-50/80",
                "[&[data-state=open]>svg]:rotate-180"
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                    iconBg,
                  )}
                >
                  <KindIcon className={cn("h-3.5 w-3.5", iconColor)} aria-hidden />
                </span>
                <span className="font-mono text-xs font-medium text-zinc-800 shrink-0">
                  {item.label}
                </span>
                {item.result && (
                  <span
                    className="text-[10px] italic text-zinc-400 truncate min-w-0"
                    title={item.result.replace(/\s+/g, " ").trim().slice(0, 200)}
                  >
                    {toolResultPreview(item.result)}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="overflow-hidden">
              <div
                className={cn(
                  compactToolResults ? "max-h-24" : "max-h-48",
                  "overflow-y-auto overflow-x-hidden",
                  "border-t border-zinc-100 bg-zinc-50/80 p-3 text-xs text-zinc-700",
                  "[scrollbar-width:thin]"
                )}
              >
                {item.result ? (
                  <ToolResultContent result={item.result} />
                ) : (
                  <span className="text-zinc-500">No output</span>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

/** Compact pill summary of the trace: graph queries, files read, commands, reasoning steps. */
export function StreamTraceStats({
  items,
  className,
}: {
  items: StreamTimelineItem[];
  className?: string;
}) {
  const stats = React.useMemo(() => {
    let ce = 0;
    let fileCalls = 0;
    let searches = 0;
    let terminal = 0;
    let reasoning = 0;
    const filePaths = new Set<string>();
    for (const item of items) {
      if (item.type === "chunk") {
        reasoning += 1;
        continue;
      }
      const kind = toolKind(item.label);
      if (kind === "context-engine") {
        ce += 1;
      } else if (kind === "file") {
        fileCalls += 1;
        // Count distinct backticked paths in results for a real "files read" number
        const matches = item.result?.match(/`([^`\n]+)`/g) ?? [];
        for (const m of matches) {
          const token = m.slice(1, -1).trim();
          if (/[./]/.test(token) && !token.includes(" ")) filePaths.add(token);
        }
      } else if (kind === "search") {
        searches += 1;
      } else if (kind === "terminal") {
        terminal += 1;
      }
    }
    return { ce, fileCalls, fileCount: filePaths.size, searches, terminal, reasoning };
  }, [items]);

  if (items.length === 0) return null;

  const lightPill =
    "inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-600";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {stats.ce > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#2F4A3E]/25 bg-[#F6F9F1] px-2 py-0.5 text-[10px] font-medium text-[#2F4A3E]">
          <Sparkles className="h-2.5 w-2.5 text-[#6FA03C]" aria-hidden />
          {stats.ce} graph {stats.ce === 1 ? "query" : "queries"}
        </span>
      )}
      {stats.searches > 0 && (
        <span className={lightPill}>
          {stats.searches} search{stats.searches === 1 ? "" : "es"}
        </span>
      )}
      {stats.fileCalls > 0 && (
        <span className={lightPill}>
          {stats.fileCount > 0
            ? `${stats.fileCount} file${stats.fileCount === 1 ? "" : "s"} read`
            : `${stats.fileCalls} file read${stats.fileCalls === 1 ? "" : "s"}`}
        </span>
      )}
      {stats.terminal > 0 && (
        <span className={lightPill}>
          {stats.terminal} command{stats.terminal === 1 ? "" : "s"}
        </span>
      )}
      {stats.reasoning > 0 && (
        <span className={lightPill}>
          {stats.reasoning} reasoning step{stats.reasoning === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}

export function StreamTimeline({
  items,
  className,
  endRef,
  loading = false,
  maxHeight = STREAM_TIMELINE_DEFAULT_MAX_HEIGHT,
  compactToolResults = false,
}: StreamTimelineProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  // Items present on first render arrived as a batch (restored/reconstructed
  // trace) — reveal them with a stagger. Later live-appended items animate in
  // individually with no delay.
  const initialCountRef = React.useRef<number | null>(null);
  if (initialCountRef.current === null) initialCountRef.current = items.length;

  const scrollToBottom = React.useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    endRef?.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [endRef]);

  React.useEffect(() => {
    const raf = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(raf);
  }, [items, loading, scrollToBottom]);

  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(scrollToBottom);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [scrollToBottom]);

  if (items.length === 0 && !loading) return null;

  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        "overflow-y-auto overflow-x-hidden space-y-2 min-w-0 bg-transparent",
        "[scrollbar-width:thin]",
        className
      )}
      style={{ maxHeight }}
      data-stream-timeline
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          className="animate-trace-in"
          style={
            index < (initialCountRef.current ?? 0)
              ? { animationDelay: `${Math.min(index * 55, 660)}ms` }
              : undefined
          }
        >
          <TimelineItemRow
            item={item}
            compactToolResults={compactToolResults}
          />
        </div>
      ))}
      {loading && <LoadingDots />}
      {endRef && <div ref={endRef} aria-hidden />}
    </div>
  );
}
