import { describe, expect, it } from "vitest";

import {
  DEMO_KAFKA_POT_ID,
  DEMO_POTPIE_POT_ID,
  DEMO_REDIS_POT_ID,
  getDemoPotTimeline,
  getDemoProjectGraph,
} from "@/lib/mock/demoPots";
import type { TimelineActivity } from "@/services/PotService";
import { eventInvolves, focusTargetFor, relatedEntityKeys } from "../relations";

function graphKeys(potId: string): Set<string> {
  return new Set(getDemoProjectGraph(potId).nodes.map((n) => n.entity_key));
}

function richItem(): TimelineActivity {
  const { items } = getDemoPotTimeline(DEMO_POTPIE_POT_ID, { window: "all" });
  const item = items.find(
    (i) => i.actor && (i.touched ?? []).length > 0 && i.repo_name,
  );
  if (!item) throw new Error("expected a fully-enriched demo item");
  return item;
}

describe("relatedEntityKeys", () => {
  it("lists the activity first, then touched/mentioned entities, actor and repo", () => {
    const item = richItem();
    const keys = relatedEntityKeys(item);
    expect(keys[0]).toBe(item.activity_key);
    for (const r of item.touched ?? []) expect(keys).toContain(r.key);
    for (const r of item.mentions ?? []) expect(keys).toContain(r.key);
    expect(keys).toContain(item.actor!.key);
    expect(keys).toContain(`repository:${item.repo_name}`);
  });
});

describe("eventInvolves", () => {
  it("matches any related entity and nothing else", () => {
    const item = richItem();
    expect(eventInvolves(item, item.activity_key)).toBe(true);
    expect(eventInvolves(item, item.actor!.key)).toBe(true);
    expect(eventInvolves(item, item.touched![0]!.key)).toBe(true);
    expect(eventInvolves(item, "service:not-a-real-entity")).toBe(false);
  });
});

describe("focusTargetFor", () => {
  it("prefers the activity node and falls back by specificity", () => {
    const item = richItem();
    const touchedKey = item.touched![0]!.key;
    expect(
      focusTargetFor(item, new Set([item.activity_key, touchedKey])),
    ).toBe(item.activity_key);
    expect(focusTargetFor(item, new Set([touchedKey, item.actor!.key]))).toBe(
      touchedKey,
    );
    expect(focusTargetFor(item, new Set([item.actor!.key]))).toBe(
      item.actor!.key,
    );
    expect(focusTargetFor(item, new Set())).toBeNull();
  });

  it("resolves every potpie demo event to its own graph node", () => {
    const known = graphKeys(DEMO_POTPIE_POT_ID);
    const { items } = getDemoPotTimeline(DEMO_POTPIE_POT_ID, { window: "all" });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(focusTargetFor(item, known)).toBe(item.activity_key);
    }
  });

  it("resolves redis PR-fallback events to their pull-request nodes", () => {
    const known = graphKeys(DEMO_REDIS_POT_ID);
    const { items } = getDemoPotTimeline(DEMO_REDIS_POT_ID, { window: "all" });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(focusTargetFor(item, known)).toBe(item.activity_key);
    }
  });

  it("resolves synthesized kafka events to a related entity in the graph", () => {
    const known = graphKeys(DEMO_KAFKA_POT_ID);
    const { items } = getDemoPotTimeline(DEMO_KAFKA_POT_ID, { window: "all" });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const target = focusTargetFor(item, known);
      // The synthesized activity itself isn't a graph node, but something it
      // involves (repository, actor) always is.
      expect(target).not.toBeNull();
      expect(target).not.toBe(item.activity_key);
    }
  });
});
