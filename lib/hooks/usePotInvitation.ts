import { useMutation, useQueryClient } from "@tanstack/react-query";
import PotService from "@/services/PotService";
import { POTS_QUERY_KEY } from "@/lib/hooks/usePots";

/**
 * Accept / decline the signed-in user's own pending pot invitation.
 *
 * Invitees are auto-added on invite, so the pot is already in the `["pots"]`
 * cache; both actions just change its standing, so we invalidate that list on
 * settle (accept clears the pending banner, decline drops the pot).
 */
export function usePotInvitationActions() {
  const qc = useQueryClient();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: POTS_QUERY_KEY });

  const accept = useMutation({
    mutationFn: (token: string) => PotService.acceptInvitation(token),
    onSettled: invalidate,
  });

  const decline = useMutation({
    mutationFn: (token: string) => PotService.declineInvitation(token),
    onSettled: invalidate,
  });

  return { accept, decline };
}
