// Pure date/grouping helpers for the activity timeline. No React.

import type { TimelineActivity } from "@/services/PotService";

/** Local-timezone day key (YYYY-MM-DD) used for grouping and scroll anchors. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "Mon 20 Jul", with the year appended when it isn't the current one. */
export function formatDayHeading(key: string): string {
  const d = new Date(`${key}T12:00:00`);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** "potpie-ai/potpie-ui" → "potpie-ui" — org prefixes add noise in a row. */
export function shortRepo(repo: string): string {
  const idx = repo.indexOf("/");
  return idx >= 0 ? repo.slice(idx + 1) : repo;
}

export function formatTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Compact "Jan 12 – Jul 20" range label for the loaded span. */
export function formatDateRange(firstIso: string, lastIso: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  const a = fmt(firstIso);
  const b = fmt(lastIso);
  return a === b ? a : `${a} – ${b}`;
}

export type TimelineDayGroup = {
  day: string;
  items: TimelineActivity[];
};

/** Group newest-first items into newest-first day buckets. */
export function groupByDay(items: TimelineActivity[]): TimelineDayGroup[] {
  const groups: TimelineDayGroup[] = [];
  let current: TimelineDayGroup | null = null;
  for (const item of items) {
    if (!item.timestamp) continue;
    const key = dayKey(item.timestamp);
    if (!current || current.day !== key) {
      current = { day: key, items: [] };
      groups.push(current);
    }
    current.items.push(item);
  }
  return groups;
}
