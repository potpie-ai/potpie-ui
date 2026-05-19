// Hooks for the per-pot ingestion config (mode + window) and the manual
// force-flush. Read + write live in the events screen settings panel; the
// list header reuses ``useForceFlushPot`` for the "Queued: N ⚡" CTA.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PotService, { type PotIngestionConfig } from "@/services/PotService";
import { ingestPipelineKey } from "./useIngestPipeline";

export const ingestionConfigKey = (potId: string) =>
  ["pot-ingestion-config", potId] as const;

export function useIngestionConfig(potId: string) {
  return useQuery<PotIngestionConfig, Error>({
    queryKey: ingestionConfigKey(potId),
    queryFn: () => PotService.getIngestionConfig(potId),
    enabled: !!potId,
    staleTime: 30_000,
  });
}

export function useUpdateIngestionConfig(potId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      mode: "immediate" | "windowed";
      window_minutes: number;
      min_batch_size?: number | null;
    }) => PotService.updateIngestionConfig(potId, body),
    onSuccess: (data) => {
      qc.setQueryData(ingestionConfigKey(potId), data);
    },
  });
}

export function useForceFlushPot(potId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => PotService.forceFlushPot(potId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pot-events", "list", potId] });
      qc.invalidateQueries({ queryKey: ingestPipelineKey(potId) });
    },
  });
}
