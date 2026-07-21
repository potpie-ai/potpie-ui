"use client";

import React from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import type { PotPendingInvitation } from "@/services/PotService";
import { usePotInvitationActions } from "@/lib/hooks/usePotInvitation";

/**
 * Accept / Decline strip shown on a pot the user was invited to but has not
 * answered yet. The pot is already visible (auto-added on invite); this lets
 * them keep it (accept) or be removed (decline).
 *
 * Rendered as a quiet single-line strip with an accent hairline — designed to
 * sit inline inside a pot list row or under the pot header, never as a box.
 */
export function PotInvitationBanner({
  invitation,
  potLabel,
  className,
}: {
  invitation: PotPendingInvitation;
  potLabel: string;
  className?: string;
}) {
  const { accept, decline } = usePotInvitationActions();
  const busy = accept.isPending || decline.isPending;

  const stop = (e: React.MouseEvent) => {
    // The strip can sit inside a clickable pot row — don't navigate.
    e.preventDefault();
    e.stopPropagation();
  };

  const onAccept = (e: React.MouseEvent) => {
    stop(e);
    accept.mutate(invitation.token, {
      onSuccess: () => toast.success(`Joined ${potLabel}.`),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not accept invitation",
        ),
    });
  };

  const onDecline = (e: React.MouseEvent) => {
    stop(e);
    decline.mutate(invitation.token, {
      onSuccess: () => toast.success(`Declined invitation to ${potLabel}.`),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not decline invitation",
        ),
    });
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-l-2 border-accent bg-accent/[0.07] py-1 pl-3 pr-1",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="truncate text-[13px] text-muted-foreground">
          You&apos;re invited to{" "}
          <span className="font-medium text-foreground">{potLabel}</span> —
          accept to keep it in your list.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[13px] font-normal text-muted-foreground hover:text-foreground"
          disabled={busy}
          onClick={onDecline}
        >
          {decline.isPending ? "Declining…" : "Decline"}
        </Button>
        <Button
          size="sm"
          className="h-7 px-2.5 text-[13px]"
          disabled={busy}
          onClick={onAccept}
        >
          {accept.isPending ? "Accepting…" : "Accept"}
        </Button>
      </div>
    </div>
  );
}
