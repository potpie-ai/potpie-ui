"use client";

// The "pipeline" moment of the events console: a headline count for what's
// waiting / in flight, and a horizontal stage flow (Queued → Batched →
// Processing → Updating graph → Done) drawn as ringed icon nodes on a
// connecting hairline. While a batch is moving, the wire comes alive:
// accent comets stream along the lit segments and feed a constellation
// that grows out from behind the "Updating graph" icon — edges draw
// themselves, new nodes pop in with a ping, and the live mutation totals
// tick beneath the stage label. A failed stage would show rose. No boxes —
// the stage flow *is* the design.
//
// It is presentational + a small polling hook (`useIngestPipeline`) for the
// open-batch / window state. The live "is the agent working" signal comes
// from the counts the panel already derives off the per-pot status stream,
// so this stays in lock-step with the list without its own socket.

import { Fragment, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, Cpu, Inbox, Layers, Network, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIngestPipeline } from "./useIngestPipeline";
import type { MutationTotals } from "./useEventStream";

type Props = {
  potId: string;
  queuedCount: number;
  processingCount: number;
  mutations?: MutationTotals | null;
  onForceFlush: () => void;
  flushing: boolean;
};

type Phase = "idle" | "queued" | "processing" | "done";

const STAGES = [
  { key: "queued", label: "Queued", icon: Inbox },
  { key: "batched", label: "Batched", icon: Layers },
  { key: "processing", label: "Processing", icon: Cpu },
  { key: "graph", label: "Updating graph", icon: Network },
  { key: "done", label: "Done", icon: Check },
] as const;

// Which stages are "lit" for a given phase (inclusive up to the active one).
const ACTIVE_INDEX: Record<Phase, number> = {
  idle: -1,
  queued: 1,
  processing: 3,
  done: 4,
};

// Stage icon circles are 24px; the wire meets them at their vertical center.
const NODE = 24;
const WIRE_TOP = `${(NODE - 1) / 2}px`;

function useCountdown(deadlineIso: string | null): string | null {
  const [, force] = useState(0);
  useEffect(() => {
    if (!deadlineIso) return;
    const t = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [deadlineIso]);
  if (!deadlineIso) return null;
  const ms = new Date(deadlineIso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function IngestionPipeline({
  potId,
  queuedCount,
  processingCount,
  mutations,
  onForceFlush,
  flushing,
}: Props) {
  // Poll the snapshot tightly when the live list already shows a backlog —
  // the server's open-batch row may not exist yet, but mode/window should
  // still converge with the rows fast rather than on the 15s idle cadence.
  const { data: pipeline } = useIngestPipeline(
    potId,
    true,
    queuedCount > 0 || processingCount > 0,
  );

  // The events list is the live source of truth: it's patched in place by
  // the per-pot status stream, so it reflects an ingest the instant it
  // lands. The pipeline snapshot is only polled and routinely reports 0
  // before the open-batch row exists — so it must never *lower* the
  // headline below the rows the user can already see (the "0 events but
  // Queued" desync). It only *raises* it when the server has more queued
  // on pages not yet loaded. A plain `?? ` chain is wrong here: a real
  // snapshot 0 is a value, so it would mask the live count.
  const snapshotQueued =
    pipeline?.open_batch?.event_count ?? pipeline?.queued_event_count ?? 0;
  const liveQueued = Math.max(0, queuedCount - processingCount);
  const batchedCount = Math.max(liveQueued, snapshotQueued);

  // Derive phase from the *same* number the headline shows, so the stage
  // flow and the count can never contradict each other.
  const phase: Phase = useMemo(
    () =>
      processingCount > 0
        ? "processing"
        : batchedCount > 0
          ? "queued"
          : "idle",
    [processingCount, batchedCount],
  );

  const activeIdx = ACTIVE_INDEX[phase];
  const countdown = useCountdown(pipeline?.open_batch?.window_deadline ?? null);

  // Nothing happening and nothing queued → keep the screen calm.
  if (phase === "idle" && batchedCount === 0) return null;

  const active = phase === "processing";
  const headlineCount = active ? processingCount : batchedCount;
  // No failure signal is surfaced by the snapshot today; kept so the rose
  // treatment exists the moment a failed phase is wired in.
  const failed = false;

  return (
    <div className="border-b border-border/70 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <div className="flex items-baseline gap-2.5">
            <motion.span
              key={headlineCount}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="inline-block text-2xl font-semibold tabular-nums tracking-tight text-foreground"
            >
              {headlineCount}
            </motion.span>
            {active ? (
              <span className="text-[13px] text-muted-foreground">In flight</span>
            ) : (
              <span className="text-[13px] text-muted-foreground">
                event{headlineCount === 1 ? "" : "s"} waiting
              </span>
            )}
          </div>
          <p className="mt-1 flex items-baseline text-[13px] text-muted-foreground">
            {pipeline?.mode === "windowed" && countdown && phase === "queued" ? (
              <>
                flushes in{" "}
                <span className="ml-1 font-mono text-xs font-medium text-foreground">
                  {countdown}
                </span>
              </>
            ) : pipeline?.mode === "immediate" ? (
              "processed immediately"
            ) : active ? (
              <>
                the agent is working through this batch
                <WorkingDots />
              </>
            ) : (
              "waiting for the next window"
            )}
          </p>
        </div>

        {phase === "queued" && batchedCount > 0 ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 px-2.5 text-[13px]"
            onClick={onForceFlush}
            disabled={flushing}
          >
            <Zap
              className={cn(
                "h-3.5 w-3.5 text-amber-500",
                flushing && "animate-pulse",
              )}
            />
            Process now
          </Button>
        ) : null}
      </div>

      {/* ---- Stage flow: icon nodes on a hairline, comets along the wire,
              a constellation growing behind the graph stage ---- */}
      <div className="mt-6 overflow-x-auto">
        <div
          className={cn(
            "flex min-w-[520px] items-start transition-[padding] duration-300",
            active && "pt-6",
          )}
        >
          {STAGES.map((stage, i) => {
            const reached = i <= activeIdx;
            const isActive = i === activeIdx;
            const showConstellation =
              isActive && stage.key === "graph" && !failed;
            const Icon = stage.icon;
            return (
              <Fragment key={stage.key}>
                {i > 0 ? (
                  <div
                    aria-hidden
                    style={{ marginTop: WIRE_TOP }}
                    className="relative h-px min-w-3 flex-1 bg-border/70"
                  >
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-foreground/30"
                      initial={false}
                      animate={{ width: reached ? "100%" : "0%" }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                    />
                    {reached && !failed ? (
                      // A comet travels each lit segment — glowing accent
                      // head with a fading tail — so the wire reads as
                      // events streaming left → right into the graph.
                      <motion.div
                        className="absolute -top-[2px] flex items-center"
                        initial={false}
                        animate={{ left: ["-10%", "90%"], opacity: [0, 1, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.24,
                        }}
                      >
                        <span className="h-[3px] w-7 rounded-full bg-gradient-to-r from-transparent to-accent" />
                        <span className="-ml-px h-[5px] w-[5px] rounded-full bg-accent shadow-[0_0_6px_hsl(var(--accent)/0.9)]" />
                      </motion.div>
                    ) : null}
                  </div>
                ) : null}
                <div className="relative flex flex-col items-center gap-1.5 px-2.5">
                  {showConstellation ? (
                    // The stage icon steps aside while the agent writes: the
                    // constellation replaces it, its hub sitting exactly
                    // where the icon's center was. The spacer keeps the
                    // label aligned with the other stages.
                    <>
                      <GraphConstellation className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2" />
                      <span aria-hidden className="h-6 w-6" />
                    </>
                  ) : (
                    <div
                      className={cn(
                        "relative z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background transition-colors duration-300",
                        isActive && failed
                          ? "border-rose-500/70"
                          : isActive
                            ? "border-accent shadow-[0_0_12px_hsl(var(--accent)/0.45)]"
                            : reached
                              ? "border-foreground/30"
                              : "border-border",
                      )}
                    >
                      {isActive && !failed ? (
                        // Pulse rings breathing off the active node's rim.
                        <>
                          {[0, 0.8].map((delay) => (
                            <motion.span
                              key={delay}
                              aria-hidden
                              className="absolute inset-0 rounded-full border border-accent"
                              initial={false}
                              animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                              transition={{
                                duration: 1.6,
                                repeat: Infinity,
                                ease: "easeOut",
                                delay,
                              }}
                            />
                          ))}
                        </>
                      ) : null}
                      <Icon
                        className={cn(
                          "h-3.5 w-3.5",
                          isActive && failed
                            ? "text-rose-500"
                            : isActive
                              ? "text-foreground"
                              : reached
                                ? "text-muted-foreground"
                                : "text-muted-foreground/40",
                        )}
                      />
                    </div>
                  )}
                  <span
                    className={cn(
                      "whitespace-nowrap text-[11px] font-medium transition-colors",
                      // The constellation spreads below the wire too — give
                      // it air before the label.
                      showConstellation && "mt-4",
                      isActive && failed
                        ? "text-rose-600 dark:text-rose-400"
                        : isActive
                          ? "text-foreground"
                          : reached
                            ? "text-muted-foreground"
                            : "text-muted-foreground/50",
                    )}
                  >
                    {stage.label}
                  </span>
                  {showConstellation && mutations && mutations.count > 0 ? (
                    <motion.span
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="whitespace-nowrap font-mono text-[10px] text-muted-foreground"
                    >
                      <span className="font-medium text-foreground">
                        +{mutations.nodes}
                      </span>{" "}
                      nodes ·{" "}
                      <span className="font-medium text-foreground">
                        +{mutations.edges}
                      </span>{" "}
                      edges
                      {mutations.episodes > 0
                        ? ` · +${mutations.episodes} ep`
                        : ""}
                    </motion.span>
                  ) : null}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ bits */

// Three tiny dots breathing after the status line while the agent works.
function WorkingDots() {
  return (
    <span aria-hidden className="ml-1 inline-flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-[3px] w-[3px] rounded-full bg-muted-foreground"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </span>
  );
}

// The constellation that replaces the "Updating graph" icon while the
// agent writes.
//
// The composition is balanced in BOTH axes so it always reads as centered
// on the stage point: the hub sits exactly where the icon's center was —
// on the wire — and every other node has a point-symmetric partner on the
// opposite side of the hub, so the cluster spreads evenly above and below
// the wire. Each ~4.5s cycle four new accent nodes arrive around it —
// their edge draws itself out, the node pops in with a ping ring, holds,
// then softly fades so the next batch can land. Late in the cycle two
// edges link the newcomers across the top and bottom. Pulse rings breathe
// off the hub the whole time. Not the real graph — that lives on the
// Graph tab.
const CYCLE = 4.5;

// viewBox is 96×72; the hub sits at its center (48, 36), which the
// absolute placement (-top-6 = -24px) maps exactly onto the stage node's
// center (12px below the column top) — so svg-center = wire point, and
// the whole drawing is centered by construction.
const HUB = { cx: 48, cy: 36 };
const BASE_NODES = [
  { cx: 20, cy: 30 },
  { cx: 76, cy: 42 },
];
// [x1, y1, x2, y2] in viewBox coords.
const BASE_EDGES: Array<[number, number, number, number]> = [
  [48, 36, 20, 30],
  [48, 36, 76, 42],
];
// Each new node draws its edge from `from`, starting at cycle fraction
// `s`. Diagonal pairs mirror each other through the hub.
const NEW_NODES = [
  { cx: 30, cy: 12, from: [20, 30], s: 0.06 },
  { cx: 66, cy: 58, from: [76, 42], s: 0.22 },
  { cx: 70, cy: 14, from: [48, 36], s: 0.4 },
  { cx: 26, cy: 56, from: [48, 36], s: 0.56 },
] as const;
// Once the newcomers exist, late edges link them across top and bottom.
const LATE_EDGES = [
  { x1: 30, y1: 12, x2: 70, y2: 14, s: 0.68 },
  { x1: 26, y1: 56, x2: 66, y2: 58, s: 0.74 },
] as const;

function GraphConstellation({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 72"
      width={96}
      height={72}
      aria-hidden
      className={cn("overflow-visible", className)}
    >
      {/* Settled structure. */}
      {BASE_EDGES.map(([x1, y1, x2, y2], i) => (
        <line
          key={`be${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          className="stroke-foreground/20"
          strokeWidth={1.2}
        />
      ))}

      {/* New edges drawing themselves out, then fading with the cycle. */}
      {NEW_NODES.map((n, i) => (
        <motion.line
          key={`ne${i}`}
          x1={n.from[0]}
          y1={n.from[1]}
          x2={n.cx}
          y2={n.cy}
          className="stroke-accent"
          strokeWidth={1.4}
          strokeLinecap="round"
          initial={false}
          animate={{
            pathLength: [0, 0, 1, 1, 0],
            opacity: [0, 0, 0.85, 0.85, 0],
          }}
          transition={{
            duration: CYCLE,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, n.s, n.s + 0.09, 0.88, 1],
          }}
        />
      ))}
      {LATE_EDGES.map((e, i) => (
        <motion.line
          key={`le${i}`}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          className="stroke-accent"
          strokeWidth={1.4}
          strokeLinecap="round"
          initial={false}
          animate={{
            pathLength: [0, 0, 1, 1, 0],
            opacity: [0, 0, 0.7, 0.7, 0],
          }}
          transition={{
            duration: CYCLE,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, e.s, e.s + 0.07, 0.88, 1],
          }}
        />
      ))}

      {/* The hub — a solid accent node on the wire, throwing pulse rings. */}
      {[0, 0.9].map((delay) => (
        <motion.circle
          key={`hr${delay}`}
          cx={HUB.cx}
          cy={HUB.cy}
          fill="none"
          className="stroke-accent"
          strokeWidth={1}
          initial={false}
          animate={{ r: [5.5, 16], opacity: [0.55, 0] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeOut",
            delay,
          }}
        />
      ))}
      <circle
        cx={HUB.cx}
        cy={HUB.cy}
        r={4.5}
        className="fill-accent stroke-background"
        strokeWidth={2}
      />

      {/* Settled nodes, breathing gently. */}
      {BASE_NODES.map((n, i) => (
        <motion.circle
          key={`bn${i}`}
          cx={n.cx}
          cy={n.cy}
          r={3}
          className="fill-foreground/50"
          initial={false}
          animate={{ scale: [1, 1.18, 1] }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.7,
          }}
          style={{ transformOrigin: `${n.cx}px ${n.cy}px` }}
        />
      ))}

      {/* New nodes popping in after their edge reaches them, + ping rings. */}
      {NEW_NODES.map((n, i) => (
        <Fragment key={`nn${i}`}>
          <motion.circle
            cx={n.cx}
            cy={n.cy}
            r={3.2}
            className="fill-accent"
            initial={false}
            animate={{
              scale: [0, 0, 1.3, 1, 1, 0],
              opacity: [0, 0, 1, 1, 1, 0],
            }}
            transition={{
              duration: CYCLE,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, n.s + 0.07, n.s + 0.13, n.s + 0.18, 0.88, 1],
            }}
            style={{ transformOrigin: `${n.cx}px ${n.cy}px` }}
          />
          <motion.circle
            cx={n.cx}
            cy={n.cy}
            fill="none"
            className="stroke-accent"
            strokeWidth={1}
            initial={false}
            animate={{
              r: [3.2, 3.2, 4, 10],
              opacity: [0, 0, 0.7, 0],
            }}
            transition={{
              duration: CYCLE,
              repeat: Infinity,
              ease: "easeOut",
              times: [0, n.s + 0.1, n.s + 0.12, n.s + 0.32],
            }}
          />
        </Fragment>
      ))}
    </svg>
  );
}
