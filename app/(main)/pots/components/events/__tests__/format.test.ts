import { describe, expect, it } from "vitest";
import type { PotEvent } from "@/services/PotService";
import {
  formatDate,
  formatDuration,
  formatRelative,
  getEffectiveStatus,
  getEventTitle,
  getKindLabel,
  getProgressPercent,
  getSourceLabel,
  getStatusLabel,
  getToolLabel,
  getTotalWorkCount,
  pickThinkingLabel,
  stringifyPayload,
} from "../format";
import { THINKING_VERBS } from "../constants";

const baseEvent = (overrides: Partial<PotEvent> = {}): PotEvent => ({
  id: "row-1",
  event_id: "evt-1",
  status: "queued",
  lifecycle_status: "",
  ingestion_kind: "agent_reconciliation",
  ...overrides,
});

describe("getEventTitle", () => {
  it("prefers payload.name over payload.title and over kind", () => {
    const ev = baseEvent({ payload: { name: "ALPHA", title: "BETA" } });
    expect(getEventTitle(ev)).toBe("ALPHA");
  });

  it("falls back to payload.title when name absent", () => {
    const ev = baseEvent({ payload: { title: "BETA" } });
    expect(getEventTitle(ev)).toBe("BETA");
  });

  it("falls back to kind label when no payload title fields", () => {
    expect(getEventTitle(baseEvent({ ingestion_kind: "raw_episode" }))).toBe(
      "Raw note",
    );
  });

  it("returns raw kind when label not defined", () => {
    expect(getEventTitle(baseEvent({ ingestion_kind: "weird_kind" }))).toBe(
      "weird_kind",
    );
  });

  it("ignores empty-string names", () => {
    const ev = baseEvent({
      payload: { name: "", title: "FALLBACK" },
      ingestion_kind: "raw_episode",
    });
    expect(getEventTitle(ev)).toBe("FALLBACK");
  });

  it("ignores non-string name values (defensive)", () => {
    const ev = baseEvent({
      payload: { name: 42 as unknown as string },
      ingestion_kind: "raw_episode",
    });
    expect(getEventTitle(ev)).toBe("Raw note");
  });
});

describe("getSourceLabel", () => {
  it("prefers source_channel label when known", () => {
    expect(
      getSourceLabel(baseEvent({ source_channel: "ui_raw_ingest" })),
    ).toBe("Added from UI");
  });

  it("prefers a known source_system over an unknown source_channel", () => {
    // A known system is more meaningful to the user than an unlabelled channel.
    expect(
      getSourceLabel(
        baseEvent({ source_channel: "weird", source_system: "github" }),
      ),
    ).toBe("github");
  });

  it("falls back to the raw source_channel when nothing else is usable", () => {
    expect(
      getSourceLabel(baseEvent({ source_channel: "weird" })),
    ).toBe("weird");
  });

  it("hides the internal context_engine_raw source_system", () => {
    // When the only signal is context_engine_raw, return em-dash.
    expect(
      getSourceLabel(
        baseEvent({ source_system: "context_engine_raw" }),
      ),
    ).toBe("—");
  });

  it("returns em-dash with nothing usable", () => {
    expect(getSourceLabel(baseEvent())).toBe("—");
  });
});

describe("getStatusLabel / getKindLabel", () => {
  it("translates known statuses to user-facing labels", () => {
    expect(getStatusLabel("done")).toBe("Processed");
    expect(getStatusLabel("reconciled")).toBe("Processed");
    expect(getStatusLabel("queued")).toBe("Queued");
    expect(getStatusLabel("failed")).toBe("Error");
  });

  it("passes through unknown statuses verbatim", () => {
    expect(getStatusLabel("custom_state")).toBe("custom_state");
  });

  it("translates known ingestion kinds", () => {
    expect(getKindLabel("raw_episode")).toBe("Raw note");
    expect(getKindLabel("agent_reconciliation")).toBe("Agent ingestion");
  });
});

describe("getEffectiveStatus", () => {
  it("prefers lifecycle_status when present", () => {
    expect(
      getEffectiveStatus(
        baseEvent({ status: "processing", lifecycle_status: "done" }),
      ),
    ).toBe("done");
  });

  it("falls back to status when lifecycle_status empty", () => {
    expect(
      getEffectiveStatus(
        baseEvent({ status: "queued", lifecycle_status: "" }),
      ),
    ).toBe("queued");
  });
});

describe("getProgressPercent", () => {
  it("returns null when step_total is missing", () => {
    expect(getProgressPercent(baseEvent())).toBeNull();
  });

  it("returns null when step_total is zero", () => {
    expect(
      getProgressPercent(baseEvent({ step_total: 0, step_done: 0 })),
    ).toBeNull();
  });

  it("computes percent and rounds", () => {
    expect(
      getProgressPercent(baseEvent({ step_total: 3, step_done: 1 })),
    ).toBe(33);
  });

  it("clamps to 0..100 (defensive against bad data)", () => {
    expect(
      getProgressPercent(baseEvent({ step_total: 10, step_done: 12 })),
    ).toBe(100);
    expect(
      getProgressPercent(baseEvent({ step_total: 10, step_done: -5 })),
    ).toBe(0);
  });
});

describe("getTotalWorkCount", () => {
  it("sums work_events across runs", () => {
    const ev = baseEvent({
      reconciliation_runs: [
        {
          id: "r1",
          attempt_number: 1,
          status: "succeeded",
          work_events: [
            { id: "w1", sequence: 1, event_kind: "prompt", created_at: "" },
            { id: "w2", sequence: 2, event_kind: "tool_call", created_at: "" },
          ],
        },
        {
          id: "r2",
          attempt_number: 2,
          status: "in_progress",
          work_events: [
            { id: "w3", sequence: 1, event_kind: "prompt", created_at: "" },
          ],
        },
      ],
    });
    expect(getTotalWorkCount(ev)).toBe(3);
  });

  it("handles missing runs", () => {
    expect(getTotalWorkCount(baseEvent())).toBe(0);
  });
});

describe("getToolLabel", () => {
  it("maps a known agent tool to its friendly label", () => {
    expect(getToolLabel("context_search")).toBe("Searched the graph");
    expect(getToolLabel("apply_graph_mutations")).toBe("Updated the graph");
    expect(getToolLabel("finish_batch")).toBe("Finished the batch");
  });

  it("Title-Cases an unknown tool instead of leaking snake_case", () => {
    expect(getToolLabel("sandbox_git_blame_v2")).toBe("Sandbox Git Blame V2");
  });

  it("falls back to a generic label for empty/missing names", () => {
    expect(getToolLabel(null)).toBe("Tool call");
    expect(getToolLabel(undefined)).toBe("Tool call");
    expect(getToolLabel("")).toBe("Tool call");
  });
});

describe("pickThinkingLabel", () => {
  it("returns a verb from the curated set", () => {
    expect(THINKING_VERBS).toContain(pickThinkingLabel("r1p0"));
  });

  it("is deterministic for the same seed (no flicker as a part streams)", () => {
    expect(pickThinkingLabel("r3p2")).toBe(pickThinkingLabel("r3p2"));
  });

  it("varies across different part ids", () => {
    const labels = new Set(
      ["r1p0", "r1p1", "r2p0", "r2p1", "r3p0", "r4p0", "r5p0", "r6p0"].map(
        pickThinkingLabel,
      ),
    );
    // Not all identical — the whole point is a rotating vocabulary.
    expect(labels.size).toBeGreaterThan(1);
  });

  it("degrades to the first verb when seed is missing", () => {
    expect(pickThinkingLabel(null)).toBe(THINKING_VERBS[0]);
    expect(pickThinkingLabel(undefined)).toBe(THINKING_VERBS[0]);
  });
});

describe("formatDate", () => {
  it("returns empty string for null/undefined/invalid", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("not-a-date")).toBe("");
  });

  it("formats a valid ISO date", () => {
    // Result is locale-dependent. We just assert non-empty + contains digit.
    const out = formatDate("2026-05-15T12:30:00Z");
    expect(out).toMatch(/\d/);
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-05-15T12:00:00Z");
  const at = (s: string) => new Date(s).toISOString();

  it("returns 'just now' for very recent timestamps", () => {
    expect(
      formatRelative(at("2026-05-15T11:59:58Z"), now),
    ).toBe("just now");
  });

  it("returns seconds for sub-minute", () => {
    expect(formatRelative(at("2026-05-15T11:59:30Z"), now)).toBe("30s ago");
  });

  it("returns minutes for sub-hour", () => {
    expect(formatRelative(at("2026-05-15T11:30:00Z"), now)).toBe("30m ago");
  });

  it("returns hours for sub-day", () => {
    expect(formatRelative(at("2026-05-15T07:00:00Z"), now)).toBe("5h ago");
  });

  it("returns days for sub-month", () => {
    expect(formatRelative(at("2026-05-10T12:00:00Z"), now)).toBe("5d ago");
  });

  it("falls back to absolute format past a month", () => {
    const out = formatRelative(at("2026-01-01T12:00:00Z"), now);
    // Absolute format — just non-empty.
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toMatch(/ago/);
  });

  it("returns empty for null/undefined/invalid", () => {
    expect(formatRelative(null, now)).toBe("");
    expect(formatRelative(undefined, now)).toBe("");
    expect(formatRelative("not-a-date", now)).toBe("");
  });
});

describe("formatDuration", () => {
  it("renders sub-second as ms", () => {
    expect(formatDuration(250)).toBe("250ms");
  });
  it("renders sub-minute as decimal seconds", () => {
    expect(formatDuration(2500)).toBe("2.5s");
  });
  it("renders minutes + seconds", () => {
    expect(formatDuration(125_000)).toBe("2m 5s");
  });
});

describe("stringifyPayload", () => {
  it("returns empty string for null/undefined", () => {
    expect(stringifyPayload(null)).toBe("");
    expect(stringifyPayload(undefined)).toBe("");
  });
  it("pretty-prints objects", () => {
    expect(stringifyPayload({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
  it("falls back gracefully on circular refs", () => {
    const a: Record<string, unknown> = { b: 1 };
    a.self = a;
    // Should not throw.
    expect(stringifyPayload(a)).toBeTypeOf("string");
  });
});
