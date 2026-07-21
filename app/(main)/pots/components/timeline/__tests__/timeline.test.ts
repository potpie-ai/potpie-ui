import { describe, expect, it } from "vitest";

import {
  DEMO_KAFKA_POT_ID,
  DEMO_POTPIE_POT_ID,
  DEMO_REDIS_POT_ID,
  getDemoPotTimeline,
} from "@/lib/mock/demoPots";
import { dayKey, groupByDay } from "../format";
import { verbMeta, VERB_META } from "../ontology";

describe("getDemoPotTimeline", () => {
  it("derives a rich timeline from the potpie Activity graph", () => {
    const { items } = getDemoPotTimeline(DEMO_POTPIE_POT_ID, { window: "all" });
    expect(items.length).toBeGreaterThan(150);
    // Newest first.
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].timestamp! >= items[i].timestamp!).toBe(true);
    }
    // Enrichment comes through: actors resolved via PERFORMED/AUTHORED edges,
    // touched entities via TOUCHED edges.
    const withActor = items.filter((i) => i.actor);
    expect(withActor.length).toBeGreaterThan(50);
    expect(withActor[0]!.actor!.name).not.toContain(":");
    expect(items.some((i) => (i.touched ?? []).length > 0)).toBe(true);
  });

  it("applies the relative window like the backend endpoint", () => {
    const all = getDemoPotTimeline(DEMO_POTPIE_POT_ID, { window: "all" });
    const week = getDemoPotTimeline(DEMO_POTPIE_POT_ID, { window: "7d" });
    expect(week.items.length).toBeGreaterThan(0);
    expect(week.items.length).toBeLessThan(all.items.length);
    expect(week.window.since).not.toBeNull();
    for (const item of week.items) {
      expect(item.timestamp! >= week.window.since!).toBe(true);
    }
  });

  it("filters by verb_class when requested", () => {
    const { items } = getDemoPotTimeline(DEMO_POTPIE_POT_ID, {
      window: "all",
      verbClasses: ["pr_merged"],
    });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.verb_class === "pr_merged")).toBe(true);
  });

  it("falls back to merged PullRequest nodes for the Redis pot", () => {
    const { items } = getDemoPotTimeline(DEMO_REDIS_POT_ID, { window: "all" });
    expect(items.length).toBeGreaterThan(5);
    expect(items.every((i) => i.verb_class === "pr_merged")).toBe(true);
  });

  it("synthesizes recent activity for pots without a hand-authored graph", () => {
    const { items } = getDemoPotTimeline(DEMO_KAFKA_POT_ID, { window: "30d" });
    expect(items.length).toBeGreaterThan(4);
    expect(items[0]!.actor).not.toBeNull();
  });
});

describe("groupByDay", () => {
  it("buckets newest-first items into newest-first day groups", () => {
    const { items } = getDemoPotTimeline(DEMO_POTPIE_POT_ID, { window: "all" });
    const groups = groupByDay(items);
    expect(groups.length).toBeGreaterThan(1);
    const total = groups.reduce((s, g) => s + g.items.length, 0);
    expect(total).toBe(items.filter((i) => i.timestamp).length);
    for (const g of groups) {
      for (const item of g.items) {
        expect(dayKey(item.timestamp!)).toBe(g.day);
      }
    }
    // Group order matches item order (newest day first).
    for (let i = 1; i < groups.length; i++) {
      expect(groups[i - 1].day > groups[i].day).toBe(true);
    }
  });
});

describe("verbMeta", () => {
  it("maps every known verb to a category and humanizes unknown ones", () => {
    for (const verb of Object.keys(VERB_META)) {
      expect(verbMeta(verb).category).toBeTruthy();
    }
    expect(verbMeta("something_new").label).toBe("something new");
    expect(verbMeta(null).label).toBe("activity");
  });
});
