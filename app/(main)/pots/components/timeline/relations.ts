// Pure helpers linking timeline events to graph entities. An event "involves"
// an entity when that entity is the activity node itself, anything the
// activity touched or mentioned, its actor, or the repository it happened in.
// No React.

import type { TimelineActivity } from "@/services/PotService";

/** Graph entity key for the repository an event happened in, if any. */
export function repoEntityKey(item: TimelineActivity): string | null {
  return item.repo_name ? `repository:${item.repo_name}` : null;
}

/** Every graph entity key an event involves, most specific first. */
export function relatedEntityKeys(item: TimelineActivity): string[] {
  const keys: string[] = [item.activity_key];
  for (const r of item.touched ?? []) keys.push(r.key);
  for (const r of item.mentions ?? []) keys.push(r.key);
  if (item.actor) keys.push(item.actor.key);
  const repo = repoEntityKey(item);
  if (repo) keys.push(repo);
  return keys;
}

export function eventInvolves(
  item: TimelineActivity,
  entityKey: string,
): boolean {
  return relatedEntityKeys(item).includes(entityKey);
}

/**
 * Best node to focus on the canvas for an event: the activity node itself when
 * the graph has it, otherwise the most specific related entity that does exist
 * (touched > mentioned > actor > repository). Null when the loaded graph knows
 * nothing the event involves.
 */
export function focusTargetFor(
  item: TimelineActivity,
  knownKeys: ReadonlySet<string>,
): string | null {
  for (const key of relatedEntityKeys(item)) {
    if (knownKeys.has(key)) return key;
  }
  return null;
}
