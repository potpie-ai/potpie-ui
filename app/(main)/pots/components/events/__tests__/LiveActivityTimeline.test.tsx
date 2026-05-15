// Behavior tests for LiveActivityTimeline: tool_call/tool_result pairing,
// running indicator, sticky-follow scroll release.

import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LiveActivityTimeline } from "../LiveActivityTimeline";
import type { ActivityEntry, ActivityStreamState } from "../useEventStream";

function entry(over: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    id: over.id ?? `id-${Math.random()}`,
    sequence: over.sequence ?? null,
    kind: over.kind ?? "activity",
    title: over.title ?? null,
    body: over.body ?? null,
    payload: over.payload ?? null,
    createdAt: over.createdAt ?? null,
    isStatus: over.isStatus,
    status: over.status,
    message: over.message ?? null,
  };
}

function state(entries: ActivityEntry[], over: Partial<ActivityStreamState> = {}): ActivityStreamState {
  return {
    entries,
    ended: over.ended ?? false,
    error: over.error ?? null,
    latestStatus: over.latestStatus ?? null,
    mutations: over.mutations ?? {
      nodes: 0,
      edges: 0,
      episodes: 0,
      count: 0,
      updatedAt: null,
    },
  };
}

describe("LiveActivityTimeline", () => {
  it("pairs a tool_call with its tool_result by tool_name", () => {
    const s = state([
      entry({
        id: "a",
        kind: "tool_call",
        sequence: 1,
        payload: { tool_name: "context_search", args: { q: "auth" } },
      }),
      entry({
        id: "b",
        kind: "tool_result",
        sequence: 2,
        payload: { tool_name: "context_search", content: "12 results" },
      }),
    ]);
    render(<LiveActivityTimeline state={s} live={false} />);
    // The tool_call row should NOT show "running" — it has a paired result.
    expect(screen.queryByText("running")).toBeNull();
    expect(screen.getByText("context_search")).toBeInTheDocument();
    // The tool_result is rolled into the call row; it should NOT render
    // as a separate "Tool result" row.
    expect(screen.queryByText("Tool result")).toBeNull();
  });

  it("renders an unpaired tool_call as 'running'", () => {
    const s = state(
      [
        entry({
          id: "a",
          kind: "tool_call",
          sequence: 1,
          payload: { tool_name: "context_search" },
        }),
      ],
      { latestStatus: "processing" },
    );
    render(<LiveActivityTimeline state={s} live={true} />);
    // The badge labelled "running" is exposed.
    expect(screen.getByText("running")).toBeInTheDocument();
  });

  it("pairs interleaved calls/results by tool_call_id (real agent shape)", () => {
    // The agent emits several tool calls in one model turn and the results
    // land afterwards interleaved: call A, call B, result B, result A. Each
    // call must pair with its OWN result by tool_call_id — positional /
    // name pairing left a finished call spinning ("event done but a tool
    // still pending"), the bug this fixes.
    const s = state(
      [
        entry({
          id: "a",
          kind: "tool_call",
          sequence: 1,
          payload: { tool_name: "context_search", tool_call_id: "call_a" },
        }),
        entry({
          id: "b",
          kind: "tool_call",
          sequence: 2,
          payload: { tool_name: "context_search", tool_call_id: "call_b" },
        }),
        entry({
          id: "r-b",
          kind: "tool_result",
          sequence: 3,
          payload: { tool_name: "context_search", tool_call_id: "call_b" },
        }),
        entry({
          id: "r-a",
          kind: "tool_result",
          sequence: 4,
          payload: { tool_name: "context_search", tool_call_id: "call_a" },
        }),
      ],
      { ended: true },
    );
    render(<LiveActivityTimeline state={s} live={false} />);
    // Both calls resolved — nothing left "running", no orphan result row.
    expect(screen.queryByText("running")).toBeNull();
    expect(screen.queryByText("Tool result")).toBeNull();
  });

  it("does not drop entries interleaved between a call and its result", () => {
    // A thinking part lands between a tool_call and its tool_result. The
    // old timeline builder skipped past everything up to the result and
    // silently dropped the thinking row (a chronology + data-loss bug).
    const s = state([
      entry({
        id: "a",
        kind: "tool_call",
        sequence: 1,
        payload: { tool_name: "context_search", tool_call_id: "c1" },
      }),
      entry({
        id: "t",
        kind: "thinking",
        sequence: 2,
        body: "deciding what to write",
      }),
      entry({
        id: "r",
        kind: "tool_result",
        sequence: 3,
        payload: { tool_name: "context_search", tool_call_id: "c1" },
      }),
    ]);
    render(<LiveActivityTimeline state={s} live={false} />);
    // The interleaved thinking row survives in its chronological slot.
    expect(screen.getByText("deciding what to write")).toBeInTheDocument();
    expect(screen.queryByText("running")).toBeNull();
  });

  it("renders an unclaimed tool_result standalone (nothing lost)", () => {
    const s = state([
      entry({
        id: "r",
        kind: "tool_result",
        sequence: 1,
        payload: { tool_name: "context_search", tool_call_id: "ghost" },
      }),
    ]);
    render(<LiveActivityTimeline state={s} live={false} />);
    expect(screen.getByText("Tool result")).toBeInTheDocument();
  });

  it("stops 'running' once the run ended (no perpetual spinner)", () => {
    // Call with no result, but the run finished — it must read as resolved
    // (no recorded result), never spin forever.
    const s = state(
      [
        entry({
          id: "a",
          kind: "tool_call",
          sequence: 1,
          payload: { tool_name: "apply_graph_mutations", tool_call_id: "x" },
        }),
      ],
      { ended: true },
    );
    render(<LiveActivityTimeline state={s} live={false} />);
    expect(screen.queryByText("running")).toBeNull();
    expect(screen.getByText("no result recorded")).toBeInTheDocument();
  });

  it("shows a friendly tool label alongside the raw tool name", () => {
    const s = state([
      entry({
        id: "a",
        kind: "tool_call",
        sequence: 1,
        payload: { tool_name: "context_search", tool_call_id: "x" },
      }),
    ]);
    render(<LiveActivityTimeline state={s} live={true} />);
    expect(screen.getByText("Searched the graph")).toBeInTheDocument();
    expect(screen.getByText("context_search")).toBeInTheDocument();
  });

  it("shows an empty waiting message when live and no entries", () => {
    const s = state([]);
    render(<LiveActivityTimeline state={s} live={true} />);
    expect(screen.getByText(/Waiting for the agent/i)).toBeInTheDocument();
  });

  it("does not render at all when not live and entries empty", () => {
    const s = state([]);
    const { container } = render(<LiveActivityTimeline state={s} live={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows an 'ended' label when the stream completed", () => {
    const s = state(
      [entry({ id: "a", kind: "plan_output", title: "Plan" })],
      { ended: true },
    );
    render(<LiveActivityTimeline state={s} live={false} />);
    expect(screen.getByText(/ended/)).toBeInTheDocument();
  });

  it("surfaces a stream error to the user (after end)", () => {
    const s = state(
      [entry({ id: "a", kind: "plan_output", title: "Plan" })],
      { ended: true, error: "stream lost" },
    );
    render(<LiveActivityTimeline state={s} live={false} />);
    expect(screen.getByText(/stream lost/)).toBeInTheDocument();
  });

  it("expand control shows call + result blocks", () => {
    const s = state([
      entry({
        id: "a",
        kind: "tool_call",
        sequence: 1,
        body: '{"q": "x"}',
        payload: { tool_name: "search", args: { q: "x" } },
      }),
      entry({
        id: "b",
        kind: "tool_result",
        sequence: 2,
        body: "RESULT_BODY",
        payload: { tool_name: "search" },
      }),
    ]);
    render(<LiveActivityTimeline state={s} live={false} />);
    fireEvent.click(screen.getByText(/Show call & result/));
    expect(screen.getByText(/Arguments/)).toBeInTheDocument();
    expect(screen.getByText(/Result/)).toBeInTheDocument();
    expect(screen.getByText("RESULT_BODY")).toBeInTheDocument();
  });

  it("running call uses 'awaiting result…' instead of a stale Result block", () => {
    const s = state([
      entry({
        id: "a",
        kind: "tool_call",
        sequence: 1,
        body: '{"q": "x"}',
        payload: { tool_name: "search" },
      }),
    ]);
    render(<LiveActivityTimeline state={s} live={true} />);
    fireEvent.click(screen.getByText(/Show call & result/));
    expect(screen.getByText(/awaiting result/i)).toBeInTheDocument();
  });
});
