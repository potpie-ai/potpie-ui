// Data layer: React Query hooks for the events feature.
//
// The list uses useInfiniteQuery for cursor-based pagination (matches the
// backend's next_cursor contract). The detail is keyed on event_id and
// invalidated on mutations so the side panel stays fresh after retry.

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import PotService, { type PotEvent, type PotEventPage } from "@/services/PotService";
import { PAGE_SIZE } from "./constants";

export type EventsFilters = {
  status: string;
  source: string; // includes synthetic "ui_raw_ingest" channel filter
  fromDate: string;
  toDate: string;
  search: string;
};

export const eventKeys = {
  all: ["pot-events"] as const,
  list: (potId: string, filters: EventsFilters) =>
    ["pot-events", "list", potId, filters] as const,
  detail: (eventId: string) =>
    ["pot-events", "detail", eventId] as const,
};

// The "source" filter has one synthetic value (ui_raw_ingest) that filters by
// source_channel on the client because the backend filters by source_system.
function buildListOptions(filters: EventsFilters, cursor?: string) {
  return {
    limit: PAGE_SIZE,
    cursor,
    status: filters.status !== "all" ? [filters.status] : undefined,
    source_system:
      filters.source !== "all" && filters.source !== "ui_raw_ingest"
        ? [filters.source]
        : undefined,
    from_date: filters.fromDate || undefined,
    to_date: filters.toDate || undefined,
    q: filters.search.trim() || undefined,
  };
}

export function useEventsList(potId: string, filters: EventsFilters) {
  return useInfiniteQuery<
    PotEventPage,
    Error,
    InfiniteData<PotEventPage>,
    ReturnType<typeof eventKeys.list>,
    string | undefined
  >({
    queryKey: eventKeys.list(potId, filters),
    initialPageParam: undefined,
    queryFn: async ({ pageParam }) => {
      const opts = buildListOptions(filters, pageParam);
      const page = await PotService.listEvents(potId, opts);
      if (filters.source === "ui_raw_ingest") {
        return {
          items: page.items.filter((e) => e.source_channel === "ui_raw_ingest"),
          next_cursor: page.next_cursor,
        };
      }
      return page;
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: !!potId,
  });
}

export function useEventDetail(eventId: string | null) {
  return useQuery<PotEvent, Error>({
    queryKey: eventId ? eventKeys.detail(eventId) : ["pot-events", "detail", "noop"],
    queryFn: () => PotService.getEvent(eventId as string),
    enabled: !!eventId,
    // Detail is volatile while the agent is running; small stale window keeps
    // it cheap if the user closes/reopens the sheet quickly.
    staleTime: 2_000,
  });
}

// Optimistic helper: patch every loaded list page to flip ``ids`` to "queued".
// On settle (success OR error), invalidate so the server is the source of
// truth. Keeps the UI snappy without trusting the optimistic mutation.
function patchListStatus(
  qc: ReturnType<typeof useQueryClient>,
  potId: string,
  ids: ReadonlySet<string>,
  nextStatus: string,
) {
  qc.setQueriesData<InfiniteData<PotEventPage>>(
    { queryKey: ["pot-events", "list", potId] },
    (data) => {
      if (!data) return data;
      let touched = false;
      const pages = data.pages.map((page) => {
        const items = page.items.map((ev) => {
          const id = ev.event_id || ev.id;
          if (!id || !ids.has(id)) return ev;
          if (
            ev.lifecycle_status === nextStatus &&
            ev.status === nextStatus
          ) {
            return ev;
          }
          touched = true;
          return { ...ev, lifecycle_status: nextStatus, status: nextStatus };
        });
        return { ...page, items };
      });
      return touched ? { ...data, pages } : data;
    },
  );
}

export function useRetryEvent(potId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      return PotService.retryEvent(eventId);
    },
    // Optimistic: flip status to "queued" right away so the row reflects
    // the retry without waiting for the server round-trip.
    onMutate: async (eventId) => {
      patchListStatus(qc, potId, new Set([eventId]), "queued");
    },
    onSuccess: (_data, eventId) => {
      qc.removeQueries({ queryKey: eventKeys.detail(eventId) });
    },
    onSettled: () => {
      // Settle phase reconciles with the server regardless of outcome —
      // an error rolls back to whatever the server's latest snapshot is.
      qc.invalidateQueries({ queryKey: ["pot-events", "list", potId] });
    },
  });
}

export function useBatchRetryEvents(potId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventIds: string[]) => {
      return PotService.batchRetryEvents(potId, eventIds);
    },
    onMutate: async (eventIds) => {
      patchListStatus(qc, potId, new Set(eventIds), "queued");
    },
    onSuccess: (_data, eventIds) => {
      for (const eid of eventIds) {
        qc.removeQueries({ queryKey: eventKeys.detail(eid) });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["pot-events", "list", potId] });
    },
  });
}

// Flatten infinite-query pages back into a single array for rendering.
export function flattenPages(
  data: InfiniteData<PotEventPage> | undefined,
): PotEvent[] {
  if (!data) return [];
  const out: PotEvent[] = [];
  for (const page of data.pages) out.push(...page.items);
  return out;
}
