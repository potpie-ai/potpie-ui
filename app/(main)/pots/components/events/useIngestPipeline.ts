// Pipeline snapshot for the top "batched / queued" section: mode + window,
// the open (pending) batch, its event count and window deadline. Polled so
// the countdown ticks; the cadence backs off when nothing is queued.

import { useQuery } from "@tanstack/react-query";
import PotService, { type PotIngestPipeline } from "@/services/PotService";

export const ingestPipelineKey = (potId: string) =>
  ["pot-ingest-pipeline", potId] as const;

export function useIngestPipeline(
  potId: string,
  enabled: boolean = true,
  // The caller knows (from the live events list) that there's a backlog.
  // The server's open-batch row often doesn't exist yet at that moment, so
  // without this hint we'd fall to the 15s idle cadence and the
  // mode/window/countdown would visibly lag the list. Poll tightly so the
  // whole pipeline section converges with the rows within a few seconds.
  eager: boolean = false,
) {
  return useQuery<PotIngestPipeline, Error>({
    queryKey: ingestPipelineKey(potId),
    queryFn: () => PotService.getIngestPipeline(potId),
    enabled: !!potId && enabled,
    // Tight while a batch is queued OR the list shows a backlog (countdown
    // is live / about to be); relaxed only when genuinely idle.
    refetchInterval: (query) =>
      query.state.data?.open_batch || eager ? 3_000 : 15_000,
    staleTime: 1_500,
  });
}
