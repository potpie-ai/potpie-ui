import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import PotService, { type PotEvent } from "@/services/PotService";
import { defaultFilters } from "../EventFilters";
import {
  flattenPages,
  useBatchRetryEvents,
  useEventsList,
  useRetryEvent,
} from "../useEventsQuery";

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const ev = (id: string, overrides: Partial<PotEvent> = {}): PotEvent => ({
  id,
  event_id: id,
  status: "queued",
  lifecycle_status: "queued",
  ingestion_kind: "agent_reconciliation",
  ...overrides,
});

describe("useEventsList", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes filters through to PotService.listEvents", async () => {
    const spy = vi
      .spyOn(PotService, "listEvents")
      .mockResolvedValue({ items: [ev("a")], next_cursor: null });

    const { result } = renderHook(
      () =>
        useEventsList("pot1", {
          ...defaultFilters(),
          status: "queued",
          source: "github",
          fromDate: "2026-05-01T00:00",
        }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledTimes(1);
    const [potId, opts] = spy.mock.calls[0];
    expect(potId).toBe("pot1");
    expect(opts).toBeDefined();
    expect(opts!.status).toEqual(["queued"]);
    expect(opts!.source_system).toEqual(["github"]);
    expect(opts!.from_date).toBe("2026-05-01T00:00");
  });

  it("does NOT pass source_system when synthetic ui_raw_ingest is selected", async () => {
    // The backend doesn't know about ui_raw_ingest as a source_system,
    // so the hook must instead filter client-side.
    const spy = vi.spyOn(PotService, "listEvents").mockResolvedValue({
      items: [
        ev("a", { source_channel: "ui_raw_ingest" }),
        ev("b", { source_channel: "github" }),
      ],
      next_cursor: null,
    });

    const { result } = renderHook(
      () =>
        useEventsList("pot1", {
          ...defaultFilters(),
          source: "ui_raw_ingest",
        }),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy.mock.calls[0][1]?.source_system).toBeUndefined();
    // And the page is filtered down on the client.
    expect(flattenPages(result.current.data)).toHaveLength(1);
    expect(flattenPages(result.current.data)[0].id).toBe("a");
  });

  it("flattens multiple pages in order", async () => {
    const pages = [
      { items: [ev("a"), ev("b")], next_cursor: "p2" },
      { items: [ev("c")], next_cursor: null },
    ];
    const spy = vi
      .spyOn(PotService, "listEvents")
      .mockImplementation(async (_id, opts) => {
        return opts?.cursor === "p2" ? pages[1] : pages[0];
      });

    const { result } = renderHook(
      () => useEventsList("pot1", defaultFilters()),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(flattenPages(result.current.data).map((e) => e.id)).toEqual(["a", "b"]);
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();
    await waitFor(() =>
      expect(flattenPages(result.current.data).map((e) => e.id)).toEqual([
        "a",
        "b",
        "c",
      ]),
    );
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("surfaces server errors via isError", async () => {
    vi.spyOn(PotService, "listEvents").mockRejectedValue(new Error("boom"));
    const { result } = renderHook(
      () => useEventsList("pot1", defaultFilters()),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("boom");
  });
});

describe("useRetryEvent", () => {
  it("invalidates list queries on success", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    vi.spyOn(PotService, "retryEvent").mockResolvedValue({
      status: "queued",
      event_id: "abc",
      batch_id: "batch-1",
    });

    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useRetryEvent("pot1"), {
      wrapper: Wrapper,
    });
    await result.current.mutateAsync("abc");
    expect(invalidateSpy).toHaveBeenCalled();
    // The invalidation must target the list keys for this pot.
    const targeted = invalidateSpy.mock.calls.some((call) => {
      const key = (call[0] as { queryKey?: unknown[] })?.queryKey;
      return Array.isArray(key) && key.includes("pot-events") && key.includes("list");
    });
    const pipelineTargeted = invalidateSpy.mock.calls.some((call) => {
      const key = (call[0] as { queryKey?: unknown[] })?.queryKey;
      return Array.isArray(key) && key.includes("pot-ingest-pipeline");
    });
    expect(targeted).toBe(true);
    expect(pipelineTargeted).toBe(true);
  });
});

describe("useBatchRetryEvents", () => {
  it("calls PotService.batchRetryEvents and invalidates list", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const spy = vi.spyOn(PotService, "batchRetryEvents").mockResolvedValue({
      status: "queued",
      pot_id: "pot1",
      batch_id: "b1",
      event_ids: ["a", "b"],
      count: 2,
    });
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useBatchRetryEvents("pot1"), {
      wrapper: Wrapper,
    });
    const res = await result.current.mutateAsync(["a", "b"]);
    expect(spy).toHaveBeenCalledWith("pot1", ["a", "b"]);
    expect(res.count).toBe(2);
    // Must invalidate the list for this pot.
    const targeted = invalidateSpy.mock.calls.some((call) => {
      const key = (call[0] as { queryKey?: unknown[] })?.queryKey;
      return Array.isArray(key) && key.includes("pot-events") && key.includes("list");
    });
    const pipelineTargeted = invalidateSpy.mock.calls.some((call) => {
      const key = (call[0] as { queryKey?: unknown[] })?.queryKey;
      return Array.isArray(key) && key.includes("pot-ingest-pipeline");
    });
    expect(targeted).toBe(true);
    expect(pipelineTargeted).toBe(true);
  });

  it("surfaces server errors", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    vi.spyOn(PotService, "batchRetryEvents").mockRejectedValue(
      new Error("server down"),
    );
    const { result } = renderHook(() => useBatchRetryEvents("pot1"), {
      wrapper: Wrapper,
    });
    await expect(result.current.mutateAsync(["a"])).rejects.toThrow("server down");
  });
});

describe("flattenPages", () => {
  it("returns [] for undefined", () => {
    expect(flattenPages(undefined)).toEqual([]);
  });

  it("preserves page order", () => {
    const data = {
      pages: [
        { items: [ev("a"), ev("b")], next_cursor: "p2" },
        { items: [ev("c")], next_cursor: null },
      ],
      pageParams: [undefined, "p2"],
    };
    expect(flattenPages(data).map((e) => e.id)).toEqual(["a", "b", "c"]);
  });
});
