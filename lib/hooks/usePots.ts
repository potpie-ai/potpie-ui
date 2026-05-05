import { useQuery, useQueryClient } from "@tanstack/react-query";
import PotService, { Pot } from "@/services/PotService";

export const POTS_QUERY_KEY = ["pots"] as const;

export function usePots() {
  return useQuery<Pot[]>({
    queryKey: POTS_QUERY_KEY,
    queryFn: () => PotService.listPots(),
    staleTime: 30_000,
  });
}

export function useInvalidatePots() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: POTS_QUERY_KEY });
}
