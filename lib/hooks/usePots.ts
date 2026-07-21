import { useQuery, useQueryClient } from "@tanstack/react-query";
import PotService, { Pot } from "@/services/PotService";
import { DEMO_POTS } from "@/lib/mock/demoPots";

export const POTS_QUERY_KEY = ["pots"] as const;
// Sibling cache entry recording whether the last real pots fetch failed.
// Shares the "pots" prefix so useInvalidatePots() covers it too.
const POTS_DEGRADED_KEY = ["pots", "degraded"] as const;

export function usePots() {
  const qc = useQueryClient();
  return useQuery<Pot[]>({
    queryKey: POTS_QUERY_KEY,
    // The three demo pots are prepended for every account so the list,
    // sidebar, and detail layout always have something to resolve. Mirrors
    // RecipeService.getAllRecipes: demo entries survive even if the real
    // fetch fails, so the surface never falls back to the empty state.
    queryFn: async () => {
      try {
        const real = await PotService.listPots();
        qc.setQueryData<boolean>(POTS_DEGRADED_KEY, false);
        return [...DEMO_POTS, ...real];
      } catch {
        // Keep the surface usable on the demo pots, but record the failure
        // so the index can tell "backend down" apart from "no real pots"
        // and offer a retry (see usePotsDegraded).
        qc.setQueryData<boolean>(POTS_DEGRADED_KEY, true);
        return [...DEMO_POTS];
      }
    },
    staleTime: 30_000,
    // Render the demo pots instantly on first load, before the real fetch
    // settles, so there is no loading flash and no empty state.
    placeholderData: DEMO_POTS,
  });
}

/**
 * True when the last real pots fetch failed and usePots() is serving only
 * the demo pots. Additive signal: usePots() still resolves successfully
 * (never throws), so existing consumers keep their Pot[] contract while the
 * index can surface the outage and offer a retry.
 */
export function usePotsDegraded(): boolean {
  const { data } = useQuery<boolean>({
    queryKey: POTS_DEGRADED_KEY,
    // Never fetched (enabled: false) — the value is written by the pots
    // queryFn above via setQueryData; this hook only subscribes to it.
    queryFn: () => false,
    enabled: false,
  });
  return data ?? false;
}

export function useInvalidatePots() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: POTS_QUERY_KEY });
}
