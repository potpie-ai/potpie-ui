// Data layer for the activity timeline. A plain useQuery (not infinite): the
// backend returns a single recency-ranked window capped at TIMELINE_LIMIT,
// which is the right shape for a "what changed recently" view.

import { useQuery } from "@tanstack/react-query";
import PotService, { type PotActivityTimeline } from "@/services/PotService";

export type TimelineFilters = {
  service: string; // single service name; "" = whole pot
  window: string; // one of constants.WINDOW_OPTIONS values
  verbClasses: string[]; // selected kinds; [] = all kinds
};

export const TIMELINE_LIMIT = 50;

export const timelineKeys = {
  all: ["pot-timeline"] as const,
  list: (potId: string, filters: TimelineFilters) =>
    ["pot-timeline", "list", potId, filters] as const,
};

export function useActivityTimeline(potId: string, filters: TimelineFilters) {
  return useQuery<PotActivityTimeline, Error>({
    queryKey: timelineKeys.list(potId, filters),
    queryFn: () =>
      PotService.getActivityTimeline(potId, {
        service: filters.service.trim() ? [filters.service.trim()] : undefined,
        window: filters.window,
        verb_class: filters.verbClasses.length ? filters.verbClasses : undefined,
        limit: TIMELINE_LIMIT,
      }),
    enabled: !!potId,
  });
}
