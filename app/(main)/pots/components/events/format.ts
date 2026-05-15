// Pure formatting helpers for events. No React, no side effects — safe to unit test.

import type {
  PotEvent,
  PotReconciliationRun,
  PotReconciliationWorkEvent,
} from "@/services/PotService";
import {
  KIND_LABELS,
  LIFECYCLE_LABELS,
  SOURCE_LABELS,
  THINKING_VERBS,
  TOOL_LABELS,
  WORK_EVENT_LABELS,
} from "./constants";

export function getEventTitle(ev: PotEvent): string {
  if (ev.payload) {
    const p = ev.payload as Record<string, unknown>;
    if (typeof p.name === "string" && p.name) return p.name;
    if (typeof p.title === "string" && p.title) return p.title;
  }
  return KIND_LABELS[ev.ingestion_kind] ?? ev.ingestion_kind;
}

export function getSourceLabel(ev: PotEvent): string {
  if (ev.source_channel && SOURCE_LABELS[ev.source_channel]) {
    return SOURCE_LABELS[ev.source_channel];
  }
  if (ev.source_system && ev.source_system !== "context_engine_raw") {
    return ev.source_system;
  }
  // Last resort. Never expose the internal context_engine_raw source_system —
  // it's a UI-meaningless internal tag that previously leaked through.
  return ev.source_channel ?? "—";
}

export function getKindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

export function getStatusLabel(status: string): string {
  return LIFECYCLE_LABELS[status] ?? status;
}

export function getEffectiveStatus(ev: PotEvent): string {
  return ev.lifecycle_status || ev.status;
}

export function getEventIdentifier(ev: PotEvent): string | null {
  // Prefer the stable event_id; fall back to row id if absent.
  return ev.event_id || ev.id || null;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffSecs = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffSecs < 5) return "just now";
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const mins = Math.floor(diffSecs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const remSec = Math.floor(seconds % 60);
  return `${mins}m ${remSec}s`;
}

export function stringifyPayload(value: unknown): string {
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function getWorkEventTitle(event: PotReconciliationWorkEvent): string {
  return event.title || WORK_EVENT_LABELS[event.event_kind] || event.event_kind;
}

export function getRunWorkCount(run: PotReconciliationRun): number {
  return Array.isArray(run.work_events) ? run.work_events.length : 0;
}

export function getTotalWorkCount(event: PotEvent): number {
  return (event.reconciliation_runs ?? []).reduce(
    (sum, run) => sum + getRunWorkCount(run),
    0,
  );
}

// Small deterministic string hash (FNV-1a-ish). Stable across renders so a
// rotating label picked from it doesn't flicker as a row streams in.
function hashString(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Human gloss for an agent tool. Unknown tools (a newly added connector)
// degrade to a Title-Cased version of the raw name rather than raw
// snake_case, so the timeline never shows a bare `sandbox_git_blame`.
export function getToolLabel(name: string | null | undefined): string {
  if (!name) return "Tool call";
  const known = TOOL_LABELS[name];
  if (known) return known;
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// Pick a stable reasoning verb for a `thinking` part. ``seed`` should be a
// value that's constant for the lifetime of the part (its part id), so the
// label stays put while the part streams + grows in place.
export function pickThinkingLabel(seed: string | null | undefined): string {
  if (!seed) return THINKING_VERBS[0];
  return THINKING_VERBS[hashString(seed) % THINKING_VERBS.length];
}

export function getProgressPercent(event: PotEvent): number | null {
  if (event.step_total == null || event.step_total <= 0) return null;
  const done = event.step_done ?? 0;
  return Math.min(100, Math.max(0, Math.round((done / event.step_total) * 100)));
}
