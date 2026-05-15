"use client";

// Top "pipeline" section for the events screen.
//
//   [ Queued / batched + window countdown ]  →  animated colored step
//   strip (Queued → Batched → Processing → Graph → Done)  →  a stylized
//   graph that pulses while the agent is mutating it.
//
// It is presentational + a small polling hook (`useIngestPipeline`) for the
// open-batch / window state. The live "is the agent working" signal comes
// from the counts the panel already derives off the per-pot status stream,
// so this stays in lock-step with the list without its own socket.

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Layers, Zap, Cpu, Network, CheckCircle2 } from "lucide-react";
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

const STEPS = [
  { key: "queued", label: "Queued", icon: Layers },
  { key: "batched", label: "Batched", icon: Zap },
  { key: "processing", label: "Processing", icon: Cpu },
  { key: "graph", label: "Updating graph", icon: Network },
  { key: "done", label: "Done", icon: CheckCircle2 },
] as const;

// Which steps are "lit" for a given phase (inclusive up to the active one).
const ACTIVE_INDEX: Record<Phase, number> = {
  idle: -1,
  queued: 1,
  processing: 3,
  done: 4,
};

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

  // Derive phase from the *same* number the header shows, so the step
  // strip / "Queued" label and the count can never contradict each other.
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

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-muted/40 via-background to-background">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch">
        {/* ---- Queued / batched + countdown ---- */}
        <div className="flex min-w-[180px] flex-col justify-between gap-3 sm:border-r sm:border-border/50 sm:pr-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {phase === "processing" ? "In flight" : "Batched / queued"}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <motion.span
                key={`${batchedCount}-${processingCount}`}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
                className={cn(
                  "text-3xl font-semibold tabular-nums",
                  active ? "text-blue-600" : "text-amber-600",
                )}
              >
                {active ? processingCount : batchedCount}
              </motion.span>
              <span className="text-xs text-muted-foreground">
                event{(active ? processingCount : batchedCount) === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {pipeline?.mode === "windowed" && countdown && phase === "queued" ? (
                <span>
                  flushes in{" "}
                  <span className="font-mono font-medium text-foreground">
                    {countdown}
                  </span>
                </span>
              ) : pipeline?.mode === "immediate" ? (
                <span>immediate mode</span>
              ) : active ? (
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                  agent working
                </span>
              ) : (
                <span>awaiting window</span>
              )}
            </div>
          </div>
          {phase === "queued" && batchedCount > 0 ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 px-2 text-xs"
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

        {/* ---- Animated step strip ---- */}
        <div className="flex flex-1 items-center">
          <StepStrip activeIdx={activeIdx} failed={false} />
        </div>

        {/* ---- Stylized graph pulse ---- */}
        <div className="flex items-center justify-center sm:border-l sm:border-border/50 sm:pl-4">
          <GraphPulse active={active} mutations={mutations ?? null} />
        </div>
      </div>
    </div>
  );
}

function StepStrip({
  activeIdx,
  failed,
}: {
  activeIdx: number;
  failed: boolean;
}) {
  return (
    <div className="flex w-full items-center">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const reached = i <= activeIdx;
        const isActive = i === activeIdx;
        const tone = failed && isActive
          ? "text-red-600 border-red-400/60 bg-red-500/10"
          : reached
            ? i >= 4
              ? "text-green-600 border-green-400/60 bg-green-500/10"
              : i === 3
                ? "text-violet-600 border-violet-400/60 bg-violet-500/10"
                : i === 2
                  ? "text-blue-600 border-blue-400/60 bg-blue-500/10"
                  : "text-amber-600 border-amber-400/60 bg-amber-500/10"
            : "text-muted-foreground/50 border-border/50 bg-transparent";
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <motion.div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border",
                  tone,
                )}
                animate={
                  isActive
                    ? { scale: [1, 1.12, 1] }
                    : { scale: 1 }
                }
                transition={
                  isActive
                    ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.2 }
                }
              >
                <Icon className="h-4 w-4" />
              </motion.div>
              <span
                className={cn(
                  "whitespace-nowrap text-[10px] font-medium",
                  reached ? "text-foreground" : "text-muted-foreground/50",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <div className="relative mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-border/50">
                <motion.div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full",
                    i < activeIdx ? "bg-foreground/40" : "bg-transparent",
                  )}
                  initial={false}
                  animate={{ width: i < activeIdx ? "100%" : "0%" }}
                  transition={{ duration: 0.4 }}
                />
                {i === activeIdx ? (
                  <motion.div
                    className="absolute inset-y-0 w-1/3 rounded-full bg-blue-400/70"
                    animate={{ left: ["-33%", "100%"] }}
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// Decorative force-graph-ish cluster. Nodes pulse + edges shimmer while the
// agent is mutating the graph; it sits calm otherwise. Not the real graph —
// the full graph lives on the Graph tab; this is the "something is
// happening" pulse the user asked for.
const NODES = [
  { cx: 26, cy: 24 },
  { cx: 54, cy: 14 },
  { cx: 70, cy: 36 },
  { cx: 44, cy: 40 },
  { cx: 20, cy: 52 },
  { cx: 60, cy: 58 },
  { cx: 38, cy: 64 },
];
const EDGES: [number, number][] = [
  [0, 3],
  [1, 2],
  [3, 2],
  [3, 5],
  [0, 4],
  [4, 6],
  [6, 5],
];

function GraphPulse({
  active,
  mutations,
}: {
  active: boolean;
  mutations: MutationTotals | null;
}) {
  const hasMutations = !!mutations && mutations.count > 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 90 78" className="h-[78px] w-[90px]">
        {EDGES.map(([a, b], i) => (
          <motion.line
            key={`e${i}`}
            x1={NODES[a].cx}
            y1={NODES[a].cy}
            x2={NODES[b].cx}
            y2={NODES[b].cy}
            stroke="currentColor"
            strokeWidth={1.4}
            className={active ? "text-violet-400" : "text-border"}
            initial={false}
            animate={
              active
                ? { pathLength: [0.2, 1, 0.2], opacity: [0.3, 0.9, 0.3] }
                : { pathLength: 1, opacity: 0.5 }
            }
            transition={
              active
                ? {
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.12,
                  }
                : { duration: 0.3 }
            }
          />
        ))}
        {NODES.map((n, i) => (
          <motion.circle
            key={`n${i}`}
            cx={n.cx}
            cy={n.cy}
            r={4.5}
            className={
              active
                ? i % 3 === 0
                  ? "fill-violet-500"
                  : "fill-blue-500"
                : "fill-muted-foreground/40"
            }
            initial={false}
            animate={
              active
                ? { scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }
                : { scale: 1, opacity: 0.5 }
            }
            transition={
              active
                ? {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.15,
                  }
                : { duration: 0.3 }
            }
            style={{ transformOrigin: `${n.cx}px ${n.cy}px` }}
          />
        ))}
      </svg>
      <AnimatePresence mode="wait">
        {hasMutations ? (
          <motion.div
            key="counts"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex gap-2 text-[10px] font-medium text-muted-foreground"
          >
            <span className="text-violet-600">+{mutations!.nodes} nodes</span>
            <span className="text-blue-600">+{mutations!.edges} edges</span>
          </motion.div>
        ) : (
          <span className="text-[10px] text-muted-foreground/70">
            {active ? "updating graph…" : "graph idle"}
          </span>
        )}
      </AnimatePresence>
    </div>
  );
}
