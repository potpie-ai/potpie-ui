// React hooks wrapping EventStreamService for the events screen.
//
// Two hooks:
//   - useEventActivityStream: subscribes to a single event's activity feed.
//     Used by the side panel. Returns the accumulated activity timeline so
//     the panel can render as new entries land.
//   - usePotStatusStream: subscribes to a pot's status deltas. The list
//     view passes a handler that updates React Query's event detail cache
//     so row indicators stay live.
//
// Both hooks use AbortController to clean up when the consumer unmounts.

import { useCallback, useEffect, useRef, useState } from "react";
import EventStreamService, {
  type StreamEvent,
  type StreamHandler,
} from "@/services/EventStreamService";

export type ActivityEntry = {
  // Stable React key. For coalesced parts this is the part_id (so the row
  // is reused as it grows); otherwise the stream_id.
  id: string;
  // Set for coalesced model parts (text / thinking). Present → the entry is
  // grown in place across flushes instead of appended per flush.
  partId?: string | null;
  // ``false`` while a coalesced part is still streaming (render a caret).
  done?: boolean;
  sequence: number | null;
  kind: string;
  title: string | null;
  body: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string | null;
  // Status entries are folded into the same timeline as a leading badge.
  isStatus?: boolean;
  status?: string;
  message?: string | null;
};

// Running tally of graph mutations across the run — drives the "graph
// updated" card + the pipeline graph pulse without re-walking entries.
export type MutationTotals = {
  nodes: number;
  edges: number;
  episodes: number;
  count: number;
  updatedAt: string | null;
};

export type ActivityStreamState = {
  entries: ActivityEntry[];
  // True once the server has sent a terminal "end" event for this run.
  ended: boolean;
  // Set when the server's end event carries an error message or the stream errored.
  error: string | null;
  // Latest status seen (so the panel header can show it live).
  latestStatus: string | null;
  mutations: MutationTotals;
};

const INITIAL_ACTIVITY_STATE: ActivityStreamState = {
  entries: [],
  ended: false,
  error: null,
  latestStatus: null,
  mutations: { nodes: 0, edges: 0, episodes: 0, count: 0, updatedAt: null },
};

function foldMutation(
  prev: MutationTotals,
  payload: Record<string, unknown> | null,
  at: string | null,
): MutationTotals {
  const counts = (payload?.counts ?? {}) as Record<string, number>;
  const nodes = Number(counts.entity_upserts_applied ?? 0) || 0;
  const edges =
    (Number(counts.edge_upserts_applied ?? 0) || 0) +
    (Number(counts.edge_deletes_applied ?? 0) || 0);
  const episodes = Number(counts.episodes_written ?? 0) || 0;
  return {
    nodes: prev.nodes + nodes,
    edges: prev.edges + edges,
    episodes: prev.episodes + episodes,
    count: prev.count + 1,
    updatedAt: at ?? prev.updatedAt,
  };
}

/**
 * Subscribe to per-event activity while ``eventId`` and ``enabled`` hold.
 *
 * Resilience: the server idle-times-out at 120s. When the connection
 * closes for *any* reason that isn't a terminal "run finished" end event,
 * the hook reconnects after a short backoff, passing the last seen
 * ``stream_id`` as the cursor so the server resumes without re-replaying
 * already-rendered history.
 */
export function useEventActivityStream(
  eventId: string | null,
  enabled: boolean = true,
): ActivityStreamState {
  const [state, setState] = useState<ActivityStreamState>(INITIAL_ACTIVITY_STATE);
  // Track stream_ids we've already emitted so reconnects don't double-render.
  const seenIdsRef = useRef<Set<string>>(new Set());
  // Last seen stream id (most-recent server cursor). Used for reconnects.
  const lastIdRef = useRef<string | null>(null);
  // Whether the *run* ended (vs. an idle-timeout disconnect). Run-ended
  // stops reconnect loops; idle-timeout / error keeps trying.
  const runEndedRef = useRef(false);

  const onEvent: StreamHandler = useCallback((event: StreamEvent) => {
    if (!event.stream_id) return;
    setState((prev) => {
      // Cursor always advances so a reconnect resumes after this seq.
      lastIdRef.current = event.stream_id;

      if (event.type === "end") {
        // Distinguish "the run actually finished" from a transient close
        // (idle timeout / queued / error) — the latter reconnects.
        const finalStatuses = new Set(["done", "failed", "cancelled"]);
        const isTerminal =
          event.status !== undefined && finalStatuses.has(event.status);
        if (isTerminal) runEndedRef.current = true;
        return {
          ...prev,
          ended: isTerminal ? true : prev.ended,
          error:
            event.error ??
            (event.status === "failed" ? "Run failed" : prev.error),
          latestStatus: event.status ?? prev.latestStatus,
        };
      }

      if (event.type === "status") {
        if (seenIdsRef.current.has(event.stream_id)) return prev;
        seenIdsRef.current.add(event.stream_id);
        const statusEntry: ActivityEntry = {
          id: event.stream_id,
          sequence: null,
          kind: "status",
          title: event.message ?? `Status: ${event.status ?? ""}`,
          body: null,
          payload: null,
          createdAt: event.created_at ?? null,
          isStatus: true,
          status: event.status,
          message: event.message ?? null,
        };
        return {
          ...prev,
          entries: [...prev.entries, statusEntry],
          latestStatus: event.status ?? prev.latestStatus,
        };
      }

      // type === "activity"
      const partId = event.part_id ?? null;
      if (partId) {
        // Coalesced model part (text / thinking): grow the existing row in
        // place rather than appending each flush.
        const idx = prev.entries.findIndex((e) => e.partId === partId);
        const grown: ActivityEntry = {
          id: partId,
          partId,
          done: event.done ?? false,
          sequence:
            typeof event.sequence === "number" ? event.sequence : null,
          kind: event.kind ?? "text",
          title: event.title ?? null,
          body: event.body ?? null,
          payload: event.payload ?? null,
          createdAt: event.created_at ?? null,
        };
        if (idx === -1) {
          return { ...prev, entries: [...prev.entries, grown] };
        }
        const next = prev.entries.slice();
        next[idx] = grown;
        return { ...prev, entries: next };
      }

      // Discrete record (tool_call / tool_result / mutation_applied /
      // run_started / chunk_marker / event_processed). Dedupe by seq.
      if (seenIdsRef.current.has(event.stream_id)) return prev;
      seenIdsRef.current.add(event.stream_id);
      const entry: ActivityEntry = {
        id: event.stream_id,
        sequence: typeof event.sequence === "number" ? event.sequence : null,
        kind: event.kind ?? "activity",
        title: event.title ?? null,
        body: event.body ?? null,
        payload: event.payload ?? null,
        createdAt: event.created_at ?? null,
      };
      const mutations =
        event.kind === "mutation_applied"
          ? foldMutation(prev.mutations, event.payload ?? null, event.created_at ?? null)
          : prev.mutations;
      return { ...prev, entries: [...prev.entries, entry], mutations };
    });
  }, []);

  useEffect(() => {
    if (!eventId || !enabled) {
      return;
    }
    // Reset state when the subscription target changes.
    setState(INITIAL_ACTIVITY_STATE);
    seenIdsRef.current = new Set();
    lastIdRef.current = null;
    runEndedRef.current = false;

    const controller = new AbortController();
    let cancelled = false;
    let backoffMs = 500;

    const connect = async () => {
      while (!cancelled && !runEndedRef.current) {
        try {
          await EventStreamService.streamEventActivity(eventId, onEvent, {
            signal: controller.signal,
            cursor: lastIdRef.current,
            onError: () => {
              // Errors here are surfaced via reconnect; only the final
              // give-up path writes the state.
            },
          });
        } catch {
          if (cancelled) return;
          // Fall through to backoff + retry.
        }
        if (cancelled || runEndedRef.current) return;
        // Server idle-timed-out or transient error. Back off then retry.
        await new Promise((r) => setTimeout(r, backoffMs));
        // Exponential backoff capped at 10s. Successful reconnect resets
        // the backoff for the next round.
        backoffMs = Math.min(10_000, backoffMs * 2);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [eventId, enabled, onEvent]);

  return state;
}

export type PotStatusEvent = {
  eventId: string;
  status: string;
  message?: string | null;
  streamId: string;
};

// The pot status stream has no natural end: the server idle-times-out
// roughly every couple of minutes and we immediately resume. A single
// drop is therefore *expected* and not yet a problem — it only matters
// if we can't get back.
//
//   connected     — stream is open and healthy.
//   reconnecting  — the stream dropped; we're retrying (transient).
//   offline       — repeated reconnect attempts keep failing; the stream
//                   is effectively down.
export type StreamConnectionStatus = "connected" | "reconnecting" | "offline";

// Consecutive failed (re)connect attempts before a transient
// "reconnecting" is escalated to a hard "offline".
const OFFLINE_AFTER_FAILURES = 4;

export type StreamConnectionInfo = {
  status: StreamConnectionStatus;
  connected: boolean;
  // True on an open that follows a prior open — deltas may have been
  // dropped during the gap, so the consumer should reconcile.
  isReconnect: boolean;
};

export type PotStatusStreamOptions = {
  // Called on every connection-state transition. ``status`` distinguishes
  // a benign single drop ("reconnecting") from a sustained outage
  // ("offline"); ``isReconnect`` flags a re-open after a gap so the
  // consumer can reconcile possibly-dropped deltas.
  onConnectionChange?: (info: StreamConnectionInfo) => void;
};

/**
 * Subscribe to per-pot status deltas while ``potId`` and ``enabled`` hold.
 * ``onStatus`` is called for each delta — the consumer is expected to
 * update its own cache (e.g. patch React Query's events list).
 *
 * This is the low-level transport hook. For the events screen prefer the
 * higher-level ``usePotEventsLiveSync`` module, which composes this with
 * cache patching and a periodic reconciliation safety net.
 */
export function usePotStatusStream(
  potId: string | null,
  enabled: boolean,
  onStatus: (event: PotStatusEvent) => void,
  options: PotStatusStreamOptions = {},
): void {
  // Hold the latest callbacks in refs so the effect doesn't reconnect on
  // every render (parent components often inline these).
  const handlerRef = useRef(onStatus);
  const connRef = useRef(options.onConnectionChange);
  useEffect(() => {
    handlerRef.current = onStatus;
  }, [onStatus]);
  useEffect(() => {
    connRef.current = options.onConnectionChange;
  }, [options.onConnectionChange]);

  useEffect(() => {
    if (!potId || !enabled) return;
    const controller = new AbortController();
    let cancelled = false;
    let lastCursor: string | null = null;
    let backoffMs = 500;
    // Track lifecycle so a fresh connection after a drop is reported as a
    // reconnect (→ caller reconciles the possibly-stale gap), and so a
    // run of failed retries can escalate to a hard "offline".
    let everConnected = false;
    let failures = 0;
    const report = (info: StreamConnectionInfo) => {
      if (!cancelled) connRef.current?.(info);
    };

    const connect = async () => {
      while (!cancelled) {
        try {
          await EventStreamService.streamPotStatus(
            potId,
            (event) => {
              if (event.stream_id) lastCursor = event.stream_id;
              if (event.type === "status" || event.type === "end") {
                if (!event.event_id || !event.status) return;
                handlerRef.current({
                  eventId: event.event_id,
                  status: event.status,
                  message: event.message ?? null,
                  streamId: event.stream_id,
                });
              }
            },
            {
              signal: controller.signal,
              cursor: lastCursor,
              onError: () => {},
              onOpen: () => {
                const isReconnect = everConnected;
                everConnected = true;
                failures = 0;
                // Reset backoff so the next idle-timeout cycle resumes
                // fast — a quick resume is what keeps the UI green.
                backoffMs = 500;
                report({ status: "connected", connected: true, isReconnect });
              },
            },
          );
        } catch {
          if (cancelled) return;
        }
        // Loop iteration ended (idle timeout — normal — or it threw) →
        // disconnected until the next successful open. One drop is
        // transient; only a sustained run of failures is "offline".
        if (cancelled) return;
        failures += 1;
        report({
          status:
            failures >= OFFLINE_AFTER_FAILURES ? "offline" : "reconnecting",
          connected: false,
          isReconnect: false,
        });
        await new Promise((r) => setTimeout(r, backoffMs));
        backoffMs = Math.min(10_000, backoffMs * 2);
      }
    };

    void connect();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [potId, enabled]);
}
