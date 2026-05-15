import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import PotService from "@/services/PotService";
import {
  ingestionConfigKey,
  useForceFlushPot,
  useIngestionConfig,
  useUpdateIngestionConfig,
} from "../useIngestionConfig";

function makeWrapper(client: QueryClient) {
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useIngestionConfig", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("fetches the current config", async () => {
    vi.spyOn(PotService, "getIngestionConfig").mockResolvedValue({
      pot_id: "p1",
      mode: "windowed",
      window_minutes: 5,
      min_batch_size: null,
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useIngestionConfig("p1"), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.mode).toBe("windowed");
  });
});

describe("useUpdateIngestionConfig", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("optimistically writes returned config to the cache", async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.spyOn(PotService, "updateIngestionConfig").mockResolvedValue({
      pot_id: "p1",
      mode: "immediate",
      window_minutes: 3,
      min_batch_size: null,
    });
    const { result } = renderHook(() => useUpdateIngestionConfig("p1"), {
      wrapper: makeWrapper(client),
    });
    await result.current.mutateAsync({
      mode: "immediate",
      window_minutes: 3,
    });
    // The cache for this pot should now hold the returned config.
    const cached = client.getQueryData(ingestionConfigKey("p1"));
    expect(cached).toEqual({
      pot_id: "p1",
      mode: "immediate",
      window_minutes: 3,
      min_batch_size: null,
    });
  });

  it("surfaces server errors", async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.spyOn(PotService, "updateIngestionConfig").mockRejectedValue(
      new Error("forbidden"),
    );
    const { result } = renderHook(() => useUpdateIngestionConfig("p1"), {
      wrapper: makeWrapper(client),
    });
    await expect(
      result.current.mutateAsync({ mode: "immediate", window_minutes: 5 }),
    ).rejects.toThrow("forbidden");
  });
});

describe("useForceFlushPot", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("invalidates the list query on success", async () => {
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    vi.spyOn(PotService, "forceFlushPot").mockResolvedValue({
      pot_id: "p1",
      batch_id: "b1",
      status: "queued",
    });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useForceFlushPot("p1"), {
      wrapper: makeWrapper(client),
    });
    await result.current.mutateAsync();
    const targeted = invalidate.mock.calls.some((c) => {
      const k = (c[0] as { queryKey?: unknown[] })?.queryKey;
      return (
        Array.isArray(k) && k.includes("pot-events") && k.includes("list")
      );
    });
    expect(targeted).toBe(true);
  });

  it("returns batch_id null when nothing pending (no throw)", async () => {
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    vi.spyOn(PotService, "forceFlushPot").mockResolvedValue({
      pot_id: "p1",
      batch_id: null,
      status: "no_pending_batch",
    });
    const { result } = renderHook(() => useForceFlushPot("p1"), {
      wrapper: makeWrapper(client),
    });
    const out = await result.current.mutateAsync();
    expect(out.batch_id).toBeNull();
    expect(out.status).toBe("no_pending_batch");
  });
});
