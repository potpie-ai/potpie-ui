import { describe, expect, it } from "vitest";

import {
  DEMO_POTPIE_POT_ID,
  DEMO_REDIS_POT_ID,
  getDemoEvent,
  getDemoEventPage,
} from "@/lib/mock/demoPots";

describe("demo event fixtures (smoke)", () => {
  const { items } = getDemoEventPage(DEMO_POTPIE_POT_ID);

  it("has all 24 potpie events, newest first", () => {
    expect(items.length).toBe(24);
    const times = items.map((e) => new Date(e.received_at!).getTime());
    const sorted = [...times].sort((a, b) => b - a);
    expect(times).toEqual(sorted);
  });

  it("stamps nothing in the future and orders runs after arrival", () => {
    const now = Date.now() + 1000;
    for (const ev of items) {
      const received = new Date(ev.received_at!).getTime();
      expect(received).toBeLessThanOrEqual(now);
      for (const run of ev.reconciliation_runs ?? []) {
        const started = new Date(run.started_at!).getTime();
        expect(started).toBeGreaterThan(received);
        expect(started).toBeLessThanOrEqual(now);
        let prev = started;
        for (const we of run.work_events ?? []) {
          const at = new Date(we.created_at).getTime();
          expect(at).toBeGreaterThanOrEqual(prev);
          expect(at).toBeLessThanOrEqual(now);
          prev = at;
        }
        if (run.completed_at) {
          const completed = new Date(run.completed_at).getTime();
          expect(completed).toBeGreaterThanOrEqual(prev);
          expect(ev.completed_at).toBe(run.completed_at);
        }
      }
    }
  });

  it("gives every processed event agent activity and a rich payload", () => {
    for (const ev of items) {
      const status = ev.lifecycle_status || ev.status;
      const p = (ev.payload ?? {}) as Record<string, unknown>;
      expect(typeof p.name).toBe("string");
      if (status === "done") {
        expect(ev.reconciliation_runs?.length ?? 0).toBeGreaterThan(0);
        expect(ev.reconciliation_runs![0].status).toBe("succeeded");
        expect(
          ev.reconciliation_runs![0].work_events!.length,
        ).toBeGreaterThanOrEqual(2);
        expect(typeof p.episode_body).toBe("string");
      }
      if (status === "processing") {
        expect(ev.reconciliation_runs?.[0]?.status).toBe("running");
        expect(ev.reconciliation_runs?.[0]?.completed_at).toBeNull();
      }
    }
  });

  it("resolves demo event ids and filters status/source/search", () => {
    const first = items[0];
    expect(getDemoEvent(first.event_id).event_id).toBe(first.event_id);

    const errors = getDemoEventPage(DEMO_POTPIE_POT_ID, {
      status: ["error"],
    }).items;
    expect(errors.length).toBe(2);
    expect(errors.every((e) => e.status === "failed")).toBe(true);

    const github = getDemoEventPage(DEMO_POTPIE_POT_ID, {
      source_system: ["github"],
    }).items;
    expect(github.length).toBeGreaterThan(0);
    expect(github.every((e) => e.source_system === "github")).toBe(true);

    const search = getDemoEventPage(DEMO_POTPIE_POT_ID, { q: "falkordb" }).items;
    expect(search.length).toBeGreaterThan(0);
  });

  it("keeps templated pots (redis) working with the generic seeds", () => {
    const redis = getDemoEventPage(DEMO_REDIS_POT_ID).items;
    expect(redis.length).toBe(7);
    const recon = redis.find((e) => e.ingestion_kind === "agent_reconciliation");
    expect(recon?.reconciliation_runs?.[0]?.status).toBe("running");
    expect(recon?.episode_steps?.length).toBe(2);
  });
});
