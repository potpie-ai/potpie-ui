import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import EventStreamService, {
  type StreamEvent,
} from "@/services/EventStreamService";
import {
  useEventActivityStream,
  usePotStatusStream,
  type PotStatusEvent,
} from "../useEventStream";

// Build a fake stream service that lets the test push events synchronously.
type Pusher = (event: StreamEvent) => void;

function withFakeStream() {
  const pushers: Pusher[] = [];
  const aborted: AbortController[] = [];

  vi.spyOn(EventStreamService, "streamEventActivity").mockImplementation(
    async (_id, onEvent, opts) => {
      pushers.push(onEvent);
      if (opts?.signal) {
        const ctrl = new AbortController();
        opts.signal.addEventListener("abort", () => ctrl.abort());
        aborted.push(ctrl);
      }
      // Keep the promise pending until the consumer aborts.
      return new Promise<void>((resolve) => {
        if (opts?.signal) {
          opts.signal.addEventListener("abort", () => resolve());
        }
      });
    },
  );
  vi.spyOn(EventStreamService, "streamPotStatus").mockImplementation(
    async (_id, onEvent, opts) => {
      pushers.push(onEvent);
      return new Promise<void>((resolve) => {
        if (opts?.signal) {
          opts.signal.addEventListener("abort", () => resolve());
        }
      });
    },
  );

  return {
    push: (event: StreamEvent) => {
      for (const fn of pushers) fn(event);
    },
  };
}

describe("useEventActivityStream", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("appends activity entries as the server emits them", async () => {
    const stream = withFakeStream();
    const { result } = renderHook(() =>
      useEventActivityStream("evt-1", true),
    );

    await act(async () => {
      stream.push({
        stream_id: "0-1",
        type: "activity",
        kind: "plan",
        sequence: 1,
        title: "Reconcile",
      });
      stream.push({
        stream_id: "0-2",
        type: "activity",
        kind: "tool_call",
        sequence: 2,
        title: "context_search",
      });
    });
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    expect(result.current.entries[0].title).toBe("Reconcile");
    expect(result.current.entries[1].kind).toBe("tool_call");
  });

  it("dedupes events with the same stream_id (replay overlap)", async () => {
    const stream = withFakeStream();
    const { result } = renderHook(() =>
      useEventActivityStream("evt-1", true),
    );

    await act(async () => {
      stream.push({
        stream_id: "0-1",
        type: "activity",
        kind: "plan",
        sequence: 1,
      });
      // Same stream_id arrives again (e.g. reconnect re-replayed it).
      stream.push({
        stream_id: "0-1",
        type: "activity",
        kind: "plan",
        sequence: 1,
      });
    });
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
  });

  it("marks the stream as ended on type=end and surfaces the error", async () => {
    const stream = withFakeStream();
    const { result } = renderHook(() =>
      useEventActivityStream("evt-1", true),
    );

    await act(async () => {
      stream.push({
        stream_id: "0-1",
        type: "end",
        status: "failed",
        error: "boom",
      });
    });

    await waitFor(() => expect(result.current.ended).toBe(true));
    expect(result.current.error).toBe("boom");
    expect(result.current.latestStatus).toBe("failed");
  });

  it("captures status entries as a leading badge in the timeline", async () => {
    const stream = withFakeStream();
    const { result } = renderHook(() =>
      useEventActivityStream("evt-1", true),
    );

    await act(async () => {
      stream.push({
        stream_id: "0-1",
        type: "status",
        status: "processing",
        message: "batch running",
      });
    });
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    expect(result.current.entries[0].isStatus).toBe(true);
    expect(result.current.latestStatus).toBe("processing");
  });

  it("grows a coalesced part in place by part_id instead of appending", async () => {
    const stream = withFakeStream();
    const { result } = renderHook(() =>
      useEventActivityStream("evt-1", true),
    );

    await act(async () => {
      stream.push({
        stream_id: "1",
        seq: 1,
        type: "activity",
        kind: "text",
        part_id: "r1p0",
        done: false,
        body: "Look",
      });
      // Same part, later seq (server bumped it as it streamed).
      stream.push({
        stream_id: "5",
        seq: 5,
        type: "activity",
        kind: "text",
        part_id: "r1p0",
        done: false,
        body: "Looking at PR #42",
      });
      stream.push({
        stream_id: "9",
        seq: 9,
        type: "activity",
        kind: "text",
        part_id: "r1p0",
        done: true,
        body: "Looking at PR #42 — applied 3 edges.",
      });
    });

    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    const entry = result.current.entries[0];
    expect(entry.partId).toBe("r1p0");
    expect(entry.done).toBe(true);
    expect(entry.body).toBe("Looking at PR #42 — applied 3 edges.");
  });

  it("folds mutation_applied counts into running totals", async () => {
    const stream = withFakeStream();
    const { result } = renderHook(() =>
      useEventActivityStream("evt-1", true),
    );

    await act(async () => {
      stream.push({
        stream_id: "2",
        seq: 2,
        type: "activity",
        kind: "mutation_applied",
        event_id: "e1",
        payload: {
          counts: {
            entity_upserts_applied: 3,
            edge_upserts_applied: 4,
            edge_deletes_applied: 1,
            episodes_written: 2,
          },
        },
      });
      stream.push({
        stream_id: "6",
        seq: 6,
        type: "activity",
        kind: "mutation_applied",
        event_id: "e2",
        payload: { counts: { entity_upserts_applied: 1 } },
      });
    });

    await waitFor(() => expect(result.current.mutations.count).toBe(2));
    expect(result.current.mutations.nodes).toBe(4); // 3 + 1
    expect(result.current.mutations.edges).toBe(5); // (4+1) + 0
    expect(result.current.mutations.episodes).toBe(2);
  });

  it("resets accumulated state when the eventId changes", async () => {
    const stream = withFakeStream();
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useEventActivityStream(id, true),
      { initialProps: { id: "evt-1" } },
    );
    await act(async () => {
      stream.push({
        stream_id: "0-1",
        type: "activity",
        kind: "plan",
        sequence: 1,
      });
    });
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    rerender({ id: "evt-2" });
    await waitFor(() => expect(result.current.entries).toHaveLength(0));
    expect(result.current.ended).toBe(false);
  });

  it("does not subscribe when disabled", async () => {
    const spy = vi.spyOn(EventStreamService, "streamEventActivity");
    renderHook(() => useEventActivityStream("evt-1", false));
    // Microtask flush
    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("usePotStatusStream", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("forwards each status delta to the handler", async () => {
    const stream = withFakeStream();
    const seen: PotStatusEvent[] = [];
    const handler = (e: PotStatusEvent) => seen.push(e);
    renderHook(() => usePotStatusStream("pot-1", true, handler));

    await act(async () => {
      stream.push({
        stream_id: "0-1",
        type: "status",
        event_id: "e1",
        status: "processing",
        message: "go",
      });
      stream.push({
        stream_id: "0-2",
        type: "status",
        event_id: "e2",
        status: "done",
      });
    });

    await waitFor(() => expect(seen.length).toBe(2));
    expect(seen[0]).toEqual({
      eventId: "e1",
      status: "processing",
      message: "go",
      streamId: "0-1",
    });
    expect(seen[1].status).toBe("done");
  });

  it("ignores entries without event_id or status (defensive)", async () => {
    const stream = withFakeStream();
    const seen: PotStatusEvent[] = [];
    renderHook(() => usePotStatusStream("pot-1", true, (e) => seen.push(e)));

    await act(async () => {
      stream.push({ stream_id: "0-1", type: "status" });
      stream.push({
        stream_id: "0-2",
        type: "status",
        event_id: "e1",
        // no status — ignore.
      });
    });
    expect(seen).toEqual([]);
  });

  it("uses the latest handler without re-subscribing on every render", async () => {
    const spy = vi.spyOn(EventStreamService, "streamPotStatus");
    spy.mockImplementation(
      async (_id, _onEvent, opts) => {
        return new Promise<void>((resolve) => {
          if (opts?.signal) {
            opts.signal.addEventListener("abort", () => resolve());
          }
        });
      },
    );

    const handlerA = vi.fn();
    const handlerB = vi.fn();
    const { rerender } = renderHook(
      ({ h }: { h: (e: PotStatusEvent) => void }) =>
        usePotStatusStream("pot-1", true, h),
      { initialProps: { h: handlerA } },
    );
    rerender({ h: handlerB });

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
