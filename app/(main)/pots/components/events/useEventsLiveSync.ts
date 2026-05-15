// Live-updates module for the events screen.
//
// One hook owns *all* freshness concerns for the events list so callers
// (PotEventsPanel) stay declarative:
//
//   1. Live path — subscribes to the per-pot status stream and patches
//      React Query's list + detail caches in place, so rows flip
//      queued→processing→done without a refetch.
//
//   2. Self-healing path — a streamed delta can be lost (Redis stream trim,
//      server restart, laptop sleep, a gap between disconnect and
//      reconnect). To never strand a stale row we reconcile against the
//      server on four triggers:
//        - reconnect:   the status stream re-opened after a drop
//        - refocus:     the tab became visible again
//        - online:      the network came back
//        - heartbeat:   a periodic refetch whose cadence adapts to activity
//                       (fast while processing, slow when idle) and pauses
//                       in a hidden tab.
//      A status delta for an event we don't have yet also schedules a
//      (debounced) reconcile so newly-ingested events surface quickly.
//
// Reconcile == invalidate the list (+ ingest pipeline) query for the pot;
// React Query refetches the active query and the server wins. Cheap, and
// it cannot strand state the way a lost delta can.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type { PotEventPage } from "@/services/PotService";
import { ACTIVE_STATUSES } from "./constants";
import { getEffectiveStatus } from "./format";
import { ingestPipelineKey } from "./useIngestPipeline";
import {
  usePotStatusStream,
  type PotStatusEvent,
  type StreamConnectionInfo,
  type StreamConnectionStatus,
} from "./useEventStream";

// Heartbeat cadence by activity tier. Idle still polls — it is the last
// line of defence when the stream is silently dead — but slowly.
const HEARTBEAT_MS = {
  processing: 10_000,
  active: 20_000,
  idle: 60_000,
} as const;

// Coalesce a burst of "unknown event" deltas into one reconcile.
const UNKNOWN_EVENT_DEBOUNCE_MS = 1_500;

// The status stream idle-times-out by design and we resume in well under
// a second. Don't surface the amber "Reconnecting…" affordance for that
// benign cycle — only show it if we're still down after this grace
// window, so a healthy connection stays a steady green.
const RECONNECT_GRACE_MS = 1_500;

type ActivityTier = keyof typeof HEARTBEAT_MS;

export type EventsLiveSyncState = {
  // Status stream connection — true while the stream is open. Kept for
  // callers that only need the boolean.
  connected: boolean;
  // Three-state health for the connection affordance:
  //   connected    → steady green "Live"
  //   reconnecting → amber, shown only after a grace window so a benign
  //                  idle-timeout reconnect doesn't flap the indicator
  //   offline      → red, sustained failure to (re)connect
  connectionStatus: StreamConnectionStatus;
  // Epoch ms of the last server reconciliation (heartbeat / trigger).
  lastSyncAt: number | null;
  // Force an immediate reconcile (e.g. wired to a manual refresh button).
  reconcileNow: () => void;
};

const LIST_KEY = (potId: string) => ["pot-events", "list", potId] as const;
const DETAIL_KEY = (eventId: string) =>
  ["pot-events", "detail", eventId] as const;

/**
 * Wire live status updates + a reconciliation safety net for ``potId``'s
 * events list. Mount once near the list (PotEventsPanel).
 */
export function usePotEventsLiveSync(
  potId: string | null,
  enabled: boolean = true,
): EventsLiveSyncState {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  // Optimistic: the stream connects in well under a second on a healthy
  // backend, so start green and let it fall to amber/red only if it
  // actually fails — avoids a yellow flash on every page load.
  const [connectionStatus, setConnectionStatus] =
    useState<StreamConnectionStatus>("connected");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  // ---- reconcile: the single "ask the server" primitive --------------
  const reconcile = useCallback(() => {
    if (!potId) return;
    qc.invalidateQueries({ queryKey: LIST_KEY(potId) });
    qc.invalidateQueries({ queryKey: ingestPipelineKey(potId) });
    setLastSyncAt(Date.now());
  }, [potId, qc]);

  // Keep a stable ref so timers/listeners don't need reconcile in deps.
  const reconcileRef = useRef(reconcile);
  useEffect(() => {
    reconcileRef.current = reconcile;
  }, [reconcile]);

  // ---- read current activity from the cache (no extra fetch) ----------
  const computeTier = useCallback((): ActivityTier => {
    if (!potId) return "idle";
    const queries = qc.getQueriesData<InfiniteData<PotEventPage>>({
      queryKey: LIST_KEY(potId),
    });
    let active = false;
    for (const [, data] of queries) {
      if (!data) continue;
      for (const page of data.pages) {
        for (const ev of page.items) {
          const st = getEffectiveStatus(ev);
          if (st === "processing") return "processing";
          if (ACTIVE_STATUSES.has(st)) active = true;
        }
      }
    }
    return active ? "active" : "idle";
  }, [potId, qc]);

  const hasEventInCache = useCallback(
    (eventId: string): boolean => {
      if (!potId) return false;
      const queries = qc.getQueriesData<InfiniteData<PotEventPage>>({
        queryKey: LIST_KEY(potId),
      });
      for (const [, data] of queries) {
        if (!data) continue;
        for (const page of data.pages) {
          for (const ev of page.items) {
            if ((ev.event_id || ev.id) === eventId) return true;
          }
        }
      }
      return false;
    },
    [potId, qc],
  );

  // ---- live path: patch caches from each status delta ----------------
  const unknownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleStatus = useCallback(
    (event: PotStatusEvent) => {
      if (!potId) return;
      let patched = false;
      qc.setQueriesData<InfiniteData<PotEventPage>>(
        { queryKey: LIST_KEY(potId) },
        (data) => {
          if (!data) return data;
          let touched = false;
          const pages = data.pages.map((page) => {
            const items = page.items.map((ev) => {
              const id = ev.event_id || ev.id;
              if (id !== event.eventId) return ev;
              patched = true;
              if (
                ev.lifecycle_status === event.status &&
                ev.status === event.status
              ) {
                return ev;
              }
              touched = true;
              return {
                ...ev,
                lifecycle_status: event.status,
                status: event.status,
                error:
                  event.status === "failed"
                    ? event.message ?? ev.error
                    : ev.error,
              };
            });
            return { ...page, items };
          });
          return touched ? { ...data, pages } : data;
        },
      );
      // Detail cache too, in case the side panel is open on this event.
      qc.setQueryData(DETAIL_KEY(event.eventId), (prev: unknown) => {
        if (!prev || typeof prev !== "object") return prev;
        return {
          ...(prev as Record<string, unknown>),
          status: event.status,
          lifecycle_status: event.status,
        };
      });

      // A delta for an event not in any loaded page → it was ingested
      // after we last fetched (or lives on an unfetched page). The cache
      // patch above can't add a row it doesn't have, so reconcile —
      // debounced, to coalesce a burst of new events into one refetch.
      if (!patched && !hasEventInCache(event.eventId)) {
        if (unknownTimerRef.current) clearTimeout(unknownTimerRef.current);
        unknownTimerRef.current = setTimeout(() => {
          unknownTimerRef.current = null;
          reconcileRef.current();
        }, UNKNOWN_EVENT_DEBOUNCE_MS);
      }
    },
    [potId, qc, hasEventInCache],
  );

  // ---- stream connection → reconcile on every reconnect --------------
  // Debounce the amber state: a single drop is almost always the server's
  // by-design idle timeout, and we resume in <1s. Only after the stream
  // stays down past the grace window do we surface "reconnecting".
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleConnection = useCallback((info: StreamConnectionInfo) => {
    setConnected(info.connected);

    if (info.connected) {
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
      setConnectionStatus("connected");
      // A reconnect means there was a gap; the cursor resume is
      // best-effort (Redis trims) so treat it as lossy and resync.
      if (info.isReconnect) reconcileRef.current();
      return;
    }

    if (info.status === "offline") {
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
      setConnectionStatus("offline");
      return;
    }

    // Transient drop. Arm the grace timer once; if we reconnect before it
    // fires (the common idle-timeout case) the indicator never leaves
    // green. If we're still down when it fires, fall back to amber.
    if (!graceTimerRef.current) {
      graceTimerRef.current = setTimeout(() => {
        graceTimerRef.current = null;
        setConnectionStatus((prev) => (prev === "offline" ? prev : "reconnecting"));
      }, RECONNECT_GRACE_MS);
    }
  }, []);

  usePotStatusStream(potId, enabled, handleStatus, {
    onConnectionChange: handleConnection,
  });

  // ---- adaptive heartbeat (pauses while the tab is hidden) -----------
  useEffect(() => {
    if (!potId || !enabled) return;
    if (typeof window === "undefined") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      if (cancelled) return;
      const hidden =
        typeof document !== "undefined" && document.visibilityState === "hidden";
      if (!hidden) reconcileRef.current();
      // Re-read activity each cycle so cadence tracks the agent: a batch
      // that starts processing tightens the loop automatically.
      const tier = hidden ? "idle" : computeTier();
      timer = setTimeout(tick, HEARTBEAT_MS[tier]);
    };
    // First reconcile is cheap insurance against a delta missed during the
    // initial-load → stream-subscribe race.
    timer = setTimeout(tick, HEARTBEAT_MS.active);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [potId, enabled, computeTier]);

  // ---- refocus / online: resync the moment we can trust again --------
  useEffect(() => {
    if (!potId || !enabled) return;
    if (typeof window === "undefined") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") reconcileRef.current();
    };
    const onOnline = () => reconcileRef.current();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [potId, enabled]);

  // Drop any pending timers on unmount / pot change.
  useEffect(() => {
    return () => {
      if (unknownTimerRef.current) clearTimeout(unknownTimerRef.current);
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    };
  }, [potId]);

  return { connected, connectionStatus, lastSyncAt, reconcileNow: reconcile };
}
