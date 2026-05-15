// Tests for the live-updates module: live cache patching + the
// self-healing reconciliation triggers (unknown event, refocus, online,
// heartbeat, reconnect).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  type InfiniteData,
} from "@tanstack/react-query";
import React from "react";

import EventStreamService from "@/services/EventStreamService";
import type { PotEvent, PotEventPage } from "@/services/PotService";
import { usePotEventsLiveSync } from "../useEventsLiveSync";

const POT = "pot-1";
const LIST_KEY = ["pot-events", "list", POT];

const ev = (id: string, over: Partial<PotEvent> = {}): PotEvent => ({
  id,
  event_id: id,
  status: "queued",
  lifecycle_status: "queued",
  ingestion_kind: "agent_reconciliation",
  ...over,
});

function seededClient(items: PotEvent[]): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const data: InfiniteData<PotEventPage> = {
    pages: [{ items, next_cursor: null }],
    pageParams: [undefined],
  };
  client.setQueryData(LIST_KEY, data);
  return client;
}

function wrapperFor(client: QueryClient) {
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

// Controllable fake for the per-pot status stream. Captures the handler +
// onOpen so tests can drive deltas and the connection lifecycle.
function fakeStatusStream() {
  let onEvent: ((e: unknown) => void) | undefined;
  let onOpen: (() => void) | undefined;
  let resolveCurrent: (() => void) | undefined;
  let connects = 0;

  vi.spyOn(EventStreamService, "streamPotStatus").mockImplementation(
    async (_id, oe, opts) => {
      connects += 1;
      onEvent = oe as (e: unknown) => void;
      onOpen = opts?.onOpen;
      return new Promise<void>((resolve) => {
        resolveCurrent = resolve;
        opts?.signal?.addEventListener("abort", () => resolve());
      });
    },
  );

  return {
    open: () => act(() => onOpen?.()),
    push: (delta: Record<string, unknown>) =>
      act(() => onEvent?.({ stream_id: "s1", type: "status", ...delta })),
    drop: () => act(() => resolveCurrent?.()),
    get connects() {
      return connects;
    },
  };
}

describe("usePotEventsLiveSync", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("patches a list row in place from a status delta (no refetch)", async () => {
    const stream = fakeStatusStream();
    const client = seededClient([ev("a"), ev("b")]);
    const invalidate = vi.spyOn(client, "invalidateQueries");

    renderHook(() => usePotEventsLiveSync(POT, true), {
      wrapper: wrapperFor(client),
    });

    stream.push({ event_id: "a", status: "processing" });

    await waitFor(() => {
      const data = client.getQueryData<InfiniteData<PotEventPage>>(LIST_KEY);
      const row = data?.pages[0].items.find((e) => e.event_id === "a");
      expect(row?.status).toBe("processing");
      expect(row?.lifecycle_status).toBe("processing");
    });
    // A known-row patch must NOT trigger a server refetch.
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("debounced-reconciles when a delta names an event not in cache", async () => {
    vi.useFakeTimers();
    const stream = fakeStatusStream();
    const client = seededClient([ev("a")]);
    const invalidate = vi.spyOn(client, "invalidateQueries");

    renderHook(() => usePotEventsLiveSync(POT, true), {
      wrapper: wrapperFor(client),
    });

    // Burst of deltas for unknown events → coalesced into one reconcile.
    stream.push({ event_id: "new-1", status: "queued" });
    stream.push({ event_id: "new-2", status: "queued" });
    expect(invalidate).not.toHaveBeenCalled(); // still within debounce

    await act(async () => {
      vi.advanceTimersByTime(1_600);
    });

    const listInvalidations = invalidate.mock.calls.filter((c) => {
      const k = (c[0] as { queryKey?: unknown[] })?.queryKey;
      return Array.isArray(k) && k.includes("list");
    });
    expect(listInvalidations.length).toBe(1);
  });

  it("reconciles on a stream reconnect (lossy-gap recovery)", async () => {
    vi.useFakeTimers();
    const stream = fakeStatusStream();
    const client = seededClient([ev("a")]);
    const invalidate = vi.spyOn(client, "invalidateQueries");

    renderHook(() => usePotEventsLiveSync(POT, true), {
      wrapper: wrapperFor(client),
    });

    // First connect — initial, not a reconnect → no reconcile.
    await act(async () => {
      await Promise.resolve();
    });
    stream.open();
    expect(invalidate).not.toHaveBeenCalled();

    // Stream drops, hook backs off (500ms) then resubscribes & reopens.
    stream.drop();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(stream.connects).toBeGreaterThanOrEqual(2);
    stream.open(); // second open → isReconnect → reconcile

    expect(invalidate).toHaveBeenCalled();
  });

  it("reconciles when the tab becomes visible again", async () => {
    const stream = fakeStatusStream();
    void stream;
    const client = seededClient([ev("a", { status: "processing" })]);
    const invalidate = vi.spyOn(client, "invalidateQueries");

    renderHook(() => usePotEventsLiveSync(POT, true), {
      wrapper: wrapperFor(client),
    });

    invalidate.mockClear();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(invalidate).toHaveBeenCalled();
  });

  it("reconciles when the network comes back online", async () => {
    const stream = fakeStatusStream();
    void stream;
    const client = seededClient([ev("a")]);
    const invalidate = vi.spyOn(client, "invalidateQueries");

    renderHook(() => usePotEventsLiveSync(POT, true), {
      wrapper: wrapperFor(client),
    });

    invalidate.mockClear();
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    expect(invalidate).toHaveBeenCalled();
  });

  it("does not subscribe or reconcile when disabled", async () => {
    const spy = vi.spyOn(EventStreamService, "streamPotStatus");
    const client = seededClient([ev("a")]);
    const invalidate = vi.spyOn(client, "invalidateQueries");

    renderHook(() => usePotEventsLiveSync(POT, false), {
      wrapper: wrapperFor(client),
    });
    await Promise.resolve();

    expect(spy).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });
});
